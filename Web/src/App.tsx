import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AdminDashboard } from "./components/AdminDashboard";
import { LandingHeroConverter } from "./components/LandingHeroConverter";
import { LoginPage, type UserSession } from "./components/LoginPage";
import { ManualReviewModal } from "./components/ManualReviewModal";
import { RegisterPage } from "./components/RegisterPage";
import { Toast } from "./components/Toast";
import { UploadedWorkspaceView } from "./components/UploadedWorkspaceView";
import { FirebaseSaveSuccessModal } from "./components/FirebaseSaveSuccessModal";
import { SlmPromptAssistantModal } from "./components/SlmPromptAssistantModal";
import { SlmPromptAssistantPanel } from "./components/SlmPromptAssistantPanel";
import { initialJson, recentJobs } from "./data/mockData";
import { saveDocumentToFirebase } from "./services/firebase";
import { createJsonDownload } from "./services/mockProcessingService";
import { runPaddleOcr, type OcrLanguage, type OcrLine } from "./services/ocrApi";
import { runSlmExtraction } from "./services/slmApi";
import type {
  BatchDocumentItem,
  DocumentJob,
  DocumentType,
  ExtractedField,
  JsonSchemaOutput,
  ReviewItem,
} from "./types";

function isAdminSession(session: UserSession | null) {
  return session?.role.toLowerCase().includes("admin") ?? false;
}

