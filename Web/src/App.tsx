import {
  BrainCircuit,
  CheckCircle2,
  FileSearch,
  FileText,
  LayoutGrid,
  RefreshCw,
  ScanText,
  Search,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ConfidenceCard } from "./components/ConfidenceCard";
import { DocumentPreview } from "./components/DocumentPreview";
import { DocumentUploader } from "./components/DocumentUploader";
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable";
import { JSONOutputPanel } from "./components/JSONOutputPanel";
import { ManualReviewCard } from "./components/ManualReviewCard";
import { ManualReviewModal } from "./components/ManualReviewModal";
import { OCRResultPanel } from "./components/OCRResultPanel";
import { RecentJobsTable } from "./components/RecentJobsTable";
import { Toast } from "./components/Toast";
import { WorkflowStepper } from "./components/WorkflowStepper";
import {
  confidenceScores as initialConfidenceScores,
  initialJson,
  initialReviewItems,
  initialSteps,
  ocrText,
} from "./data/mockData";
import { createJsonDownload, nextStepState } from "./services/mockProcessingService";
import { runPaddleOcr, type OcrLanguage } from "./services/ocrApi";
import type { DocumentJob, DocumentType, ExtractedField, JsonSchemaOutput, ReviewItem } from "./types";

type WorkspaceTab = "extraction" | "analysis" | "all";

