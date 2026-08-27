import { BrainCircuit, CheckCircle2, Cloud, FileSearch, Layers, Plus, RefreshCw, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { BatchDocumentGallery } from "./components/BatchDocumentGallery";
import { ConfidenceCard } from "./components/ConfidenceCard";
import { DocumentPreview } from "./components/DocumentPreview";
import { DocumentUploader } from "./components/DocumentUploader";
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable";
import { FirebaseCloudHistoryModal } from "./components/FirebaseCloudHistoryModal";
import { JSONOutputPanel } from "./components/JSONOutputPanel";
import { LandingHeroConverter } from "./components/LandingHeroConverter";
import { LoginPage, type UserSession } from "./components/LoginPage";
import { ManualReviewCard } from "./components/ManualReviewCard";
import { ManualReviewModal } from "./components/ManualReviewModal";
import { OCRResultPanel } from "./components/OCRResultPanel";
import { RecentJobsTable } from "./components/RecentJobsTable";
import { RegisterPage } from "./components/RegisterPage";
import { SlmAccuracyCard } from "./components/SlmAccuracyCard";
import { SlmReasoningAnimation } from "./components/SlmReasoningAnimation";
import { Toast } from "./components/Toast";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { initialJson, initialSteps, ocrText } from "./data/mockData";
import { saveDocumentToFirebase, type FirebaseDocumentRecord } from "./services/firebase";
import { createJsonDownload, nextStepState } from "./services/mockProcessingService";
import { runPaddleOcr, type OcrLanguage } from "./services/ocrApi";
import { runSlmExtraction } from "./services/slmApi";
import type {
  BatchDocumentItem,
  ConfidenceScore,
  DocumentJob,
  DocumentType,
  ExtractedField,
  JsonSchemaOutput,
  ReviewItem,
  SlmPerformanceMetrics,
} from "./types";

type WorkspaceTab = "json" | "ocr" | "analytics" | "fields" | "jobs";

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

  const [steps, setSteps] = useState(initialSteps);
  const [batchDocuments, setBatchDocuments] = useState<BatchDocumentItem[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchPhase, setBatchPhase] = useState<"idle" | "ocr" | "slm" | "completed">("idle");

  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("th");
  const [selectedType, setSelectedType] = useState<DocumentType>("Invoice");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("json");
  const [showCloudHistoryModal, setShowCloudHistoryModal] = useState(false);

  const [jobs, setJobs] = useState<DocumentJob[]>([]);
  const [reviewingItem, setReviewingItem] = useState<ReviewItem | null>(null);
  const [toast, setToast] = useState("");

  const activeDoc = batchDocuments[activeDocIndex] || null;
  const hasDocument = batchDocuments.length > 0;

  const fileName = activeDoc?.fileName ?? "";
  const fileSize = activeDoc?.fileSize ?? "";
  const previewUrl = activeDoc?.previewUrl ?? null;
  const ocrResultText = activeDoc?.ocrText ?? "";
  const jsonOutput = activeDoc?.jsonOutput ?? initialJson;
  const fields = activeDoc?.fields ?? [];
  const confidenceScores = activeDoc?.confidenceScores ?? [];
  const overallConfidence = activeDoc?.overallConfidence ?? 0;
  const slmPerformance = activeDoc?.performance ?? null;
  const reviewItems = activeDoc?.reviewItems ?? [];
  const slmReady = activeDoc?.status === "completed" && activeDoc?.jsonOutput !== null;
  const uploadProgress = activeDoc?.status === "completed" ? 100 : (activeDoc?.status === "ocr_completed" ? 60 : (activeDoc?.status === "ocr_processing" ? 30 : 0));

  function handleLogin(session: UserSession) {
    setUserSession(session);
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
    setWorkspaceTab("json");
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
      setBatchPhase("ocr");
      setSteps(nextStepState(initialSteps, 2));

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
      setBatchPhase("slm");
      setSteps(nextStepState(initialSteps, 4));

      for (let i = 0; i < allDocs.length; i++) {
        if (allDocs[i].status === "completed" || allDocs[i].status === "error") continue;

        allDocs[i] = {
          ...allDocs[i],
          status: "slm_processing",
          statusLabel: `กำลังวิเคราะห์ SLM รูปที่ ${i + 1}/${allDocs.length} (GPU)...`,
        };
        setBatchDocuments([...allDocs]);
        setJobs((current) =>
          current.map((job) =>
            job.id === allDocs[i].id ? { ...job, statusLabel: "กำลังวิเคราะห์ Qwen SLM" } : job,
          ),
        );

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

          // Auto-save image file and JSON schema to Google Cloud Firebase
          try {
            const fbRecord = await saveDocumentToFirebase(
              {
                id: allDocs[i].id,
                fileName: allDocs[i].fileName,
                fileSize: allDocs[i].fileSize,
                fileType: allDocs[i].file.type || "image/jpeg",
                documentType: selectedType,
                jsonSchema: slm.jsonOutput,
                fields: slm.fields,
                confidenceScores: slm.confidenceScores,
                overallConfidence: slm.overallConfidence,
                performance: slm.performance ?? null,
                reviewItems: slm.reviewItems,
                ocrText: allDocs[i].ocrText,
                spatialText: allDocs[i].spatialText,
                userEmail: userSession?.email || "guest@logiai.local",
                userName: userSession?.name || "Guest User",
              },
              allDocs[i].file
            );
            allDocs[i].cloudSyncStatus = "synced";
            allDocs[i].cloudRecordId = fbRecord.id;
            allDocs[i].storageUrl = fbRecord.storageUrl;
            setBatchDocuments([...allDocs]);
          } catch (cloudErr) {
            console.warn("Firebase Cloud Sync warning:", cloudErr);
            allDocs[i].cloudSyncStatus = "local_only";
            setBatchDocuments([...allDocs]);
          }
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

      setBatchPhase("completed");
      setSteps(nextStepState(initialSteps, 6));
      showToast(`🎉 ประมวลผลแบทช์เสร็จสมบูรณ์ทั้งหมด ${allDocs.length} เอกสารแล้ว!`);
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

  function handleRemoveBatchDoc(index: number) {
    const docToRemove = batchDocuments[index];
    if (docToRemove?.previewUrl) {
      URL.revokeObjectURL(docToRemove.previewUrl);
    }
    const nextList = batchDocuments.filter((_, idx) => idx !== index);
    setBatchDocuments(nextList);
    if (nextList.length === 0) {
      handleResetDocument();
    } else if (activeDocIndex >= nextList.length) {
      setActiveDocIndex(nextList.length - 1);
    }
    showToast(`ลบเอกสารออกจากแบทช์แล้ว`);
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
    if (targetCoreKey === "quantity" || targetCoreKey === "total_amount") {
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
    showToast(`ย้ายค่า "${sourceOtherKey}" ไปยัง 7 ฟิลด์หลัก "${targetCoreKey}" เรียบร้อยแล้ว`);
  }

  function handleDeleteCustomField(fieldKey: string, isOther?: boolean) {
    if (!activeDoc) return;
    const nextOther = { ...(jsonOutput.other || {}) };
    if (isOther) {
      delete nextOther[fieldKey];
    }
    const nextJson: JsonSchemaOutput = {
      ...jsonOutput,
      other: nextOther,
    };
    const nextFields = fields.filter((f) => f.field !== fieldKey);

    setBatchDocuments((prev) =>
      prev.map((doc, idx) =>
        idx === activeDocIndex ? { ...doc, jsonOutput: nextJson, fields: nextFields } : doc,
      ),
    );
    showToast(`ลบฟิลด์ "${fieldKey}" สำเร็จ`);
  }

  async function handleSaveJsonSchema(updatedJson: JsonSchemaOutput) {
    // Reconstruct fields array
    const otherObj = updatedJson.other || {};
    const nextFields: ExtractedField[] = [
      { id: 1, sourceText: updatedJson.document_type || "invoice", field: "document_type", value: updatedJson.document_type || "invoice", confidence: 99, status: "success", isOther: false },
      { id: 2, sourceText: updatedJson.document_no || "-", field: "document_no", value: updatedJson.document_no || "-", confidence: 99, status: "success", isOther: false },
      { id: 3, sourceText: updatedJson.document_date || "-", field: "document_date", value: updatedJson.document_date || "-", confidence: 99, status: "success", isOther: false },
      { id: 4, sourceText: updatedJson.party_name || "-", field: "party_name", value: updatedJson.party_name || "-", confidence: 99, status: "success", isOther: false },
      { id: 5, sourceText: updatedJson.source_file || fileName, field: "source_file", value: updatedJson.source_file || fileName, confidence: 100, status: "success", isOther: false },
      { id: 6, sourceText: String(updatedJson.quantity ?? 1), field: "quantity", value: String(updatedJson.quantity ?? 1), confidence: 99, status: "success", isOther: false },
      { id: 7, sourceText: String(updatedJson.total_amount ?? 0), field: "total_amount", value: String(updatedJson.total_amount ?? 0), confidence: 99, status: "success", isOther: false },
    ];

    Object.entries(otherObj).forEach(([k, v], idx) => {
      if (k !== "storage_url") {
        nextFields.push({
          id: 8 + idx,
          sourceText: String(v),
          field: k,
          value: String(v),
          confidence: 95,
          status: "success",
          isOther: true,
        });
      }
    });

    if (activeDoc) {
      setBatchDocuments((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndex ? { ...doc, jsonOutput: updatedJson, fields: nextFields } : doc
        )
      );

      // Auto-save to Firebase Firestore
      try {
        await saveDocumentToFirebase(
          {
            id: activeDoc.id,
            fileName: activeDoc.fileName,
            fileSize: activeDoc.fileSize,
            fileType: activeDoc.file?.type || "image/jpeg",
            documentType: selectedType,
            jsonSchema: updatedJson,
            fields: nextFields,
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
        showToast("🎉 บันทึกการแก้ไข JSON Schema ลง Cloud Firestore เรียบร้อย!");
      } catch (err) {
        console.warn("Cloud save warning after manual edit:", err);
        showToast("💾 บันทึกการแก้ไข JSON Schema เรียบร้อย");
      }
    } else {
      showToast("💾 บันทึกการแก้ไข JSON Schema เรียบร้อย");
    }
  }

  function handleResetDocument() {
    batchDocuments.forEach((doc) => {
      if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
    });
    setBatchDocuments([]);
    setActiveDocIndex(0);
    setIsBatchProcessing(false);
    setBatchPhase("idle");
    setSteps(initialSteps);
    setJobs([]);
    showToast("รีเซ็ตเอกสารทั้งหมดเรียบร้อย");
  }

  async function handleManualCloudSync() {
    if (!activeDoc || !activeDoc.jsonOutput) {
      showToast("ยังไม่มีข้อมูล JSON Schema ให้บันทึกขึ้น Cloud");
      return;
    }
    showToast("☁️ กำลังบันทึกข้อมูลขึ้น Google Cloud Firebase...");
    try {
      const fbRecord = await saveDocumentToFirebase(
        {
          id: activeDoc.id,
          fileName: activeDoc.fileName,
          fileSize: activeDoc.fileSize,
          fileType: activeDoc.file.type || "image/jpeg",
          documentType: selectedType,
          jsonSchema: activeDoc.jsonOutput,
          fields: activeDoc.fields,
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

      const nextList = [...batchDocuments];
      nextList[activeDocIndex] = {
        ...nextList[activeDocIndex],
        cloudSyncStatus: "synced",
        cloudRecordId: fbRecord.id,
        storageUrl: fbRecord.storageUrl,
      };
      setBatchDocuments(nextList);
      showToast(`☁️ บันทึกเอกสาร "${activeDoc.fileName}" ขึ้น Firebase เรียบร้อย!`);
    } catch (err) {
      console.error(err);
      showToast("บันทึกขึ้น Firebase ล้มเหลว กรุณาลองใหม่อีกครั้ง");
    }
  }

  function handleLoadFromCloud(record: FirebaseDocumentRecord) {
    const dummyFile = new File([""], record.fileName, { type: record.fileType || "image/jpeg" });
    const loadedItem: BatchDocumentItem = {
      id: record.id,
      file: dummyFile,
      fileName: record.fileName,
      fileSize: record.fileSize || "0.50 MB",
      previewUrl: record.storageUrl || null,
      status: "completed",
      statusLabel: `โหลดจาก Firebase (${record.performance?.accuracy_pct ?? record.overallConfidence}%)`,
      ocrProgress: 100,
      ocrText: record.ocrText || "",
      spatialText: record.spatialText,
      ocrLines: [],
      jsonOutput: record.jsonSchema,
      fields: record.fields || [],
      confidenceScores: record.confidenceScores || [],
      overallConfidence: record.overallConfidence || 95,
      performance: record.performance || null,
      reviewItems: record.reviewItems || [],
      cloudSyncStatus: "synced",
      cloudRecordId: record.id,
      storageUrl: record.storageUrl,
      startedAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      completedAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    };

    setBatchDocuments((prev) => [loadedItem, ...prev]);
    setActiveDocIndex(0);
    setWorkspaceTab("json");
    setSteps(nextStepState(initialSteps, 6));
    showToast(`☁️ โหลดเอกสาร "${record.fileName}" จาก Firebase สำเร็จ!`);
  }

  function handleStepClick(stepId: number) {
    if (stepId <= 3) {
      setWorkspaceTab("json");
    } else {
      setWorkspaceTab("analytics");
    }
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

  return (
    <div className="min-h-screen bg-page text-ink antialiased">
      <AppHeader
        user={userSession}
        onLogout={handleLogout}
        onOpenCloudHistory={() => setShowCloudHistoryModal(true)}
      />
      <main className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-5">
          {!hasDocument ? (
            /* ========================================================= */
            /* EMPTY STATE: WHITE THEME HERO CONVERTER & WORKFLOW        */
            /* ========================================================= */
            <div className="mx-auto w-full max-w-[1320px]">
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
            /* ACTIVE WORKSPACE: CLEAN 2-COLUMN STUDIO LAYOUT            */
            /* ========================================================= */
            <>
              {/* Batch Carousel & Progress Bar */}
              <BatchDocumentGallery
                documents={batchDocuments}
                activeIndex={activeDocIndex}
                onSelectIndex={handleSelectDocIndex}
                onAddFiles={handleBatchFilesSelect}
                onRemoveDocument={handleRemoveBatchDoc}
                onExportAllJson={handleExportAllJson}
                isProcessing={isBatchProcessing}
                batchPhase={batchPhase}
              />

              {/* Active Document Top Quick Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-panel">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-xs font-black text-white shadow-xs">
                    {fileName.endsWith(".pdf") ? "PDF" : "IMG"}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="text-sm font-black text-navy">{fileName}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        OCR: {ocrLanguage === "th" ? "ไทย + English" : "English"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        <BrainCircuit className="h-3 w-3 text-emerald-600" />
                        {slmReady ? `ความแม่นยำ: ${slmPerformance?.accuracy_pct ?? overallConfidence}%` : (activeDoc?.statusLabel ?? "กำลังประมวลผล")}
                      </span>
                      {activeDoc?.cloudSyncStatus === "synced" ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200"
                          title="ข้อมูลรูปภาพและ JSON Schema ถูกจัดเก็บบน Google Cloud Firestore"
                        >
                          <Cloud className="h-3 w-3 text-amber-600" />
                          <span>บันทึกบน Firebase แล้ว</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      ขนาดไฟล์: {fileSize} · กำลังดูเอกสารที่ {activeDocIndex + 1} จากทั้งหมด {batchDocuments.length} รายการ
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloudHistoryModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100"
                    title="เปิดคลังเอกสาร & JSON ที่เก็บไว้บน Cloud Firebase"
                  >
                    <Cloud className="h-3.5 w-3.5 text-amber-600" />
                    <span>คลัง Cloud</span>
                  </button>

                  {slmReady ? (
                    <button
                      type="button"
                      onClick={handleManualCloudSync}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
                      title="บันทึกข้อมูลและรูปภาพขึ้น Firebase อีกครั้ง"
                    >
                      <Cloud className="h-3.5 w-3.5 text-primary" />
                      <span>ซิงค์ขึ้น Cloud</span>
                    </button>
                  ) : null}

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-primary shadow-xs transition hover:bg-blue-100">
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>เพิ่มรูปภาพ</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.jpg,.jpeg,.png,.tif,.tiff"
                      className="sr-only"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length > 0) handleBatchFilesSelect(files);
                        event.target.value = "";
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetDocument}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
                    title="ล้างเอกสารทั้งหมดและเริ่มใหม่"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>รีเซ็ต</span>
                  </button>
                </div>
              </div>

              {/* Main 2-Column Split Workbench */}
              <div className="grid min-w-0 gap-6 lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
                {/* Left Column: Document Image Preview */}
                <section className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
                  <DocumentPreview
                    previewUrl={previewUrl}
                    previewName={fileName}
                    progress={uploadProgress}
                    onToast={showToast}
                  />
                </section>

                {/* Right Column: Tabbed Clean Results Studio */}
                <section className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
                  {/* Clean Tab Selector Bar */}
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TabButton
                        active={workspaceTab === "json"}
                        label="JSON Schema"
                        onClick={() => setWorkspaceTab("json")}
                      />
                      <TabButton
                        active={workspaceTab === "ocr"}
                        label="ข้อความ OCR & Confidence"
                        badge={activeDoc?.ocrLines?.length || undefined}
                        onClick={() => setWorkspaceTab("ocr")}
                      />
                      <TabButton
                        active={workspaceTab === "analytics"}
                        label="ความแม่นยำ & Review"
                        badge={reviewItems.length > 0 ? `รอตรวจ ${reviewItems.length}` : undefined}
                        onClick={() => setWorkspaceTab("analytics")}
                      />
                      <TabButton
                        active={workspaceTab === "fields"}
                        label="ตารางฟิลด์สกัด"
                        onClick={() => setWorkspaceTab("fields")}
                      />
                      <TabButton
                        active={workspaceTab === "jobs"}
                        label="ประวัติเซสชัน"
                        badge={jobs.length}
                        onClick={() => setWorkspaceTab("jobs")}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-500">
                        SLM Accuracy: <b className="text-primary">{slmPerformance?.accuracy_pct ?? overallConfidence}%</b>
                      </span>
                    </div>
                  </div>

                  {/* Tab 1: JSON Schema Output & Editor */}
                  {workspaceTab === "json" ? (
                    <div className="min-w-0">
                      {slmReady ? (
                        <JSONOutputPanel
                          json={jsonOutput}
                          onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON แล้ว")}
                          onDownload={() => createJsonDownload(jsonOutput)}
                          onMoveOtherToCore={handleMoveOtherToCore}
                          onSaveJson={handleSaveJsonSchema}
                        />
                      ) : (
                        <SlmReasoningAnimation
                          title="กำลังประมวลผล JSON Schema ด้วย Qwen SLM"
                          fileName={fileName}
                          isProcessing={activeDoc?.status === "slm_processing" || activeDoc?.status === "ocr_processing"}
                        />
                      )}
                    </div>
                  ) : null}

                  {/* Tab 2: OCR Result & Confidence Viewer */}
                  {workspaceTab === "ocr" ? (
                    <div className="min-w-0">
                      <OCRResultPanel
                        text={ocrResultText}
                        spatialText={activeDoc?.spatialText}
                        lines={activeDoc?.ocrLines}
                        onCopy={() => copyText(activeDoc?.spatialText || ocrResultText, "คัดลอก OCR Text แล้ว")}
                      />
                    </div>
                  ) : null}

                  {/* Tab 3: Accuracy Metrics, Confidence Breakdown & Review */}
                  {workspaceTab === "analytics" ? (
                    <div className="space-y-5">
                      {slmReady ? (
                        <SlmAccuracyCard
                          performance={slmPerformance}
                          jsonOutput={jsonOutput}
                          overallConfidence={overallConfidence}
                        />
                      ) : null}
                      <div className="grid gap-5 xl:grid-cols-2">
                        {slmReady ? (
                          <ConfidenceCard overall={overallConfidence} scores={confidenceScores} />
                        ) : (
                          <SlmReasoningAnimation
                            title="ความมั่นใจ / Confidence"
                            fileName={fileName}
                          />
                        )}
                        {slmReady ? (
                          <ManualReviewCard items={reviewItems} onReview={setReviewingItem} />
                        ) : (
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                            <BrainCircuit className="h-8 w-8 text-slate-400 animate-pulse" />
                            <p className="mt-2 text-xs font-bold text-slate-600">กำลังรอผลการตรวจสอบโดย SLM</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Tab 4: Extracted Fields Table */}
                  {workspaceTab === "fields" ? (
                    <div className="min-w-0">
                      <ExtractedFieldsTable
                        fields={fields}
                        selectedType={selectedType}
                        onTypeChange={setSelectedType}
                        onMoveOtherToCore={handleMoveOtherToCore}
                        onDeleteField={handleDeleteCustomField}
                      />
                    </div>
                  ) : null}

                  {/* Tab 5: Recent Jobs History */}
                  {workspaceTab === "jobs" ? (
                    <div className="min-w-0">
                      <RecentJobsTable jobs={jobs} />
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
        </div>
      </main>

      <FirebaseCloudHistoryModal
        isOpen={showCloudHistoryModal}
        onClose={() => setShowCloudHistoryModal(false)}
        onLoadDocument={handleLoadFromCloud}
        onShowToast={showToast}
      />

      {reviewingItem ? (
        <ManualReviewModal
          item={reviewingItem}
          onCancel={() => setReviewingItem(null)}
          onConfirm={handleConfirmReview}
        />
      ) : null}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </div>
  );
}

function TabButton({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: string | number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
        active
          ? "bg-navy text-white shadow-xs"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-navy"
      }`}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
            active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function AwaitingDocumentState() {
  return (
    <section className="grid min-h-[420px] place-items-center rounded-2xl border-2 border-dashed border-blue-200 bg-white p-8 text-center shadow-panel">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-primary">
          <FileSearch className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-navy">พร้อมรับเอกสารสำหรับประมวลผล</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          เลือกไฟล์ PDF, JPG หรือ PNG เพื่อเริ่ม OCR ด้วย PaddleOCR GPU และวิเคราะห์ต่อด้วย Qwen SLM บน CUDA
        </p>
      </div>
    </section>
  );
}

function SlmWaitingCard({ title }: { title: string }) {
  return (
    <section className="grid min-h-[300px] min-w-0 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center shadow-panel">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-200 text-slate-600">
          <BrainCircuit className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-extrabold text-navy">{title}</h2>
        <p className="mt-2 text-xs font-bold text-slate-500">กำลังรอผลจาก Qwen SLM บน CUDA</p>
      </div>
    </section>
  );
}