export function App() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem("logiai_user");
      return saved ? (JSON.parse(saved) as UserSession) : null;
    } catch {
      return null;
    }
  });

  const [batchDocuments, setBatchDocuments] = useState<BatchDocumentItem[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("th");
  const selectedType: DocumentType = "Invoice";
  const [viewMode, setViewMode] = useState<"user" | "admin">(() =>
    isAdminSession(userSession) ? "admin" : "user",
  );
  const [showPromptAssistantModal, setShowPromptAssistantModal] = useState(false);
  const [firebaseSuccessModal, setFirebaseSuccessModal] = useState<{
    isOpen: boolean;
    fileName: string;
    remainingCount: number;
    isLast: boolean;
  } | null>(null);
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);

  const [, setJobs] = useState<DocumentJob[]>(recentJobs);
  const [reviewingItem, setReviewingItem] = useState<ReviewItem | null>(null);
  const [toast, setToast] = useState("");

  const activeDoc = batchDocuments[activeDocIndex] || null;
  const hasDocument = batchDocuments.length > 0;

  const jsonOutput = activeDoc?.jsonOutput ?? initialJson;
  const fields = activeDoc?.fields ?? [];
  const reviewItems = activeDoc?.reviewItems ?? [];

  function handleLogin(session: UserSession) {
    setUserSession(session);
    setViewMode(isAdminSession(session) ? "admin" : "user");
    try {
      localStorage.setItem("logiai_user", JSON.stringify(session));
    } catch {
      // ignore storage errors
    }
    showToast(`ยินดีต้อนรับคุณ ${session.name}`);
  }

  function handleRegister(session: UserSession) {
    handleLogin(session);
    showToast(`ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ ${session.name}`);
  }

  function handleLogout() {
    setUserSession(null);
    try {
      localStorage.removeItem("logiai_user");
    } catch {
      // ignore storage errors
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  async function handleBatchFilesSelect(files: File[]) {
    if (!files || files.length === 0) return;

    const startIndex = batchDocuments.length;
    const newItems: BatchDocumentItem[] = files.map((file, i) => ({
      id: `${Date.now()}_${startIndex + i}_${file.name}`,
      file,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      previewUrl: file.type.startsWith("image/") || file.name.match(/\.(tif|tiff|png|jpg|jpeg)$/i) ? URL.createObjectURL(file) : null,
      status: "queued",
      statusLabel: "รอคิวประมวลผล",
      ocrProgress: 0,
      ocrText: "",
      ocrLines: [],
      jsonOutput: null,
      fields: [],
      confidenceScores: [],
      overallConfidence: 0,
      performance: null,
      reviewItems: [],
      startedAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    }));

    const allDocs = [...batchDocuments, ...newItems];
    setBatchDocuments(allDocs);
    if (batchDocuments.length === 0) {
      setActiveDocIndex(0);
    }
    setIsBatchProcessing(true);
    showToast(`เริ่มประมวลผลแบทช์ ${files.length} รูป (เฟส 1: OCR ทุกรูป -> เฟส 2: SLM ทีละรูป)`);

    // Add job entries
    const newJobs: DocumentJob[] = newItems.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      type: selectedType,
      status: "processing",
      statusLabel: "รอคิว OCR",
      startedAt: item.startedAt,
      result: "-",
    }));
    setJobs((prev) => [...newJobs, ...prev]);

    try {
      // ==========================================
      // PHASE 1: OCR ALL IMAGES FIRST (ตามโจทย์ผู้ใช้)
      // ==========================================
      for (let i = 0; i < allDocs.length; i++) {
        if (allDocs[i].status === "completed" || allDocs[i].status === "ocr_completed") continue;

        allDocs[i] = {
          ...allDocs[i],
          status: "ocr_processing",
          statusLabel: `กำลัง OCR รูปที่ ${i + 1}/${allDocs.length} (GPU)...`,
        };
        setBatchDocuments([...allDocs]);
        setJobs((current) =>
          current.map((job) =>
            job.id === allDocs[i].id ? { ...job, statusLabel: "กำลังประมวลผล OCR (GPU)" } : job,
          ),
        );

        try {
          const ocr = await runPaddleOcr(allDocs[i].file, ocrLanguage);
          const text = ocr.text || "PaddleOCR ไม่พบข้อความในไฟล์นี้";
          allDocs[i] = {
            ...allDocs[i],
            ocrText: text,
            spatialText: ocr.spatial_text,
            ocrLines: ocr.lines,
            status: "ocr_completed",
            statusLabel: `OCR สำเร็จ (${i + 1}/${allDocs.length})`,
          };
          setBatchDocuments([...allDocs]);
          setJobs((current) =>
            current.map((job) =>
              job.id === allDocs[i].id ? { ...job, statusLabel: "OCR สำเร็จ (รอคิว SLM)", result: "OCR Done" } : job,
            ),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "OCR Error";
          allDocs[i] = {
            ...allDocs[i],
            status: "error",
            statusLabel: "OCR ล้มเหลว",
            error: msg,
          };
          setBatchDocuments([...allDocs]);
        }
      }

      // ==========================================
      // PHASE 2: SLM EXTRACTION SEQUENTIALLY (ทีละรูป)
      // ==========================================
      for (let i = 0; i < allDocs.length; i++) {
        if (allDocs[i].status === "completed" || allDocs[i].status === "error") continue;

        // Give a clear 1.2s visual transition so the user sees OCR finished and SLM reasoning starts
        allDocs[i] = {
          ...allDocs[i],
          status: "slm_processing",
          statusLabel: `กำลังวิเคราะห์โครงสร้าง SLM (${i + 1}/${allDocs.length})...`,
        };
        setBatchDocuments([...allDocs]);
        setJobs((current) =>
          current.map((job) =>
            job.id === allDocs[i].id ? { ...job, statusLabel: "กำลังวิเคราะห์ Qwen SLM" } : job,
          ),
        );

        await new Promise((resolve) => setTimeout(resolve, 1400));
        if (allDocs[i].status === "completed" || allDocs[i].status === "error") continue;



        try {
          const slm = await runSlmExtraction({
            documentTypeHint: selectedType,
            sourceFile: allDocs[i].fileName,
            ocrText: allDocs[i].ocrText,
            ocrLines: allDocs[i].ocrLines,
            imageFile: allDocs[i].file,
          });

          allDocs[i] = {
            ...allDocs[i],
            jsonOutput: slm.jsonOutput,
            fields: slm.fields,
            confidenceScores: slm.confidenceScores,
            overallConfidence: slm.overallConfidence,
            performance: slm.performance ?? null,
            reviewItems: slm.reviewItems,
            status: "completed",
            statusLabel: `เสร็จสมบูรณ์ (${slm.performance?.accuracy_pct ?? slm.overallConfidence}%)`,
          };
          setBatchDocuments([...allDocs]);
          setJobs((current) =>
            current.map((job) =>
              job.id === allDocs[i].id
                ? {
                    ...job,
                    status: "success",
                    statusLabel: "SLM เสร็จสมบูรณ์",
                    result: `${slm.performance?.accuracy_pct ?? slm.overallConfidence}%`,
                  }
                : job,
            ),
          );

          // Keep document in active workspace memory without auto-saving to Cloud Firebase
          allDocs[i].cloudSyncStatus = "local_only";
          setBatchDocuments([...allDocs]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "SLM Error";
          allDocs[i] = {
            ...allDocs[i],
            status: "error",
            statusLabel: "SLM ล้มเหลว",
            error: msg,
          };
          setBatchDocuments([...allDocs]);
        }
      }

      showToast(`ประมวลผลแบทช์เสร็จสมบูรณ์ทั้งหมด ${allDocs.length} เอกสารแล้ว`);
    } catch (batchErr) {
      console.error("Batch processing error:", batchErr);
      showToast("เกิดข้อผิดพลาดในการประมวลผลแบทช์");
    } finally {
      setIsBatchProcessing(false);
    }
  }

  function handleSelectDocIndex(index: number) {
    if (index >= 0 && index < batchDocuments.length) {
      setActiveDocIndex(index);
    }
  }

  function handleExportAllJson() {
    const completedSchemas = batchDocuments
      .filter((d) => d.jsonOutput !== null)
      .map((d) => d.jsonOutput);

    if (completedSchemas.length === 0) {
      showToast("ยังไม่มีเอกสารที่ประมวลผล JSON เสร็จสิ้น");
      return;
    }

    const blob = new Blob([JSON.stringify(completedSchemas, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logiai_batch_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`ดาวน์โหลด JSON รวม ${completedSchemas.length} เอกสารเรียบร้อยแล้ว`);
  }

  function handleMoveOtherToCore(sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) {
    if (!activeDoc) return;
    let rawVal: unknown = "";

    if (jsonOutput.other && sourceOtherKey in jsonOutput.other) {
      rawVal = jsonOutput.other[sourceOtherKey];
    } else {
      const foundField = fields.find((f) => f.field === sourceOtherKey);
      rawVal = foundField ? foundField.value : "";
    }

    let parsedVal: string | number;
    if (targetCoreKey === "unit_price" || targetCoreKey === "total_amount") {
      const num = Number(String(rawVal).replace(/,/g, "").trim());
      parsedVal = Number.isNaN(num) ? 0 : num;
    } else {
      parsedVal = String(rawVal);
    }

    const nextOther = { ...(jsonOutput.other || {}) };
    if (removeFromOther) {
      delete nextOther[sourceOtherKey];
    }
    const nextJson: JsonSchemaOutput = {
      ...jsonOutput,
      [targetCoreKey]: parsedVal,
      other: nextOther,
    };

    let nextFields = fields;
    if (removeFromOther) {
      nextFields = nextFields.filter((f) => f.field !== sourceOtherKey);
    }
    const existingTargetIdx = nextFields.findIndex((f) => f.field === targetCoreKey);
    if (existingTargetIdx >= 0) {
      nextFields = nextFields.map((f, idx) =>
        idx === existingTargetIdx
          ? { ...f, value: String(parsedVal), confidence: 100, status: "success", isOther: false }
          : f,
      );
    } else {
      nextFields = [
        ...nextFields,
        {
          id: nextFields.length + 1,
          sourceText: String(rawVal),
          field: targetCoreKey,
          value: String(parsedVal),
          confidence: 100,
          status: "success",
          isOther: false,
        },
      ];
    }

    setBatchDocuments((prev) =>
      prev.map((doc, idx) =>
        idx === activeDocIndex ? { ...doc, jsonOutput: nextJson, fields: nextFields } : doc,
      ),
    );
    showToast(`ย้ายค่า "${sourceOtherKey}" ไปยัง 11 ฟิลด์หลัก "${targetCoreKey}" เรียบร้อยแล้ว`);
  }

  function handleUpdateLocalJson(updatedJson: JsonSchemaOutput) {
    if (!activeDoc) return;
    const otherObj = updatedJson.other || {};
    const docNo = updatedJson.document_number || updatedJson.document_no || "-";
    const sender = updatedJson.sender || updatedJson.party_name || "-";
    const nextFields: ExtractedField[] = [
      { id: 1, sourceText: updatedJson.document_type || "invoice", field: "document_type", value: updatedJson.document_type || "invoice", confidence: 99, status: "success", isOther: false },
      { id: 2, sourceText: docNo, field: "document_number", value: docNo, confidence: 99, status: "success", isOther: false },
      { id: 3, sourceText: updatedJson.document_date || "-", field: "document_date", value: updatedJson.document_date || "-", confidence: 99, status: "success", isOther: false },
      { id: 4, sourceText: sender, field: "sender", value: sender, confidence: 99, status: "success", isOther: false },
      { id: 5, sourceText: updatedJson.receiver || "-", field: "receiver", value: updatedJson.receiver || "-", confidence: 99, status: "success", isOther: false },
      { id: 6, sourceText: updatedJson.origin || "-", field: "origin", value: updatedJson.origin || "-", confidence: 99, status: "success", isOther: false },
      { id: 7, sourceText: updatedJson.destination || "-", field: "destination", value: updatedJson.destination || "-", confidence: 99, status: "success", isOther: false },
      { id: 8, sourceText: updatedJson.reference_number || "-", field: "reference_number", value: updatedJson.reference_number || "-", confidence: 99, status: "success", isOther: false },
      { id: 9, sourceText: String(updatedJson.unit_price ?? 0), field: "unit_price", value: String(updatedJson.unit_price ?? 0), confidence: 99, status: "success", isOther: false },
      { id: 10, sourceText: String(updatedJson.total_amount ?? 0), field: "total_amount", value: String(updatedJson.total_amount ?? 0), confidence: 99, status: "success", isOther: false },
      { id: 11, sourceText: updatedJson.currency || "THB", field: "currency", value: updatedJson.currency || "THB", confidence: 99, status: "success", isOther: false },
    ];

    Object.entries(otherObj).forEach(([k, v], idx) => {
      if (k !== "storage_url") {
        nextFields.push({
          id: 12 + idx,
          sourceText: String(v),
          field: k,
          value: String(v),
          confidence: 95,
          status: "success",
          isOther: true,
        });
      }
    });

    setBatchDocuments((prev) =>
      prev.map((doc, idx) =>
        idx === activeDocIndex ? { ...doc, jsonOutput: updatedJson, fields: nextFields } : doc
      )
    );
    showToast("บันทึกการแก้ไข JSON ใน Workspace เรียบร้อย");
  }

  async function handleSaveToFirebase(updatedJson?: JsonSchemaOutput) {
    if (!activeDoc) {
      showToast("ไม่มีเอกสารที่พร้อมบันทึก");
      return;
    }
    const jsonToSave = updatedJson || activeDoc.jsonOutput;
    if (!jsonToSave) {
      showToast("ยังไม่มีข้อมูล JSON Schema ให้บันทึกขึ้น Cloud Firebase");
      return;
    }

    setIsSavingToFirebase(true);
    try {
      let currentFields = activeDoc.fields;
      if (updatedJson) {
        const otherObj = updatedJson.other || {};
        const docNo = updatedJson.document_number || updatedJson.document_no || "-";
        const sender = updatedJson.sender || updatedJson.party_name || "-";
        currentFields = [
          { id: 1, sourceText: updatedJson.document_type || "invoice", field: "document_type", value: updatedJson.document_type || "invoice", confidence: 99, status: "success", isOther: false },
          { id: 2, sourceText: docNo, field: "document_number", value: docNo, confidence: 99, status: "success", isOther: false },
          { id: 3, sourceText: updatedJson.document_date || "-", field: "document_date", value: updatedJson.document_date || "-", confidence: 99, status: "success", isOther: false },
          { id: 4, sourceText: sender, field: "sender", value: sender, confidence: 99, status: "success", isOther: false },
          { id: 5, sourceText: updatedJson.receiver || "-", field: "receiver", value: updatedJson.receiver || "-", confidence: 99, status: "success", isOther: false },
          { id: 6, sourceText: updatedJson.origin || "-", field: "origin", value: updatedJson.origin || "-", confidence: 99, status: "success", isOther: false },
          { id: 7, sourceText: updatedJson.destination || "-", field: "destination", value: updatedJson.destination || "-", confidence: 99, status: "success", isOther: false },
          { id: 8, sourceText: updatedJson.reference_number || "-", field: "reference_number", value: updatedJson.reference_number || "-", confidence: 99, status: "success", isOther: false },
          { id: 9, sourceText: String(updatedJson.unit_price ?? 0), field: "unit_price", value: String(updatedJson.unit_price ?? 0), confidence: 99, status: "success", isOther: false },
          { id: 10, sourceText: String(updatedJson.total_amount ?? 0), field: "total_amount", value: String(updatedJson.total_amount ?? 0), confidence: 99, status: "success", isOther: false },
          { id: 11, sourceText: updatedJson.currency || "THB", field: "currency", value: updatedJson.currency || "THB", confidence: 99, status: "success", isOther: false },
        ];
        Object.entries(otherObj).forEach(([k, v], idx) => {
          if (k !== "storage_url") {
            currentFields.push({
              id: 12 + idx,
              sourceText: String(v),
              field: k,
              value: String(v),
              confidence: 95,
              status: "success",
              isOther: true,
            });
          }
        });
      }

      const savedResult = await saveDocumentToFirebase(
        {
          id: activeDoc.id,
          fileName: activeDoc.fileName,
          fileSize: activeDoc.fileSize,
          fileType: activeDoc.file?.type || "image/jpeg",
          documentType: selectedType,
          jsonSchema: jsonToSave,
          fields: currentFields,
          confidenceScores: activeDoc.confidenceScores,
          overallConfidence: activeDoc.overallConfidence,
          performance: activeDoc.performance ?? null,
          reviewItems: activeDoc.reviewItems,
          ocrText: activeDoc.ocrText,
          spatialText: activeDoc.spatialText,
          userEmail: userSession?.email || "guest@logiai.local",
          userName: userSession?.name || "Guest User",
        },
        activeDoc.file
      );

      const remainingCount = batchDocuments.length - 1;
      const isLast = remainingCount <= 0;

      if (savedResult.cloudSyncStatus === "synced") {
        showToast("บันทึก 11 ฟิลด์มาตรฐานขึ้น Cloud Firestore สำเร็จแล้ว");
      } else {
        showToast("บันทึกลง Local Workspace สำเร็จ (Cloud Sync มีการแจ้งเตือน)");
      }

      setFirebaseSuccessModal({
        isOpen: true,
        fileName: activeDoc.fileName,
        remainingCount,
        isLast,
      });
    } catch (err) {
      console.error("Firebase save error:", err);
      showToast("บันทึกขึ้น Firebase ล้มเหลว กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setIsSavingToFirebase(false);
    }
  }

  function handleResetDocument() {
    batchDocuments.forEach((doc) => {
      if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
    });
    setBatchDocuments([]);
    setActiveDocIndex(0);
    setIsBatchProcessing(false);
    setJobs([]);
    showToast("รีเซ็ตเอกสารทั้งหมดเรียบร้อย");
  }

  function handleAdvanceAfterFirebaseSave() {
    if (activeDoc?.previewUrl) {
      URL.revokeObjectURL(activeDoc.previewUrl);
    }
    const nextDocs = batchDocuments.filter((_, idx) => idx !== activeDocIndex);
    if (nextDocs.length > 0) {
      setBatchDocuments(nextDocs);
      setActiveDocIndex((prev) => Math.min(prev, nextDocs.length - 1));
      showToast(`เปิดเอกสารชุดถัดไปแล้ว (เหลือ ${nextDocs.length} ฉบับในคิว)`);
    } else {
      handleResetDocument();
      showToast("บันทึกเอกสารทั้งหมดเรียบร้อยแล้ว กลับสู่หน้าแทรกเอกสาร");
    }
    setFirebaseSuccessModal(null);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("ไม่สามารถคัดลอกข้อความได้");
    }
  }

  function handleConfirmReview(item: ReviewItem, parsedValue: string | number) {
    if (!activeDoc) return;
    const nextFields = fields.map((field) =>
      field.field === item.field
        ? {
            ...field,
            value: String(parsedValue),
            confidence: 100,
            status: "success" as const,
          }
        : field,
    );

    const nextReviews = reviewItems.filter((review) => review.field !== item.field);
    let nextJson: JsonSchemaOutput;
    if (item.isOther || (jsonOutput.other && item.field in jsonOutput.other)) {
      nextJson = {
        ...jsonOutput,
        other: {
          ...jsonOutput.other,
          [item.field]: parsedValue,
        },
      };
    } else {
      nextJson = {
        ...jsonOutput,
        [item.field]: parsedValue,
      };
    }

    setBatchDocuments((prev) =>
      prev.map((doc, idx) =>
        idx === activeDocIndex
          ? { ...doc, jsonOutput: nextJson, fields: nextFields, reviewItems: nextReviews }
          : doc,
      ),
    );
    setReviewingItem(null);
    showToast(`ยืนยันค่า ${item.field} แล้ว`);
  }

  async function handleReRunSlmForActiveDoc(overrideLines?: OcrLine[], overrideText?: string) {
    if (!activeDoc) return;
    const docIdx = activeDocIndex;
    const targetDoc = batchDocuments[docIdx];
    if (!targetDoc) return;

    const linesToUse = overrideLines ?? targetDoc.ocrLines ?? [];
    const textToUse =
      overrideText ??
      (overrideLines ? overrideLines.map((line) => line.text).join("\n") : targetDoc.ocrText ?? "");

    showToast("บันทึกการแก้ไข OCR เรียบร้อย · กำลังให้ Qwen SLM วิเคราะห์โครงสร้าง 11 ฟิลด์ใหม่...");
    setBatchDocuments((prev) =>
      prev.map((doc, idx) =>
        idx === docIdx
          ? {
              ...doc,
              ocrLines: linesToUse,
              ocrText: textToUse,
              status: "slm_processing" as const,
              statusLabel: "กำลังวิเคราะห์ Qwen SLM จาก OCR ที่แก้ไข...",
            }
          : doc,
      ),
    );

    try {
      const slm = await runSlmExtraction({
        documentTypeHint: selectedType,
        sourceFile: targetDoc.fileName,
        ocrText: textToUse,
        ocrLines: linesToUse,
        imageFile: targetDoc.file,
      });

      setBatchDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === docIdx
            ? {
                ...doc,
                ocrLines: linesToUse,
                ocrText: textToUse,
                jsonOutput: slm.jsonOutput,
                fields: slm.fields,
                confidenceScores: slm.confidenceScores,
                overallConfidence: slm.overallConfidence,
                performance: slm.performance ?? null,
                reviewItems: slm.reviewItems,
                status: "completed" as const,
                statusLabel: `เสร็จสมบูรณ์ (${slm.performance?.accuracy_pct ?? slm.overallConfidence}%)`,
              }
            : doc,
        ),
      );
      showToast("Qwen SLM วิเคราะห์โครงสร้าง JSON 11 ฟิลด์หลักสำเร็จตาม OCR ที่แก้ไข");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SLM Error";
      setBatchDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === docIdx
            ? {
                ...doc,
                status: "completed" as const,
                statusLabel: "SLM ผิดพลาด",
              }
            : doc,
        ),
      );
      showToast(`เกิดข้อผิดพลาดในการวิเคราะห์ SLM: ${msg}`);
    }
  }

  function handleUpdateOcrLines(updatedLines: OcrLine[], autoTriggerSlm: boolean = true) {
    if (!activeDoc) return;
    const docIdx = activeDocIndex;
    const updatedOcrText = updatedLines.map((line) => line.text).join("\n");

    if (autoTriggerSlm) {
      // Re-run SLM immediately using fresh lines & text to avoid state closure race conditions
      handleReRunSlmForActiveDoc(updatedLines, updatedOcrText);
    } else {
      setBatchDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === docIdx
            ? {
                ...doc,
                ocrLines: updatedLines,
                ocrText: updatedOcrText,
              }
            : doc,
        ),
      );
    }
  }

  if (!userSession) {
    if (authMode === "register") {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthMode("register")}
      />
    );
  }

  if (viewMode === "admin") {
    return (
      <AdminDashboard
        onUpdateJob={(updatedJob) => {
          setJobs((current) => current.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
        }}
        showToast={showToast}
        setViewMode={setViewMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-page text-ink antialiased">
      <AppHeader
        user={userSession}
        onLogout={handleLogout}
        onOpenFeatures={() => showToast("ฟีเจอร์: PaddleOCR GPU + Qwen2.5 SLM Multimodal + Firebase Cloud")}
        onOpenWorkflow={() => showToast("กระบวนการ: Upload -> OCR -> AI Reasoning -> JSON Schema")}
        onOpenPricing={() => showToast("แพ็กเกจ: ใช้งานฟรีสำหรับนักศึกษาและทดสอบระบบ")}
      />
      <main className="px-3 py-3.5 sm:px-5 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-4">
          {!hasDocument ? (
            /* ========================================================= */
            /* EMPTY STATE: WHITE THEME HERO CONVERTER & WORKFLOW        */
            /* ========================================================= */
            <div className="mx-auto w-full max-w-[1240px]">
              <LandingHeroConverter
                language={ocrLanguage}
                onLanguageChange={setOcrLanguage}
                onFilesSelect={handleBatchFilesSelect}
                onOpenPricing={() => showToast("แพ็กเกจ: ใช้งานฟรีสำหรับนักศึกษาและทดสอบระบบ")}
                onOpenFeatures={() => showToast("ฟีเจอร์: PaddleOCR GPU + Qwen2.5 SLM Multimodal + Firebase Cloud")}
                onOpenWorkflow={() => showToast("กระบวนการ: Upload -> OCR -> AI Reasoning -> JSON Schema")}
              />
            </div>
          ) : (
            /* ========================================================= */
            /* ACTIVE WORKSPACE: MATCHING UPLOADED REFERENCE UI (WHITE)  */
            /* ========================================================= */
            <div className="mx-auto w-full max-w-[1420px]">
              <UploadedWorkspaceView
                activeDoc={activeDoc}
                batchDocuments={batchDocuments}
                activeDocIndex={activeDocIndex}
                onSelectDocIndex={handleSelectDocIndex}
                onAddFiles={handleBatchFilesSelect}
                onReRunOcr={() => {
                  const files = batchDocuments.map((d) => d.file).filter(Boolean) as File[];
                  if (files.length > 0) {
                    setBatchDocuments([]);
                    handleBatchFilesSelect(files);
                  } else {
                    showToast("กำลังประมวลผล OCR อีกครั้ง...");
                  }
                }}
                onExportAllJson={handleExportAllJson}
                onCopyJson={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON แล้ว")}
                onDownloadJson={() => createJsonDownload(jsonOutput)}
                onSaveToFirebase={handleSaveToFirebase}
                onUpdateLocalJson={handleUpdateLocalJson}
                isSavingToFirebase={isSavingToFirebase}
                onMoveOtherToCore={handleMoveOtherToCore}
                onShowToast={showToast}
                onUpdateOcrLines={handleUpdateOcrLines}
                onReRunSlmWithOcr={handleReRunSlmForActiveDoc}
                isProcessing={isBatchProcessing}
              />
              <div className="mt-4">
                <SlmPromptAssistantPanel
                  ocrText={activeDoc?.ocrText || ""}
                  jsonSchema={jsonOutput}
                  onOpenFullAssistant={() => setShowPromptAssistantModal(true)}
                  onShowToast={showToast}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {firebaseSuccessModal && (
        <FirebaseSaveSuccessModal
          isOpen={firebaseSuccessModal.isOpen}
          fileName={firebaseSuccessModal.fileName}
          remainingCount={firebaseSuccessModal.remainingCount}
          isLast={firebaseSuccessModal.isLast}
          onAdvance={handleAdvanceAfterFirebaseSave}
        />
      )}

      {reviewingItem ? (
        <ManualReviewModal
          item={reviewingItem}
          onCancel={() => setReviewingItem(null)}
          onConfirm={handleConfirmReview}
        />
      ) : null}
      {activeDoc && (
        <SlmPromptAssistantModal
          isOpen={showPromptAssistantModal}
          onClose={() => setShowPromptAssistantModal(false)}
          ocrText={activeDoc.ocrText}
          jsonSchema={jsonOutput}
          onShowToast={showToast}
        />
      )}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </div>
  );
}
