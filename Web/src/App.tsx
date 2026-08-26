import { BrainCircuit, CheckCircle2, FileSearch, RefreshCw, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
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
import { Toast } from "./components/Toast";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { AdminDashboard } from "./components/AdminDashboard";
import { initialJson, initialSteps, ocrText, recentJobs } from "./data/mockData";
import { createJsonDownload, nextStepState } from "./services/mockProcessingService";
import { runPaddleOcr, type OcrLanguage } from "./services/ocrApi";
import { runSlmExtraction } from "./services/slmApi";
import type { ConfidenceScore, DocumentJob, DocumentType, ExtractedField, JsonSchemaOutput, ReviewItem } from "./types";

type WorkspaceTab = "extraction" | "analysis" | "all";

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
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResultText, setOcrResultText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("th");
  const [selectedType, setSelectedType] = useState<DocumentType>("Invoice");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("extraction");
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");

  const [jsonOutput, setJsonOutput] = useState<JsonSchemaOutput>(initialJson);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [jobs, setJobs] = useState<DocumentJob[]>(recentJobs);
  const [confidenceScores, setConfidenceScores] = useState<ConfidenceScore[]>([]);
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewingItem, setReviewingItem] = useState<ReviewItem | null>(null);
  const [slmReady, setSlmReady] = useState(false);
  const [toast, setToast] = useState("");

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

  const hasDocument = fileName.length > 0;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function showToast(message: string) {
    setToast(message);
  }

  async function handleFileSelect(file: File | null) {
    if (!file) return;

    const startedAt = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    setFileName(file.name);
    setFileSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);
    setUploadProgress(18);
    setSteps(nextStepState(initialSteps, 2));
    setOcrResultText("กำลังส่งไฟล์ไปยัง PaddleOCR GPU...");
    setWorkspaceTab("extraction");
    setSlmReady(false);
    setFields([]);
    setReviewItems([]);
    setConfidenceScores([]);
    setOverallConfidence(0);
    setJsonOutput(initialJson);
    setJobs([
      {
        id: `${Date.now()}`,
        fileName: file.name,
        type: selectedType,
        status: "processing",
        statusLabel: "กำลังประมวลผล OCR",
        startedAt,
        result: "-",
      },
    ]);
    showToast("เริ่มประมวลผล OCR ด้วย GPU");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);

    [42, 68, 86, 100].forEach((value, index) => {
      window.setTimeout(() => setUploadProgress(value), 160 * (index + 1));
    });

    try {
      const ocr = await runPaddleOcr(file, ocrLanguage);
      const text = ocr.text || "PaddleOCR ไม่พบข้อความในไฟล์นี้";
      setOcrResultText(text);
      setSteps(nextStepState(initialSteps, 4));
      setJobs((current) =>
        current.map((job) =>
          job.fileName === file.name ? { ...job, statusLabel: "กำลังวิเคราะห์ด้วย Qwen SLM", result: "Qwen GPU" } : job,
        ),
      );
      showToast("OCR สำเร็จ กำลังส่งต่อให้ Qwen SLM");

      const slm = await runSlmExtraction({
        documentTypeHint: selectedType,
        ocrText: text,
        ocrLines: ocr.lines,
      });

      setJsonOutput(slm.jsonOutput);
      setFields(slm.fields);
      setConfidenceScores(slm.confidenceScores);
      setOverallConfidence(slm.overallConfidence);
      setReviewItems(slm.reviewItems);
      setSlmReady(true);
      setSteps(nextStepState(initialSteps, 6));
      setJobs((current) =>
        current.map((job) =>
          job.fileName === file.name ? { ...job, status: "success", statusLabel: "SLM เสร็จสมบูรณ์", result: `${slm.overallConfidence}%` } : job,
        ),
      );
      showToast("Qwen SLM วิเคราะห์เอกสารสำเร็จ");
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถประมวลผลเอกสารได้";
      setOcrResultText((current) => current || `${ocrText}\n\n[ระบบสำรอง] ${message}`);
      setSteps(nextStepState(initialSteps, 3));
      setJobs((current) =>
        current.map((job) =>
          job.fileName === file.name ? { ...job, status: "error", statusLabel: "ประมวลผลไม่สำเร็จ", result: "-" } : job,
        ),
      );
      showToast(message);
    }
  }

  function handleResetDocument() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFileName("");
    setFileSize("");
    setPreviewUrl(null);
    setOcrResultText("");
    setUploadProgress(0);
    setSteps(initialSteps);
    setJsonOutput(initialJson);
    setFields([]);
    setJobs([]);
    setConfidenceScores([]);
    setOverallConfidence(0);
    setReviewItems([]);
    setSlmReady(false);
    showToast("รีเซ็ตเอกสารเรียบร้อย");
  }

  function handleStepClick(id: number) {
    if (!hasDocument) {
      showToast("กรุณาอัปโหลดเอกสารก่อน");
      return;
    }
    setSteps(nextStepState(steps, id));
    showToast(`เปลี่ยนไปขั้นตอน ${id}`);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("ไม่สามารถคัดลอกข้อความได้");
    }
  }

  function handleConfirmReview(item: ReviewItem, newValue: string) {
    setReviewItems((current) => current.map((review) => (review.id === item.id ? { ...review, slmValue: newValue, status: "resolved" } : review)));
    setFields((current) =>
      current.map((field) => (field.field === item.field ? { ...field, value: newValue, confidence: 100, status: "success" } : field)),
    );
    setJsonOutput((current) => ({
      ...current,
      [item.field]: Number.isNaN(Number(newValue)) ? newValue : Number(newValue),
    }));
    setReviewingItem(null);
    showToast(`ยืนยันค่า ${item.field} แล้ว`);
  }

  function handleUpdateJob(updatedJob: DocumentJob, updatedJson?: JsonSchemaOutput) {
    setJobs((current) => current.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
    if (updatedJson) {
      if (fileName === updatedJob.fileName) {
        setJsonOutput(updatedJson);
      }
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

  return (
    <div className="min-h-screen bg-page text-ink antialiased">
      <AppHeader user={userSession} onLogout={handleLogout} />
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-7">
          {/* Toggle View Mode for Admin */}
          {(userSession?.role.includes("Admin") || userSession?.username === "somchai.w") && (
            <div className="flex justify-end gap-2 bg-slate-100/80 border border-line p-1.5 rounded-2xl self-end shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("user")}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  viewMode === "user" ? "bg-white text-navy shadow-sm border border-line" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                มุมมองเจ้าหน้าที่ (User Panel)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("admin")}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  viewMode === "admin" ? "bg-navy text-white shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                มุมมองผู้ดูแลระบบ (Admin Panel)
              </button>
            </div>
          )}

          {viewMode === "admin" ? (
            <AdminDashboard jobs={jobs} onUpdateJob={handleUpdateJob} showToast={showToast} />
          ) : (
            <>
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
                      อัปโหลดเอกสารเพื่อ OCR ด้วย PaddleOCR บน GPU แล้วส่งข้อความให้ Qwen SLM วิเคราะห์เป็น JSON Schema, Confidence และ Manual Review
                    </p>
                  </div>

                  {hasDocument ? (
                    <button
                      type="button"
                      onClick={handleResetDocument}
                      className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <RefreshCw className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      รีเซ็ตเอกสาร
                    </button>
                  ) : null}
                </div>
              </section>

              {hasDocument ? <WorkflowStepper steps={steps} onStepClick={handleStepClick} /> : null}

              {!hasDocument ? (
                <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(380px,500px)_1fr]">
                  <section className="min-w-0 rounded-2xl border border-line bg-white p-6 shadow-panel">
                    <DocumentUploader
                      fileName={fileName}
                      fileSize={fileSize}
                      progress={uploadProgress}
                      language={ocrLanguage}
                      onLanguageChange={setOcrLanguage}
                      onFileSelect={handleFileSelect}
                    />
                  </section>
                  <AwaitingDocumentState />
                </div>
              ) : (
                <>
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-300">
                            <BrainCircuit className="h-3.5 w-3.5" />
                            {slmReady ? "SLM พร้อมใช้งาน" : "รอผล SLM"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">ขนาด: {fileSize} · GPU pipeline: PaddleOCR + Qwen2.5</p>
                      </div>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-300 bg-white px-3.5 py-2 text-xs font-extrabold text-primary transition hover:bg-blue-50">
                      <UploadCloud className="h-4 w-4" />
                      เปลี่ยนไฟล์เอกสาร
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => handleFileSelect(event.target.files?.item(0) ?? null)} />
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
                          <TabButton active={workspaceTab === "analysis"} label="Confidence & Review" onClick={() => setWorkspaceTab("analysis")} />
                          <TabButton active={workspaceTab === "all"} label="ทั้งหมด" onClick={() => setWorkspaceTab("all")} />
                        </div>
                        <span className="hidden text-xs font-bold text-slate-500 sm:inline">
                          Confidence: <b className="text-primary">{overallConfidence}%</b>
                        </span>
                      </div>

                      {workspaceTab === "extraction" ? (
                        <div className="grid gap-6 xl:grid-cols-2">
                          <OCRResultPanel text={ocrResultText} onCopy={() => copyText(ocrResultText, "คัดลอก OCR Text แล้ว")} />
                          {slmReady ? (
                            <JSONOutputPanel json={jsonOutput} onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON แล้ว")} onDownload={() => createJsonDownload(jsonOutput)} />
                          ) : (
                            <SlmWaitingCard title="JSON Schema Output" />
                          )}
                        </div>
                      ) : null}

                      {workspaceTab === "analysis" ? (
                        <div className="grid gap-6 xl:grid-cols-2">
                          {slmReady ? <ConfidenceCard overall={overallConfidence} scores={confidenceScores} /> : <SlmWaitingCard title="ความมั่นใจ / Confidence" />}
                          {slmReady ? <ManualReviewCard items={reviewItems} onReview={setReviewingItem} /> : <SlmWaitingCard title="ต้องตรวจสอบโดยมนุษย์ (Review Required)" />}
                        </div>
                      ) : null}

                      {workspaceTab === "all" ? (
                        <div className="grid gap-6 xl:grid-cols-2">
                          <OCRResultPanel text={ocrResultText} onCopy={() => copyText(ocrResultText, "คัดลอก OCR Text แล้ว")} />
                          {slmReady ? (
                            <JSONOutputPanel json={jsonOutput} onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON แล้ว")} onDownload={() => createJsonDownload(jsonOutput)} />
                          ) : (
                            <SlmWaitingCard title="JSON Schema Output" />
                          )}
                          {slmReady ? <ConfidenceCard overall={overallConfidence} scores={confidenceScores} /> : <SlmWaitingCard title="ความมั่นใจ / Confidence" />}
                          {slmReady ? <ManualReviewCard items={reviewItems} onReview={setReviewingItem} /> : <SlmWaitingCard title="ต้องตรวจสอบโดยมนุษย์ (Review Required)" />}
                        </div>
                      ) : null}
                    </section>
                  </div>

                  <section className="grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.85fr)]">
                    <ExtractedFieldsTable fields={fields} selectedType={selectedType} onTypeChange={setSelectedType} />
                    <RecentJobsTable jobs={jobs} />
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>

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