export function App() {
  const [steps, setSteps] = useState(initialSteps);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResultText, setOcrResultText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("th");
  const [selectedType, setSelectedType] = useState<DocumentType>("Invoice");

  // Tab state for workspace to avoid cramped screens
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("extraction");

  // Rich data states
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [jobs, setJobs] = useState<DocumentJob[]>([]);
  const [jsonOutput, setJsonOutput] = useState<JsonSchemaOutput>(initialJson);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(initialReviewItems);
  const [activeReviewModalItem, setActiveReviewModalItem] = useState<ReviewItem | null>(null);
  const [toast, setToast] = useState("");

  // Mode: Allow toggle between mock SLM extraction and SLM Waiting mode
  const [useSlmMockData, setUseSlmMockData] = useState(false);

  const hasDocument = fileName.length > 0;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2500);
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

  // Calculate overall confidence score
  const overallConfidence = Math.round(
    fields.reduce((acc, curr) => acc + curr.confidence, 0) / (fields.length || 1)
  );

  // Handle uploading real file
  async function handleFileSelect(file: File | null) {
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);
    setUploadProgress(18);
    setSteps(nextStepState(initialSteps, 2));
    setFields([]);
    setJobs([
      {
        id: `${Date.now()}`,
        fileName: file.name,
        type: selectedType,
        status: "processing",
        statusLabel: "กำลังประมวลผล OCR",
        startedAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        result: "-",
      },
    ]);
    setOcrResultText("กำลังส่งไฟล์ไปยัง PaddleOCR Backend...");
    showToast("เริ่มการประมวลผลไฟล์เอกสาร");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);

    [42, 68, 86, 100].forEach((value, index) => {
      window.setTimeout(() => setUploadProgress(value), 160 * (index + 1));
    });

    try {
      const result = await runPaddleOcr(file, ocrLanguage);
      setOcrResultText(result.text || "PaddleOCR ไม่พบข้อความในไฟล์นี้");
      setSteps(nextStepState(initialSteps, 4));
      setJobs((current) =>
        current.map((job) =>
          job.fileName === file.name ? { ...job, status: "success", statusLabel: "OCR เสร็จสมบูรณ์", result: "รอ SLM" } : job,
        ),
      );
      showToast("PaddleOCR อ่านเอกสารสำเร็จเรียบร้อย");
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อ PaddleOCR backend ได้";
      setOcrResultText(`${ocrText}\n\n[ระบบสำรอง] ใช้ผลลัพธ์จำลองชั่วคราว: ${message}`);
      showToast("ใช้งาน OCR แบบจำลองเนื่องจาก PaddleOCR Backend ยังไม่เปิด");
      setSteps(nextStepState(initialSteps, 3));
      setJobs((current) =>
        current.map((job) =>
          job.fileName === file.name ? { ...job, status: "error", statusLabel: "OCR ไม่สำเร็จ", result: "-" } : job,
        ),
      );
    }
  }

  // Trigger sample document for quick 1-click preview
  function handleLoadSampleDocument() {
    setFileName("Invoice_INV-2024-001.pdf");
    setFileSize("1.25 MB");
    setUploadProgress(100);
    setPreviewUrl(null);
    setOcrResultText(ocrText);
    setSteps(nextStepState(initialSteps, 4));
    setFields([]);
    setJobs([
      {
        id: `${Date.now()}`,
        fileName: "Invoice_INV-2024-001.pdf",
        type: selectedType,
        status: "processing",
        statusLabel: "รอข้อมูลจริง",
        startedAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        result: "รอ SLM",
      },
    ]);
    setJsonOutput(initialJson);
    setReviewItems(initialReviewItems);
    showToast("โหลดเอกสารตัวอย่าง INV-2024-001 สำเร็จ");
  }

  // Reset to initial state
  function handleResetDocument() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFileName("");
    setFileSize("");
    setPreviewUrl(null);
    setOcrResultText("");
    setUploadProgress(0);
    setSteps(initialSteps);
    setFields([]);
    setJobs([]);
    showToast("รีเซ็ตสถานะหน้าจอเรียบร้อย");
  }

  function handleStepClick(id: number) {
    if (!hasDocument) {
      showToast("กรุณาอัปโหลดเอกสารหรือโหลดตัวอย่างก่อน");
      return;
    }
    setSteps(nextStepState(steps, id));
    showToast(`เปลี่ยนมุมมองไปยังขั้นตอนที่ ${id}`);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("ไม่สามารถคัดลอกข้อความได้");
    }
  }

  // Handle Manual Review Modal Confirmation
  function handleConfirmReview(item: ReviewItem, newValue: string) {
    setReviewItems((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, slmValue: newValue, status: "resolved" } : r))
    );

    // Also update fields table
    setFields((prev) =>
      prev.map((f) =>
        f.field === item.field
          ? { ...f, value: newValue, confidence: 100, status: "success" }
          : f
      )
    );

    // Update JSON schema output
    setJsonOutput((prev) => ({
      ...prev,
      [item.field]: isNaN(Number(newValue)) ? newValue : Number(newValue),
    }));

    setActiveReviewModalItem(null);
    showToast(`ยืนยันการแก้ไขฟิลด์ ${item.field} เป็น "${newValue}" เรียบร้อย`);
  }

  return (
    <div className="min-h-screen bg-page text-ink antialiased">
      {/* Top Application Header */}
      <AppHeader />

      {/* Main Container */}
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-7">

          {/* Section 1: Dashboard Context Banner & Control Bar */}
          <section className="rounded-2xl border border-line bg-white p-6 shadow-panel lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-black uppercase text-primary">
                    LogiAI Docs to JSON
                  </span>
                  <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-bold text-success border border-green-200">
                    Engine: PaddleOCR v3.8
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-navy lg:text-3xl">
                  ระบบแปลงเอกสารโลจิสติกส์เป็น JSON Schema
                </h1>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                  อัปโหลดเอกสารเพื่ออ่านด้วย PaddleOCR วิเคราะห์ด้วย SLM และสร้างโครงสร้าง JSON สำหรับระบบโลจิสติกส์
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                {!hasDocument ? (
                  <button
                    type="button"
                    onClick={handleLoadSampleDocument}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-md hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    ลองใช้เอกสารตัวอย่าง (Sample Invoice)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => createJsonDownload(jsonOutput)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      ดาวน์โหลด JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDocument}
                      className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition"
                    >
                      <RefreshCw className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      รีเซ็ตเอกสาร
                    </button>
                  </>
                )}

                {/* Toggle SLM Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setUseSlmMockData(!useSlmMockData);
                    showToast(useSlmMockData ? "เปลี่ยนเป็นมุมมองรอ SLM Backend" : "เปิดโหมดประมวลผล SLM จำลอง");
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                    useSlmMockData
                      ? "border-blue-300 bg-blue-50 text-navy"
                      : "border-amber-300 bg-amber-50 text-amber-800"
                  }`}
                >
                  <BrainCircuit className="h-4 w-4" />
                  {useSlmMockData ? "โหมด: SLM Output" : "โหมด: รอ SLM"}
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Progress Stepper */}
          {hasDocument ? <WorkflowStepper steps={steps} onStepClick={handleStepClick} /> : null}

          {/* Section 3: Main Workspace */}
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
              <AwaitingDocumentState onLoadSample={handleLoadSampleDocument} />
            </div>
          ) : (
            <>
              {/* Loaded State: Active Document Information Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/70 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white font-extrabold">
                    {fileName.endsWith(".pdf") ? "PDF" : "IMG"}
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-extrabold text-navy text-base">{fileName}</p>
                      {uploadProgress < 100 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-primary animate-pulse-slow">
                          <Search className="h-3 w-3 animate-bounce-slight" />
                          กำลังสแกน... {uploadProgress}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-success ring-1 ring-green-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          อ่านผล OCR เรียบร้อย
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">ขนาด: {fileSize} · เครื่องมือ: PaddleOCR + SLM Pipeline</p>
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-300 bg-white px-3.5 py-2 text-xs font-extrabold text-primary hover:bg-blue-50 transition">
                  <UploadCloud className="h-4 w-4" />
                  เปลี่ยนไฟล์เอกสาร
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(e) => handleFileSelect(e.target.files?.item(0) ?? null)}
                  />
                </label>
              </div>

              {/* Spacious 2-Column Workspace Grid */}
              <div className="grid min-w-0 gap-8 lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
                
                {/* Left Side: Document Preview (Full Height & Breathing Room) */}
                <section className="flex flex-col min-w-0 rounded-2xl border border-line bg-white p-6 shadow-panel">
                  <DocumentPreview
                    previewUrl={previewUrl}
                    previewName={fileName}
                    progress={uploadProgress}
                    onToast={showToast}
                  />
                </section>

                {/* Right Side: Tabbed Workspace to Eliminate Cramped Grid */}
                <section className="flex flex-col min-w-0 rounded-2xl border border-line bg-white p-6 shadow-panel">
                  
                  {/* Workspace Tab Header */}
                  <div className="mb-6 flex flex-wrap items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-2">
                      <TabButton
                        active={workspaceTab === "extraction"}
                        icon={<ScanText className="h-4 w-4" />}
                        label="ผลลัพธ์ข้อมูล (JSON & OCR)"
                        onClick={() => setWorkspaceTab("extraction")}
                      />
                      <TabButton
                        active={workspaceTab === "analysis"}
                        icon={<BrainCircuit className="h-4 w-4" />}
                        label="วิเคราะห์ & ทวนสอบ (Review)"
                        onClick={() => setWorkspaceTab("analysis")}
                      />
                      <TabButton
                        active={workspaceTab === "all"}
                        icon={<LayoutGrid className="h-4 w-4" />}
                        label="แสดงทั้งหมด (Full View)"
                        onClick={() => setWorkspaceTab("all")}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                      ความมั่นใจเฉลี่ย: <b className="text-primary">{overallConfidence}%</b>
                    </span>
                  </div>

                  {/* Tab Contents with High Vertical Heights & Air */}
                  {workspaceTab === "extraction" && (
                    <div className="grid gap-6 xl:grid-cols-2">
                      <OCRResultPanel
                        text={ocrResultText}
                        onCopy={() => copyText(ocrResultText, "คัดลอกข้อความ OCR สำเร็จ")}
                      />
                      {useSlmMockData ? (
                        <JSONOutputPanel
                          json={jsonOutput}
                          onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON สำเร็จ")}
                          onDownload={() => createJsonDownload(jsonOutput)}
                        />
                      ) : (
                        <SlmWaitingCard title="JSON Schema Output" />
                      )}
                    </div>
                  )}

                  {workspaceTab === "analysis" && (
                    <div className="grid gap-6 xl:grid-cols-2">
                      {useSlmMockData ? (
                        <ConfidenceCard overall={overallConfidence} scores={initialConfidenceScores} />
                      ) : (
                        <SlmWaitingCard title="ความมั่นใจ / Confidence" />
                      )}
                      {useSlmMockData ? (
                        <ManualReviewCard
                          items={reviewItems}
                          onReview={(item) => setActiveReviewModalItem(item)}
                        />
                      ) : (
                        <SlmWaitingCard title="ต้องตรวจสอบโดยมนุษย์ (Review Required)" />
                      )}
                    </div>
                  )}

                  {workspaceTab === "all" && (
                    <div className="grid gap-6 xl:grid-cols-2">
                      <OCRResultPanel
                        text={ocrResultText}
                        onCopy={() => copyText(ocrResultText, "คัดลอกข้อความ OCR สำเร็จ")}
                      />
                      {useSlmMockData ? (
                        <JSONOutputPanel
                          json={jsonOutput}
                          onCopy={() => copyText(JSON.stringify(jsonOutput, null, 2), "คัดลอก JSON สำเร็จ")}
                          onDownload={() => createJsonDownload(jsonOutput)}
                        />
                      ) : (
                        <SlmWaitingCard title="JSON Schema Output" />
                      )}
                      {useSlmMockData ? (
                        <ConfidenceCard overall={overallConfidence} scores={initialConfidenceScores} />
                      ) : (
                        <SlmWaitingCard title="ความมั่นใจ / Confidence" />
                      )}
                      {useSlmMockData ? (
                        <ManualReviewCard
                          items={reviewItems}
                          onReview={(item) => setActiveReviewModalItem(item)}
                        />
                      ) : (
                        <SlmWaitingCard title="ต้องตรวจสอบโดยมนุษย์ (Review Required)" />
                      )}
                    </div>
                  )}

                </section>
              </div>

              {/* Section 4: Data Tables (Extracted Fields & Recent Jobs) */}
              <section className="grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.85fr)]">
                <ExtractedFieldsTable
                  fields={fields}
                  selectedType={selectedType}
                  onTypeChange={setSelectedType}
                />
                <RecentJobsTable jobs={jobs} />
              </section>
            </>
          )}

        </div>
      </main>

      {/* Manual Review Modal Dialog */}
      {activeReviewModalItem ? (
        <ManualReviewModal
          item={activeReviewModalItem}
          onCancel={() => setActiveReviewModalItem(null)}
          onConfirm={handleConfirmReview}
        />
      ) : null}

      {/* Non-intrusive Toast */}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
        active
          ? "bg-navy text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* Empty State component when waiting for document upload */
function AwaitingDocumentState({ onLoadSample }: { onLoadSample: () => void }) {
  return (
    <section className="grid min-h-[420px] place-items-center rounded-2xl border-2 border-dashed border-blue-200 bg-white p-8 text-center shadow-panel">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-primary">
          <FileSearch className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-navy">พร้อมรับเอกสารสำหรับประมวลผล</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          กรุณาเลือกไฟล์ PDF, JPG หรือ PNG จากเครื่อง หรือลากมาวางในช่องอัปโหลด เพื่อให้ระบบเริ่มสกัดข้อมูลด้วย PaddleOCR และ SLM
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-5 py-3 text-sm font-extrabold text-primary hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            ทดลองใช้เอกสารตัวอย่าง (Sample Invoice)
          </button>
        </div>
      </div>
    </section>
  );
}

/* Placeholder component when SLM model is in offline state */
function SlmWaitingCard({ title }: { title: string }) {
  return (
    <section className="grid min-h-[300px] min-w-0 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center shadow-panel">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-200 text-slate-600">
          <BrainCircuit className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-extrabold text-navy">{title}</h2>
        <p className="mt-2 text-xs font-bold text-slate-500">รอการเชื่อมต่อกับ SLM Backend</p>
      </div>
    </section>
  );
}
