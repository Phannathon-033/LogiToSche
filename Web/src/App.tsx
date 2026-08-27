import { BrainCircuit, CheckCircle2, FileSearch, Layers, Plus, RefreshCw, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { BatchDocumentGallery } from "./components/BatchDocumentGallery";
import { ConfidenceCard } from "./components/ConfidenceCard";
import { DocumentPreview } from "./components/DocumentPreview";
import { DocumentUploader } from "./components/DocumentUploader";
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable";
import { JSONOutputPanel } from "./components/JSONOutputPanel";
import { LoginPage, type UserSession } from "./components/LoginPage";
import { ManualReviewCard } from "./components/ManualReviewCard";
import { ManualReviewModal } from "./components/ManualReviewModal";
import { OCRResultPanel } from "./components/OCRResultPanel";
import { RecentJobsTable } from "./components/RecentJobsTable";
import { RegisterPage } from "./components/RegisterPage";
import { SlmAccuracyCard } from "./components/SlmAccuracyCard";
import { SlmPromptAssistantModal } from "./components/SlmPromptAssistantModal";
import { SlmPromptAssistantPanel } from "./components/SlmPromptAssistantPanel";
import { Toast } from "./components/Toast";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { initialJson, initialSteps, ocrText } from "./data/mockData";
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

type WorkspaceTab = "extraction" | "assistant" | "analysis" | "all";

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
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("extraction");
  const [showPromptModal, setShowPromptModal] = useState(false);

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
    setWorkspaceTab("extraction");
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
    setIsBatchProcessing(false);
    setSteps(nextStepState(initialSteps, 6));
    showToast(`🎉 ประมวลผลแบทช์เสร็จสมบูรณ์ทั้งหมด ${allDocs.length} เอกสารแล้ว!`);
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

  function handleStepClick(stepId: number) {
    if (stepId <= 3) {
      setWorkspaceTab("extraction");
    } else if (stepId === 4) {
      setWorkspaceTab("assistant");
    } else {
      setWorkspaceTab("analysis");
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
      <AppHeader user={userSession} onLogout={handleLogout} />
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-7">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-panel lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-black uppercase text-cyan-600">LogiAI Docs to JSON</span>
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-50/80 px-2.5 py-1 text-xs font-bold text-emerald-700">PaddleOCR GPU Accelerated</span>
                  <span className="rounded-lg border border-blue-500/30 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-blue-700">Qwen2.5-1.5B CUDA</span>
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-normal text-navy lg:text-3xl">ระบบแปลงเอกสารโลจิสติกส์เป็น JSON Schema</h1>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                  อัปโหลดเอกสารเพื่อ OCR ด้วย PaddleOCR บน GPU แล้วส่งข้อความให้ Qwen SLM วิเคราะห์เป็น JSON Schema พร้อมแสดงผลวิเคราะห์ประสิทธิภาพและความแม่นยำทุกครั้ง
                </p>
              </div>

              {hasDocument ? (
                <button
                  type="button"
                  onClick={handleResetDocument}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <RefreshCw className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  รีเซ็ตเอกสารทั้งหมด
                </button>
              ) : null}
            </div>
          </section>

          {hasDocument ? <WorkflowStepper steps={steps} onStepClick={handleStepClick} /> : null}

          {!hasDocument ? (
            <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(380px,500px)_1fr]">
              <section className="min-w-0 rounded-2xl border border-line bg-white p-6 shadow-panel">
                <DocumentUploader
                  batchCount={batchDocuments.length}
                  language={ocrLanguage}
                  onLanguageChange={setOcrLanguage}
                  onFilesSelect={handleBatchFilesSelect}
                />
              </section>
              <AwaitingDocumentState />
            </div>
          ) : (
            <>
              {/* Batch Documents Horizontal Gallery & 2-Phase Progress Bar */}
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

              {/* Active Document Top Quick Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/70 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary font-extrabold text-white">{fileName.endsWith(".pdf") ? "PDF" : "IMG"}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-extrabold text-navy">{fileName}</p>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-success ring-1 ring-green-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OCR: {ocrLanguage === "th" ? "ไทย + English" : "English"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 ring-1 ring-indigo-300">
                        <BrainCircuit className="h-3.5 w-3.5" />
                        {slmReady ? `SLM ความแม่นยำ: ${slmPerformance?.accuracy_pct ?? overallConfidence}%` : (activeDoc?.statusLabel ?? "กำลังรอผล")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">ขนาด: {fileSize} · เอกสารที่ {activeDocIndex + 1} จาก {batchDocuments.length} · GPU pipeline: PaddleOCR + Qwen2.5-1.5B CUDA</p>
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-300 bg-white px-3.5 py-2 text-xs font-extrabold text-primary transition hover:bg-blue-50">
                  <UploadCloud className="h-4 w-4" />
                  เพิ่มรูปภาพ/เอกสารเข้าแบทช์
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                    className="sr-only"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      if (files.length > 0) handleBatchFilesSelect(files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid min-w-0 gap-8 lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
                <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-6 shadow-panel">
                  <DocumentPreview previewUrl={previewUrl} previewName={fileName} progress={uploadProgress} onToast={showToast} />
                </section>

                <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-6 shadow-panel">
                  <div className="mb-6 flex flex-wrap items-center justify-between border-b border-line pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <TabButton active={workspaceTab === "extraction"} label="OCR & JSON" onClick={() => setWorkspaceTab("extraction")} />
                      <TabButton active={workspaceTab === "assistant"} label="✨ AI Prompt Assistant" onClick={() => setWorkspaceTab("assistant")} />
                      <TabButton active={workspaceTab === "analysis"} label="📊 ประสิทธิภาพ & Review" onClick={() => setWorkspaceTab("analysis")} />
                      <TabButton active={workspaceTab === "all"} label="ทั้งหมด" onClick={() => setWorkspaceTab("all")} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPromptModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all shadow-sm"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>AI Prompt สำเร็จรูป</span>
                      </button>
                      <span className="hidden text-xs font-bold text-slate-500 sm:inline">
                        ความแม่นยำ SLM: <b className="text-primary">{slmPerformance?.accuracy_pct ?? overallConfidence}%</b>
                      </span>
                    </div>
                  </div>

                  {workspaceTab === "extraction" ? (
                    <div className="space-y-6">
                      <div className="grid gap-6 xl:grid-cols-2">
                        <OCRResultPanel text={ocrResultText} onCopy={() => copyText(ocrResultText, "คัดลอก OCR Text แล้ว")} />
                        {slmReady ? (
                          <JSONOutputPanel
                            json={jsonOutput}
                            onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON แล้ว")}
                            onDownload={() => createJsonDownload(jsonOutput)}
                            onMoveOtherToCore={handleMoveOtherToCore}
                          />
                        ) : (
                          <SlmWaitingCard title="JSON Schema Output" />
                        )}
                      </div>
                      {slmReady ? (
                        <SlmAccuracyCard
                          performance={slmPerformance}
                          jsonOutput={jsonOutput}
                          overallConfidence={overallConfidence}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {workspaceTab === "assistant" ? (
                    <div className="grid gap-6">
                      <SlmPromptAssistantPanel
                        ocrText={ocrResultText}
                        jsonSchema={jsonOutput}
                        onOpenFullAssistant={() => setShowPromptModal(true)}
                        onShowToast={showToast}
                      />
                    </div>
                  ) : null}

                  {workspaceTab === "analysis" ? (
                    <div className="space-y-6">
                      {slmReady ? (
                        <SlmAccuracyCard
                          performance={slmPerformance}
                          jsonOutput={jsonOutput}
                          overallConfidence={overallConfidence}
                        />
                      ) : null}
                      <div className="grid gap-6 xl:grid-cols-2">
                        {slmReady ? <ConfidenceCard overall={overallConfidence} scores={confidenceScores} /> : <SlmWaitingCard title="ความมั่นใจ / Confidence" />}
                        {slmReady ? <ManualReviewCard items={reviewItems} onReview={setReviewingItem} /> : <SlmWaitingCard title="ต้องตรวจสอบโดยมนุษย์ (Review Required)" />}
                      </div>
                    </div>
                  ) : null}

                  {workspaceTab === "all" ? (
                    <div className="space-y-6">
                      <div className="grid gap-6 xl:grid-cols-2">
                        <OCRResultPanel text={ocrResultText} onCopy={() => copyText(ocrResultText, "คัดลอก OCR Text แล้ว")} />
                        {slmReady ? (
                          <JSONOutputPanel
                            json={jsonOutput}
                            onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON แล้ว")}
                            onDownload={() => createJsonDownload(jsonOutput)}
                            onMoveOtherToCore={handleMoveOtherToCore}
                          />
                        ) : (
                          <SlmWaitingCard title="JSON Schema Output" />
                        )}
                      </div>
                      {slmReady ? (
                        <SlmAccuracyCard
                          performance={slmPerformance}
                          jsonOutput={jsonOutput}
                          overallConfidence={overallConfidence}
                        />
                      ) : null}
                      <div>
                        <SlmPromptAssistantPanel
                          ocrText={ocrResultText}
                          jsonSchema={jsonOutput}
                          onOpenFullAssistant={() => setShowPromptModal(true)}
                          onShowToast={showToast}
                        />
                      </div>
                      <div className="grid gap-6 xl:grid-cols-2">
                        {slmReady ? <ConfidenceCard overall={overallConfidence} scores={confidenceScores} /> : <SlmWaitingCard title="ความมั่นใจ / Confidence" />}
                        {slmReady ? <ManualReviewCard items={reviewItems} onReview={setReviewingItem} /> : <SlmWaitingCard title="ต้องตรวจสอบโดยมนุษย์ (Review Required)" />}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              <section className="grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.85fr)]">
                <ExtractedFieldsTable
                  fields={fields}
                  selectedType={selectedType}
                  onTypeChange={setSelectedType}
                  onMoveOtherToCore={handleMoveOtherToCore}
                  onDeleteField={handleDeleteCustomField}
                />
                <RecentJobsTable jobs={jobs} />
              </section>
            </>
          )}
        </div>
      </main>

      <SlmPromptAssistantModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        ocrText={ocrResultText}
        jsonSchema={jsonOutput}
        onShowToast={showToast}
      />

      {reviewingItem ? <ManualReviewModal item={reviewingItem} onCancel={() => setReviewingItem(null)} onConfirm={handleConfirmReview} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
        active ? "bg-navy text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
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
        <p className="mt-2 text-sm leading-6 text-slate-600">เลือกไฟล์ PDF, JPG หรือ PNG เพื่อเริ่ม OCR ด้วย PaddleOCR GPU และวิเคราะห์ต่อด้วย Qwen SLM บน CUDA</p>
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
