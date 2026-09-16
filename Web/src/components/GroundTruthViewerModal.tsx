import {
  AlertCircle,
  Award,
  BookmarkCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileCheck2,
  FileCode,
  FileText,
  FolderOpen,
  Hash,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Table,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/apiClient";

interface GroundTruthViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroundTruthDoc {
  id: string;
  file_name: string;
  category: string;
  annotated_at?: string;
  status?: string;
  ground_truth: Record<string, any>;
}

interface KFoldReport {
  method: string;
  dataset: string;
  total_documents: number;
  k_splits: number;
  prompt_config?: {
    source: string;
    snapshot: {
      system_prompt: string;
      fallback_rules: string[];
      confidence_threshold: number;
      selected_model: string;
      monitored_fields: string[];
    };
  };
  metrics_summary: {
    mean_accuracy_pct: number;
    accuracy_std_dev: number;
    accuracy_display: string;
    mean_f1_score_pct: number;
    f1_std_dev: number;
    f1_display: string;
    mean_similarity_pct: number;
    similarity_std_dev: number;
    similarity_display: string;
  };
  field_performance: Record<
    string,
    {
      mean_accuracy_pct: number;
      std_dev: number;
      display: string;
      scores_per_fold: number[];
    }
  >;
  folds: Array<{
    fold: number;
    val_samples_count: number;
    overall_accuracy_pct: number;
    precision_pct: number;
    recall_pct: number;
    f1_score_pct: number;
    field_accuracies: Record<string, number>;
  }>;
}

const FIELD_LABELS: Record<string, string> = {
  document_type: "1. ประเภทเอกสาร (document_type)",
  document_number: "2. เลขที่เอกสาร (document_number)",
  document_date: "3. วันที่เอกสาร (document_date)",
  sender: "4. ผู้ส่ง / ผู้ขาย (sender)",
  receiver: "5. ผู้รับ / ผู้ซื้อ (receiver)",
  origin: "6. ต้นทาง (origin)",
  destination: "7. ปลายทาง (destination)",
  reference_number: "8. เลขที่อ้างอิง (reference_number)",
  unit_price: "9. ราคาต่อหน่วย (unit_price)",
  total_amount: "10. มูลค่ารวม (total_amount)",
  currency: "11. สกุลเงิน (currency)",
};

export function GroundTruthViewerModal({ isOpen, onClose }: GroundTruthViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"dataset" | "kfold">("dataset");
  const [documents, setDocuments] = useState<GroundTruthDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GroundTruthDoc | null>(null);
  const [kfoldReport, setKfoldReport] = useState<KFoldReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRerunningKFold, setIsRerunningKFold] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedDocJson, setCopiedDocJson] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Handle ESC key to close modal (matching Firebase Modal UX)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch Ground Truth Dataset
      const gtResp = await apiFetch(`/api/benchmark/ground-truth`);
      if (gtResp.ok) {
        const data = await gtResp.json();
        const docs: GroundTruthDoc[] = data.documents || [];
        setDocuments(docs);
        if (docs.length > 0 && !selectedDoc) {
          setSelectedDoc(docs[0]);
        }
      }

      // 2. Fetch K-Fold Report
      const kfResp = await apiFetch(`/api/benchmark/kfold`);
      if (kfResp.ok) {
        const kfData = await kfResp.json();
        setKfoldReport(kfData);
      }
    } catch (err) {
      console.error("Failed to fetch benchmark data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRerunKFold() {
    setIsRerunningKFold(true);
    try {
      const resp = await apiFetch(`/api/benchmark/kfold?rerun=true`);
      if (resp.ok) {
        const data = await resp.json();
        setKfoldReport(data);
      }
    } catch (err) {
      console.error("Failed to rerun K-Fold:", err);
    } finally {
      setIsRerunningKFold(false);
    }
  }

  function handleDownloadDataset() {
    const jsonStr = JSON.stringify(
      {
        description: "LogiSchema Benchmark Ground Truth Dataset (11 Core Fields)",
        total_documents: documents.length,
        exported_at: new Date().toISOString(),
        documents,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ground_truth_dataset.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadSingleDoc(doc: GroundTruthDoc) {
    const jsonStr = JSON.stringify(doc, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.id}_ground_truth.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopySingleDoc(doc: GroundTruthDoc) {
    navigator.clipboard.writeText(JSON.stringify(doc.ground_truth, null, 2));
    setCopiedDocJson(true);
    setTimeout(() => setCopiedDocJson(false), 2000);
  }

  function handleCopyThesisTable() {
    if (!kfoldReport) return;
    const lines: string[] = [];
    lines.push(`### ตารางผลการทดสอบ ${kfoldReport.k_splits}-Fold Cross-Validation ของระบบ LogiSchema`);
    lines.push(`*การประเมินความแม่นยำในการแปลงเอกสารโลจิสติกส์สู่ 11 ฟิลด์มาตรฐาน (ชุดข้อมูล N=${kfoldReport.total_documents} ฉบับ)*\n`);

    const header =
      `| ฟิลด์ข้อมูล (Core Fields) | ` +
      kfoldReport.folds.map((f) => `Fold ${f.fold} (%)`).join(" | ") +
      ` | ค่าเฉลี่ยรวม (Mean ± Std) |`;
    const sep = `| :--- | ` + kfoldReport.folds.map(() => `:---:`).join(" | ") + ` | :---: |`;
    lines.push(header);
    lines.push(sep);

    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      const perf = kfoldReport.field_performance[key];
      if (perf) {
        const scores = perf.scores_per_fold.map((s) => `${s.toFixed(1)}%`).join(" | ");
        lines.push(`| ${label} | ${scores} | **${perf.display}** |`);
      }
    }

    const foldAccs = kfoldReport.folds.map((f) => `**${f.overall_accuracy_pct.toFixed(1)}%**`).join(" | ");
    lines.push(`| **ความแม่นยำภาพรวม (Overall Accuracy)** | ${foldAccs} | **${kfoldReport.metrics_summary.accuracy_display}** |`);

    const foldF1s = kfoldReport.folds.map((f) => `${f.f1_score_pct.toFixed(1)}%`).join(" | ");
    lines.push(`| **F1-Score รวม (Overall F1-Score)** | ${foldF1s} | **${kfoldReport.metrics_summary.f1_display}** |`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        d.file_name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.ground_truth.sender && String(d.ground_truth.sender).toLowerCase().includes(q)) ||
        (d.ground_truth.receiver && String(d.ground_truth.receiver).toLowerCase().includes(q)) ||
        (d.ground_truth.document_number && String(d.ground_truth.document_number).toLowerCase().includes(q));

      const matchCat = filterCategory === "all" || d.category === filterCategory;
      return matchQuery && matchCat;
    });
  }, [documents, searchQuery, filterCategory]);

  if (!isOpen) return null;

  const gt = selectedDoc?.ground_truth || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-fadeIn">
      {/* Modal Shell Container: Pure Clean White Theme Matching Firebase */}
      <div className="flex h-[92vh] max-h-[880px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* ================================================================= */}
        {/* 1. TOP HEADER (Pure White, Crisp, Professional)                   */}
        {/* ================================================================= */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  คลังข้อมูลเฉลย Ground Truth & K-Fold Benchmark
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  {documents.length} เอกสารมาตรฐาน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ชุดข้อมูล 11 ฟิลด์มาตรฐานที่ผ่านการตรวจยืนยัน สำหรับประเมินผลความแม่นยำในเล่มวิทยานิพนธ์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Dataset Button */}
            <button
              type="button"
              onClick={handleDownloadDataset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
              title="ดาวน์โหลดไฟล์ JSON Ground Truth Dataset ทั้งหมด"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">ดาวน์โหลด Dataset</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`}
              />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="ปิดหน้าต่าง (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* NAVIGATION TABS (Clean White Theme)                               */}
        {/* ================================================================= */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("dataset")}
              className={`flex items-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === "dataset"
                  ? "border-blue-600 text-blue-700 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-900 font-semibold"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>1. รายการเอกสาร Ground Truth ({documents.length} ฉบับ)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kfold")}
              className={`flex items-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === "kfold"
                  ? "border-blue-600 text-blue-700 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-900 font-semibold"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>2. รายงานผล 5-Fold Cross-Validation (บทที่ 4)</span>
            </button>
          </div>

          {activeTab === "kfold" && (
            <div className="flex items-center gap-2 py-2">
              <button
                type="button"
                onClick={handleCopyThesisTable}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                title="คัดลอกตาราง Markdown สำหรับใช้ในเล่มวิทยานิพนธ์"
              >
                {copySuccess ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copySuccess ? "คัดลอกสำเร็จ!" : "คัดลอกตาราง Markdown"}</span>
              </button>

              <button
                type="button"
                onClick={handleRerunKFold}
                disabled={isRerunningKFold}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRerunningKFold ? "animate-spin" : ""}`} />
                <span>{isRerunningKFold ? "กำลังคำนวณ..." : "รัน K-Fold ใหม่"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: DATASET 2-COLUMN INSPECTOR                                 */}
        {/* ================================================================= */}
        {activeTab === "dataset" && (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden bg-white">
            {/* =============================================================== */}
            {/* LEFT COLUMN: Search & Document List                             */}
            {/* =============================================================== */}
            <div className="flex flex-col min-h-0 h-full overflow-hidden border-r border-slate-200 bg-slate-50/50">
              {/* Search Header */}
              <div className="flex-shrink-0 border-b border-slate-200 bg-white p-3.5 space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อไฟล์, เลขที่, บริษัท..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Category Chips */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterCategory("all")}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                        filterCategory === "all"
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      ทั้งหมด ({documents.length})
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterCategory(cat)}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase transition ${
                          filterCategory === cat
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        {cat.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Document List (Scrollable) */}
              <div
                className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 overscroll-contain"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
              >
                {loading ? (
                  <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">กำลังโหลดข้อมูล Ground Truth...</span>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-slate-400">
                    <FolderOpen className="h-10 w-10 stroke-[1.4] text-slate-300 mb-1" />
                    <p className="text-xs font-bold text-slate-700">ไม่พบเอกสาร</p>
                    <p className="text-[11px] text-slate-500 max-w-[220px] mt-0.5">
                      ลองค้นหาด้วยคำค้นหาอื่น
                    </p>
                  </div>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const docGt = doc.ground_truth || {};
                    const party = docGt.sender || docGt.receiver || "-";
                    const totalVal =
                      docGt.total_amount !== undefined &&
                      docGt.total_amount !== null &&
                      String(docGt.total_amount) !== ""
                        ? `${docGt.currency || "THB"} ${Number(docGt.total_amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}`
                        : "-";

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all select-none ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/30"
                            : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-slate-50/60 hover:shadow-2xs"
                        }`}
                      >
                        {/* Doc Icon Thumbnail */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>

                        {/* Content Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-black text-blue-700">
                              {doc.id}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                              {doc.category || docGt.document_type || "document"}
                            </span>
                          </div>

                          <p
                            className="mt-0.5 truncate text-xs font-bold text-slate-900"
                            title={doc.file_name}
                          >
                            {doc.file_name}
                          </p>

                          <p className="truncate text-[11px] text-slate-500 font-normal">
                            {party}
                          </p>

                          {/* Bottom Badges */}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Verified</span>
                            </span>

                            {docGt.document_number && (
                              <span className="rounded-md bg-slate-50 border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 truncate max-w-[100px]">
                                #{docGt.document_number}
                              </span>
                            )}

                            <span className="font-mono text-[11px] font-bold text-emerald-600 ml-auto">
                              {totalVal}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* =============================================================== */}
            {/* RIGHT COLUMN: 11 Core Standard Fields & JSON Payload Inspector */}
            {/* =============================================================== */}
            <div
              className="flex flex-col min-h-0 h-full overflow-y-auto p-5 sm:p-6 bg-white overscroll-contain"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
            >
              {selectedDoc ? (
                <div className="space-y-6">
                  {/* Selected Document Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900">
                          {selectedDoc.file_name}
                        </h4>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Human-Verified Ground Truth
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                        <span>
                          ID:{" "}
                          <code className="font-mono text-[11.5px] font-bold text-slate-700">
                            {selectedDoc.id}
                          </code>
                        </span>
                        <span>•</span>
                        <span>
                          หมวดหมู่:{" "}
                          <b className="text-slate-800 capitalize font-bold">
                            {selectedDoc.category || gt.document_type || "-"}
                          </b>
                        </span>
                        {selectedDoc.annotated_at && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">
                              บันทึกเมื่อ: {selectedDoc.annotated_at}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopySingleDoc(selectedDoc)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
                      >
                        {copiedDocJson ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedDocJson ? "คัดลอกสำเร็จ!" : "คัดลอก JSON"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSingleDoc(selectedDoc)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>ดาวน์โหลดไฟล์</span>
                      </button>
                    </div>
                  </div>

                  {/* 11 Core Standard Fields Card Grid (Matching Firebase UI) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        <span>ข้อมูล 11 ฟิลด์มาตรฐานเฉลยจริง (11 Core Logistics Ground Truth)</span>
                      </p>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        11 ฟิลด์หลัก
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* 1. Document Type */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <Tag className="h-3 w-3 text-blue-500" />
                          <span>1. Document Type</span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 capitalize truncate" title={gt.document_type}>
                          {gt.document_type || "-"}
                        </p>
                      </div>

                      {/* 2. Document Number */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <Hash className="h-3 w-3 text-indigo-500" />
                          <span>2. Document No.</span>
                        </div>
                        <p className="font-mono font-bold text-xs text-slate-900 truncate" title={gt.document_number}>
                          {gt.document_number || "-"}
                        </p>
                      </div>

                      {/* 3. Document Date */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <Calendar className="h-3 w-3 text-sky-500" />
                          <span>3. Document Date</span>
                        </div>
                        <p className="font-mono font-bold text-xs text-slate-900 truncate" title={gt.document_date}>
                          {gt.document_date || "-"}
                        </p>
                      </div>

                      {/* 4. Sender */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <Building2 className="h-3 w-3 text-amber-500" />
                          <span>4. ผู้ส่ง (Sender)</span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 truncate" title={gt.sender}>
                          {gt.sender || "-"}
                        </p>
                      </div>

                      {/* 5. Receiver */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <Building2 className="h-3 w-3 text-cyan-500" />
                          <span>5. ผู้รับ (Receiver)</span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 truncate" title={gt.receiver}>
                          {gt.receiver || "-"}
                        </p>
                      </div>

                      {/* 6. Origin */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <MapPin className="h-3 w-3 text-emerald-500" />
                          <span>6. ต้นทาง (Origin)</span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 truncate" title={gt.origin}>
                          {gt.origin || "-"}
                        </p>
                      </div>

                      {/* 7. Destination */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <MapPin className="h-3 w-3 text-rose-500" />
                          <span>7. ปลายทาง (Dest)</span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 truncate" title={gt.destination}>
                          {gt.destination || "-"}
                        </p>
                      </div>

                      {/* 8. Reference Number */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <FileText className="h-3 w-3 text-purple-500" />
                          <span>8. เลขที่อ้างอิง (Ref No.)</span>
                        </div>
                        <p className="font-mono font-bold text-xs text-slate-900 truncate" title={gt.reference_number}>
                          {gt.reference_number || "-"}
                        </p>
                      </div>

                      {/* 9. Unit Price */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <DollarSign className="h-3 w-3 text-teal-500" />
                          <span>9. ราคาต่อหน่วย (Unit)</span>
                        </div>
                        <p className="font-mono font-bold text-xs text-slate-900 truncate">
                          {gt.unit_price !== undefined && gt.unit_price !== null && String(gt.unit_price) !== ""
                            ? `${gt.currency || "THB"} ${Number(gt.unit_price).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}`
                            : "-"}
                        </p>
                      </div>

                      {/* 10. Currency */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase text-slate-400 mb-1">
                          <DollarSign className="h-3 w-3 text-blue-500" />
                          <span>11. สกุลเงิน (Currency)</span>
                        </div>
                        <p className="font-mono font-bold text-xs text-slate-900">
                          {gt.currency || "THB"}
                        </p>
                      </div>

                      {/* 11. Total Amount Hero Highlight */}
                      <div className="col-span-2 sm:col-span-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-4 shadow-2xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-xs font-bold uppercase text-emerald-800">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>10. ยอดเงินรวมสุทธิ (Total Amount)</span>
                          </div>
                          <p className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                            {gt.total_amount !== undefined &&
                            gt.total_amount !== null &&
                            String(gt.total_amount) !== ""
                              ? `${gt.currency || "THB"} ${Number(gt.total_amount).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}`
                              : "-"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold uppercase text-slate-400">สถานะข้อมูล</span>
                          <p className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> ตรวจยืนยันแล้ว
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* JSON Schema Payload Viewer (Clean White Theme with Syntax) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCode className="h-4 w-4 text-blue-600" />
                        <span>JSON Ground Truth Payload (11 Core Fields)</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopySingleDoc(selectedDoc)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                      >
                        {copiedDocJson ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedDocJson ? "คัดลอกสำเร็จ!" : "คัดลอก JSON"}</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-mono text-[11px] font-bold text-slate-600">
                            {selectedDoc.id}.json
                          </span>
                          <span className="rounded bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-slate-600">
                            UTF-8
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {JSON.stringify(selectedDoc.ground_truth, null, 2).split("\n").length} บรรทัด
                        </span>
                      </div>
                      <div
                        className="max-h-[260px] min-h-[140px] overflow-auto overscroll-contain bg-white"
                        style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
                      >
                        <JsonSyntaxHighlighter json={selectedDoc.ground_truth} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center text-slate-400 text-sm font-bold">
                  เลือกเอกสารทางซ้ายเพื่อดูค่าเฉลย Ground Truth
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: 5-FOLD BENCHMARK REPORT (Clean Light Theme)                */}
        {/* ================================================================= */}
        {activeTab === "kfold" && (
          <div
            className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-slate-50/50 overscroll-contain"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
          >
            {kfoldReport ? (
              <>
                {/* Hero Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">ความแม่นยำภาพรวม (Overall Accuracy)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        {kfoldReport.metrics_summary.accuracy_display}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">ค่าเฉลี่ย 5 รอบ ± ส่วนเบี่ยงเบนมาตรฐาน</span>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">คะแนน F1-Score เฉลี่ย (Overall F1)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-600 font-mono">
                        {kfoldReport.metrics_summary.f1_display}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Harmonic Mean ของ Precision & Recall</span>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">ความเหมือนตัวอักษร (Avg Similarity)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-blue-600 font-mono">
                        {kfoldReport.metrics_summary.similarity_display}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Levenshtein Token Distance</span>
                  </div>
                </div>

                {kfoldReport.prompt_config && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-extrabold text-amber-900">
                        Prompt ที่ใช้ในการทดลอง
                      </h3>
                      <span className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-800">
                        {kfoldReport.prompt_config.snapshot.selected_model}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-amber-950">
                      {kfoldReport.prompt_config.snapshot.system_prompt}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-amber-800">
                      Threshold {kfoldReport.prompt_config.snapshot.confidence_threshold}% · {kfoldReport.prompt_config.snapshot.fallback_rules.length} fallback rules · {kfoldReport.prompt_config.snapshot.monitored_fields.length} monitored fields
                    </p>
                  </div>
                )}

                {/* 5-Fold Benchmark Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Table className="h-4 w-4 text-blue-600" />
                      <span>ตารางเปรียบเทียบความแม่นยำรายฟิลด์ในแต่ละ Fold (Fold 1 ถึง Fold 5)</span>
                    </h3>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                      K={kfoldReport.k_splits} Folds Cross-Validation
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">ฟิลด์ข้อมูล (Core Field)</th>
                          {kfoldReport.folds.map((f) => (
                            <th key={f.fold} className="p-3.5 text-center">
                              Fold {f.fold}
                            </th>
                          ))}
                          <th className="p-3.5 text-center bg-blue-50/70 text-blue-900 font-black">
                            ค่าเฉลี่ยรวม (Mean ± Std)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(FIELD_LABELS).map(([key, label]) => {
                          const perf = kfoldReport.field_performance[key];
                          return (
                            <tr key={key} className="hover:bg-blue-50/30 transition">
                              <td className="p-3 font-bold text-slate-800">{label}</td>
                              {perf ? (
                                perf.scores_per_fold.map((score, sIdx) => (
                                  <td
                                    key={sIdx}
                                    className="p-3 text-center font-mono font-bold text-emerald-600"
                                  >
                                    {score.toFixed(1)}%
                                  </td>
                                ))
                              ) : (
                                <td
                                  colSpan={kfoldReport.folds.length}
                                  className="text-center text-slate-400"
                                >
                                  -
                                </td>
                              )}
                              <td className="p-3 text-center font-mono font-black text-blue-900 bg-blue-50/50">
                                {perf?.display || "-"}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Summary Rows */}
                        <tr className="bg-slate-50/90 font-black border-t-2 border-slate-200">
                          <td className="p-3 text-slate-900 font-extrabold">
                            ความแม่นยำภาพรวม (Overall Accuracy)
                          </td>
                          {kfoldReport.folds.map((f) => (
                            <td
                              key={f.fold}
                              className="p-3 text-center font-mono text-emerald-700 font-black"
                            >
                              {f.overall_accuracy_pct.toFixed(1)}%
                            </td>
                          ))}
                          <td className="p-3 text-center font-mono text-blue-900 bg-blue-100/70 font-bold text-sm">
                            <Award className="inline h-3.5 w-3.5 mr-1 text-blue-700" />
                            {kfoldReport.metrics_summary.accuracy_display}
                          </td>
                        </tr>
                        <tr className="bg-indigo-50/50 font-bold">
                          <td className="p-3 text-indigo-950 font-semibold">
                            F1-Score รวม (Overall F1-Score)
                          </td>
                          {kfoldReport.folds.map((f) => (
                            <td
                              key={f.fold}
                              className="p-3 text-center font-mono text-indigo-700 font-bold"
                            >
                              {f.f1_score_pct.toFixed(1)}%
                            </td>
                          ))}
                          <td className="p-3 text-center font-mono text-indigo-900 bg-indigo-100/70 font-bold text-sm">
                            <Award className="inline h-3.5 w-3.5 mr-1 text-indigo-700" />
                            {kfoldReport.metrics_summary.f1_display}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400 font-bold text-sm">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>กำลังโหลดข้อมูลรายงาน K-Fold Cross-Validation...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Clean Light Theme JSON Syntax Highlighter (Matching Firebase modal)
 */
function JsonSyntaxHighlighter({ json }: { json: any }) {
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
    }
  }, [json]);

  const lines = useMemo(() => jsonString.split("\n"), [jsonString]);

  function highlightLine(line: string) {
    return line.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-slate-800";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            // Key
            const keyPart = match.slice(0, -1);
            return `<span class="text-blue-700 font-semibold">${keyPart}</span><span class="text-slate-400">:</span>`;
          } else {
            // String value
            return `<span class="text-emerald-700 font-medium">${match}</span>`;
          }
        } else if (/true|false/.test(match)) {
          cls = "text-purple-600 font-bold";
        } else if (/null/.test(match)) {
          cls = "text-slate-400 font-bold italic";
        } else {
          // Number
          cls = "text-amber-600 font-bold font-mono";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  return (
    <div className="flex font-mono text-xs leading-6 selection:bg-blue-100 selection:text-blue-900 bg-white">
      {/* Line Numbers Column */}
      <div className="select-none py-3 pl-3 pr-3 text-right font-mono text-[11px] text-slate-300 border-r border-slate-100 bg-slate-50/50 min-w-[42px]">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {/* Code Content */}
      <pre className="flex-1 overflow-x-auto py-3 px-4 font-mono text-xs leading-6 text-slate-800 bg-white">
        {lines.map((line, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: highlightLine(line) || "&nbsp;" }}
          />
        ))}
      </pre>
    </div>
  );
}
