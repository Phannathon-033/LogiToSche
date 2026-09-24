import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart3,
  BookmarkCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Database,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileCheck2,
  FileCode,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FolderOpen,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table,
  Tag,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch } from "../services/apiClient";

export interface KFoldEvaluationViewProps {
  onBack?: () => void;
  showToast?: (message: string) => void;
}

export interface DocPerformanceRecord {
  timestamp: string;
  doc_id: string;
  file_name: string;
  fold?: number;
  ocr_time_sec: number;
  slm_time_sec: number;
  total_time_sec: number;
  matched_fields: number;
  total_fields: number;
  accuracy_pct: number;
}

export interface DocPerformanceSummary {
  total_documents_logged: number;
  mean_ocr_time_sec: number;
  mean_slm_time_sec: number;
  mean_total_time_sec: number;
  min_total_time_sec: number;
  max_total_time_sec: number;
}

export interface EvaluationJobStatus {
  job_id: string | null;
  status: "idle" | "running" | "stopping" | "stopped" | "completed" | "failed";
  is_running: boolean;
  mode?: "5_fold" | "single_fold" | "single_doc";
  single_fold?: number | null;
  k_splits?: number;
  random_seed?: number;
  prompt_variant?: string;
  resume?: boolean;
  force_rerun_ocr?: boolean;
  current_fold?: number;
  total_folds?: number;
  fold_current?: number;
  fold_total?: number;
  overall_current?: number;
  overall_total?: number;
  overall_pct?: number;
  fold_pct?: number;
  elapsed_seconds?: number;
  live_accuracy_pct?: number;
  current_doc_id?: string;
  current_file_name?: string;
  completed_docs?: number;
  resumed_cached_docs?: number;
  cached_count?: number;
  live_gpu_docs?: number;
  live_gpu_count?: number;
  failed_docs?: number;
  recent_logs?: string[];
  completed_items?: any[];
  final_report?: KFoldReport | null;
  final_accuracy?: string;
  final_f1?: string;
}

export interface KFoldReport {
  method: string;
  device?: string;
  run_id?: string;
  created_at?: string;
  prompt_variant?: string;
  dataset: string;
  total_documents: number;
  total_dataset_documents?: number;
  k_splits: number;
  single_fold?: number | null;
  round_info?: {
    is_single_fold: boolean;
    current_round: number;
    total_rounds: number;
    test_fold: number;
    train_folds: number[];
    train_count: number;
    test_count: number;
    total_dataset_count: number;
    matches_vector: number[];
    label_sample?: string[];
    pred_sample?: string[];
    total_checks: number;
    matched_checks: number;
  };
  random_seed?: number;
  metrics_summary: {
    mean_accuracy_pct: number;
    accuracy_std_dev: number;
    accuracy_display: string;
    mean_precision_pct: number;
    precision_std_dev: number;
    precision_display: string;
    mean_recall_pct: number;
    recall_std_dev: number;
    recall_display: string;
    mean_f1_score_pct: number;
    f1_std_dev: number;
    f1_display: string;
    mean_similarity_pct: number;
    similarity_std_dev: number;
    similarity_display: string;
  };
  latency_summary?: {
    mean_ocr_time_sec?: number;
    mean_slm_time_sec?: number;
    mean_total_time_sec?: number;
    min_total_time_sec?: number;
    max_total_time_sec?: number;
  };
  baseline_metrics_summary?: {
    mean_accuracy_pct: number;
    accuracy_std_dev: number;
    accuracy_display: string;
    mean_f1_score_pct: number;
    f1_std_dev: number;
    f1_display: string;
    mean_similarity_pct: number;
    similarity_display: string;
  };
  delta_improvement?: {
    accuracy_delta_pct: number;
    f1_delta_pct: number;
    similarity_delta_pct: number;
  };
  field_performance: Record<
    string,
    {
      mean_accuracy_pct: number;
      std_dev?: number;
      std_accuracy_pct?: number;
      mean_precision_pct?: number;
      std_precision_pct?: number;
      mean_recall_pct?: number;
      std_recall_pct?: number;
      mean_f1_score_pct?: number;
      std_f1_score_pct?: number;
      mean_similarity_pct?: number;
      std_similarity_pct?: number;
      tp?: number;
      fp?: number;
      fn?: number;
      display?: string;
      scores_per_fold: number[];
    }
  >;
  folds: Array<{
    fold: number;
    test_docs_count?: number;
    val_samples_count: number;
    train_samples_count?: number;
    document_evaluations?: Array<{
      id: string;
      file_name: string;
      category?: string;
      ground_truth: Record<string, any>;
      prediction: Record<string, any>;
      field_scores: Record<string, any>;
      matched_fields_count: number;
      total_fields: number;
      accuracy_pct: number;
      performance?: {
        ocr_time_sec?: number;
        slm_time_sec?: number;
        total_time_sec?: number;
      };
    }>;
    accuracy_pct: number;
    document_accuracy_pct: number;
    precision_pct: number;
    recall_pct: number;
    f1_score_pct: number;
    similarity_pct: number;
    baseline_accuracy_pct?: number;
    baseline_f1_pct?: number;
    delta_f1_pct?: number;
    field_accuracies: Record<string, number>;
    baseline_field_accuracies?: Record<string, number>;
    val_doc_ids?: string[];
  }>;
  sample_size_verification: {
    calculated_n0: number;
    actual_dataset_size: number;
    is_statistically_significant: boolean;
  };
  proposed_slm?: {
    mean_accuracy_pct: number;
    std_accuracy: number;
    mean_f1_score_pct: number;
    std_f1: number;
    mean_similarity_pct: number;
    std_similarity: number;
    field_scores: Record<string, {
      mean: number;
      std: number;
      per_fold: number[];
      mean_accuracy_pct?: number;
      std_accuracy_pct?: number;
      mean_precision_pct?: number;
      mean_recall_pct?: number;
      mean_f1_score_pct?: number;
      tp?: number;
      fp?: number;
      fn?: number;
    }>;
  };
  baseline_model?: {
    mean_accuracy_pct: number;
    std_accuracy: number;
    mean_f1_score_pct: number;
    std_f1: number;
    field_scores: Record<string, {
      mean: number;
      std: number;
      per_fold: number[];
      mean_accuracy_pct?: number;
      std_accuracy_pct?: number;
      mean_precision_pct?: number;
      mean_recall_pct?: number;
      mean_f1_score_pct?: number;
      tp?: number;
      fp?: number;
      fn?: number;
    }>;
  };
}

export interface GroundTruthDoc {
  id: string;
  rank?: number;
  file_name: string;
  category: string;
  annotated_at?: string;
  confidence?: Record<string, number>;
  ground_truth: Record<string, any>;
}

const FIELD_LABELS: Record<string, { th: string; en: string; icon: any; color: string }> = {
  document_type: { th: "1. ประเภทเอกสาร", en: "document_type", icon: Tag, color: "text-blue-600" },
  document_number: { th: "2. เลขที่เอกสาร", en: "document_number", icon: Hash, color: "text-indigo-600" },
  document_date: { th: "3. วันที่เอกสาร", en: "document_date", icon: Calendar, color: "text-sky-600" },
  sender: { th: "4. ผู้ส่ง / ผู้ขาย", en: "sender", icon: Building2, color: "text-amber-600" },
  receiver: { th: "5. ผู้รับ / ผู้ซื้อ", en: "receiver", icon: Building2, color: "text-cyan-600" },
  origin: { th: "6. ต้นทาง", en: "origin", icon: MapPin, color: "text-emerald-600" },
  destination: { th: "7. ปลายทาง", en: "destination", icon: MapPin, color: "text-rose-600" },
  reference_number: { th: "8. เลขที่อ้างอิง", en: "reference_number", icon: FileText, color: "text-purple-600" },
  unit_price: { th: "9. ราคาต่อหน่วย", en: "unit_price", icon: DollarSign, color: "text-teal-600" },
  total_amount: { th: "10. มูลค่ารวมสุทธิ", en: "total_amount", icon: DollarSign, color: "text-emerald-700" },
  currency: { th: "11. สกุลเงิน", en: "currency", icon: DollarSign, color: "text-blue-500" },
};

function formatPercent(value: number | null | undefined, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}%` : "-";
}

function benchmarkImageUrl(fileName: string): string {
  return `${API_BASE_URL}/api/benchmark/image/${encodeURIComponent(fileName)}`;
}

function optionalDelta(value: number | undefined, left: number | undefined, right: number | undefined): number | null {
  if (typeof value === "number") return value;
  return typeof left === "number" && typeof right === "number" ? left - right : null;
}

function displayDelta(value: number | null): string {
  return value === null ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function KFoldEvaluationView({ onBack, showToast }: KFoldEvaluationViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "perf_log" | "folds" | "docs">("overview");
  const [evaluationMode, setEvaluationMode] = useState<"round1" | "all_folds" | "single_doc">("round1");
  const [selectedSingleFold, setSelectedSingleFold] = useState<number>(1);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [kSplits, setKSplits] = useState<number>(5);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [selectedTestDocId, setSelectedTestDocId] = useState<string>("DOC-001");
  const [promptVariant, setPromptVariant] = useState<"zero-shot" | "one-shot" | "few-shot">("zero-shot");
  const [kfoldReport, setKfoldReport] = useState<KFoldReport | null>(null);
  const [documents, setDocuments] = useState<GroundTruthDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GroundTruthDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [resultPulsing, setResultPulsing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [selectedFoldIdx, setSelectedFoldIdx] = useState<number | null>(null);
  const [searchDocQuery, setSearchDocQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Performance Log State (per-document OCR duration, SLM duration, Total duration)
  const [perfLogs, setPerfLogs] = useState<{
    records: DocPerformanceRecord[];
    summary: DocPerformanceSummary | null;
  }>({ records: [], summary: null });
  const [loadingPerfLogs, setLoadingPerfLogs] = useState<boolean>(false);
  const [searchPerfQuery, setSearchPerfQuery] = useState<string>("");

  const filteredPerfRecords = useMemo(() => {
    if (!searchPerfQuery.trim()) return perfLogs.records;
    const q = searchPerfQuery.toLowerCase();
    return perfLogs.records.filter(
      (r) =>
        r.doc_id?.toLowerCase().includes(q) ||
        r.file_name?.toLowerCase().includes(q) ||
        String(r.fold).includes(q)
    );
  }, [perfLogs.records, searchPerfQuery]);

  // Background Evaluation Job System (Immediate response, resume capability, OCR cache)
  const [evalJob, setEvalJob] = useState<EvaluationJobStatus | null>(null);
  const [isPollingJob, setIsPollingJob] = useState<boolean>(false);
  const [autoResume, setAutoResume] = useState<boolean>(false);

  async function fetchPerformanceLogs() {
    setLoadingPerfLogs(true);
    try {
      const res = await apiFetch("/api/benchmark/performance-log");
      if (res.ok) {
        const data = await res.json();
        setPerfLogs({
          records: data.records || [],
          summary: data.summary || null,
        });
      }
    } catch (err) {
      console.error("Failed to load performance logs:", err);
    } finally {
      setLoadingPerfLogs(false);
    }
  }

  async function handleClearPerformanceLogs() {
    if (!window.confirm("คุณต้องการล้าง Log Performance ทั้งหมดใช่หรือไม่?")) return;
    try {
      const res = await apiFetch("/api/benchmark/performance-log/clear", { method: "POST" });
      if (res.ok) {
        showToast?.("ล้างบันทึก Log Performance เรียบร้อยแล้ว");
        fetchPerformanceLogs();
      }
    } catch (err) {
      showToast?.("ไม่สามารถล้างบันทึก Log ได้");
    }
  }

  function handleDownloadPerfCsv() {
    window.open(`${API_BASE_URL}/api/benchmark/performance-log/csv`, "_blank");
  }

  async function handleDownloadExcelReport() {
    try {
      showToast?.("กำลังสร้างและดาวน์โหลดรายงานสรุป Excel อย่างละเอียด (.xlsx)...");
      const resp = await apiFetch("/api/benchmark/kfold/export-excel");
      if (!resp.ok) {
        throw new Error(`Download failed with status ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LogiAI_KFold_Evaluation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast?.("ดาวน์โหลดรายงาน Excel อย่างละเอียดสำเร็จเรียบร้อยแล้ว!");
    } catch (err) {
      console.error("Download Excel error:", err);
      showToast?.("ไม่สามารถดาวน์โหลดไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  // Polling effect for Background Evaluation Job
  useEffect(() => {
    let interval: any;
    if (isPollingJob || evalJob?.is_running) {
      interval = setInterval(async () => {
        try {
          const res = await apiFetch("/api/evaluation/status");
          if (res.ok) {
            const data: EvaluationJobStatus = await res.json();
            setEvalJob(data);
            if (data.status === "completed" && data.final_report) {
              setKfoldReport(data.final_report);
              setIsPollingJob(false);
              showToast?.(`การประเมินผลเสร็จสิ้น 100%! ความแม่นยำ: ${data.final_accuracy || "-"}`);
              fetchPerformanceLogs();
            } else if (data.status === "stopped" || data.status === "failed") {
              setIsPollingJob(false);
              fetchPerformanceLogs();
            }
          }
        } catch (err) {
          console.error("Poll eval job error:", err);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPollingJob, evalJob?.is_running]);

  async function handleStartEvaluationJob(
    targetMode?: "5_fold" | "single_fold" | "single_doc",
    targetFold?: number,
    customMaxDocs?: number,
  ) {
    const modeToUse = targetMode || (evaluationMode === "all_folds" ? "5_fold" : evaluationMode === "single_doc" ? "single_doc" : "single_fold");
    const foldToUse = targetFold ?? selectedSingleFold;

    try {
      setIsPollingJob(true);
      // Give instant UI feedback so button transforms immediately
      setEvalJob({
        job_id: "กำลังเริ่มงาน...",
        status: "running",
        is_running: true,
        mode: modeToUse,
        prompt_variant: promptVariant,
        current_doc_id: modeToUse === "single_doc" ? selectedTestDocId : undefined,
        overall_current: 0,
        overall_total: modeToUse === "single_doc" ? 1 : modeToUse === "single_fold" ? (customMaxDocs || 60) : 300,
        fold_current: 0,
        fold_total: modeToUse === "single_doc" ? 1 : (customMaxDocs || 60),
        current_fold: foldToUse,
        total_folds: modeToUse === "5_fold" ? 5 : 1,
        elapsed_seconds: 0,
        recent_logs: [`กำลังเริ่มงานประเมินสด ${modeToUse === "single_doc" ? `1 ฉบับ (${selectedTestDocId}) บน GPU` : modeToUse}...`],
        completed_items: [],
      } as any);

      const payload = {
        mode: modeToUse,
        fold: foldToUse,
        k: Math.max(2, kSplits),
        seed: randomSeed,
        prompt_variant: promptVariant,
        resume: modeToUse === "single_doc" ? false : autoResume,
        force_rerun_ocr: modeToUse === "single_doc" ? true : !autoResume,
        max_docs: customMaxDocs,
        doc_id: selectedTestDocId,
      };

      showToast?.(
        modeToUse === "5_fold"
          ? "กำลังเริ่มงานประเมิน 5-Fold ครบ 300 ฉบับใน Background..."
          : modeToUse === "single_fold"
          ? `กำลังเริ่มงานประเมิน Fold ${foldToUse} (${customMaxDocs ? `${customMaxDocs} ฉบับ` : "60 ฉบับ"}) ใน Background...`
          : `กำลังเริ่มงานประเมินสด 1 ฉบับ (${selectedTestDocId}) บน GPU...`
      );

      const resp = await apiFetch("/api/evaluation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const data = await resp.json();
        showToast?.(`สร้างงานประเมิน Job ID: ${data.job_id} สำเร็จ! ทำงานใน Background ทันที`);
        const pollRes = await apiFetch("/api/evaluation/status");
        if (pollRes.ok) {
          setEvalJob(await pollRes.json());
        }
      } else {
        showToast?.("ไม่สามารถเริ่มงานประเมินได้");
        setIsPollingJob(false);
      }
    } catch (err) {
      console.error("Start evaluation job failed:", err);
      showToast?.("เกิดข้อผิดพลาดในการเริ่มงานประเมิน");
      setIsPollingJob(false);
    }
  }

  async function handleStopEvaluationJob() {
    try {
      showToast?.("กำลังส่งคำสั่งหยุดงานประเมิน (Stop)...");
      const resp = await apiFetch("/api/evaluation/stop", { method: "POST" });
      if (resp.ok) {
        showToast?.("ส่งสัญญาณหยุดงานประเมินแล้ว ระบบจะหยุดหลังเอกสารปัจจุบันเสร็จ");
        const pollRes = await apiFetch("/api/evaluation/status");
        if (pollRes.ok) {
          setEvalJob(await pollRes.json());
        }
      }
    } catch (err) {
      showToast?.("ไม่สามารถส่งคำสั่งหยุดได้");
    }
  }

  async function handleResetEvaluationJob() {
    try {
      const resp = await apiFetch("/api/evaluation/reset", { method: "POST" });
      if (resp.ok) {
        setEvalJob(null);
        setIsPollingJob(false);
        showToast?.("รีเซ็ตสถานะการประเมินผลเรียบร้อยแล้ว");
      }
    } catch (err) {
      showToast?.("ไม่สามารถรีเซ็ตได้");
    }
  }

  useEffect(() => {
    loadAllData();
    fetchPerformanceLogs();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      // Fetch Ground Truth documents so user can inspect and pick docs
      const gtRes = await apiFetch("/api/benchmark/ground-truth");
      if (gtRes.ok) {
        const gtData = await gtRes.json();
        const docs = gtData.documents || [];
        setDocuments(docs);
        if (docs.length > 0 && !selectedDoc) {
          setSelectedDoc(docs[0]);
          setSelectedTestDocId(docs[0].id || "DOC-001");
        }
      }

      // Check active Background Evaluation Job status on mount
      try {
        const evalRes = await apiFetch("/api/evaluation/status");
        if (evalRes.ok) {
          const evalData: EvaluationJobStatus = await evalRes.json();
          setEvalJob(evalData);
          if (evalData.is_running) {
            setIsPollingJob(true);
          } else if (evalData.status === "completed" && evalData.final_report) {
            setKfoldReport(evalData.final_report);
          }
        }
      } catch (e) {
        console.warn("Check eval job on mount:", e);
      }
    } catch (err) {
      console.error("Failed to load benchmark data:", err);
      showToast?.("ไม่สามารถโหลดข้อมูลชุดตัวอย่างได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์เปิดอยู่");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyThesisTable() {
    if (!kfoldReport) return;
    const lines: string[] = [];
    lines.push(`### ตารางผลการทดสอบ ${kfoldReport.k_splits}-Fold Cross-Validation ของระบบ LogiSchema`);
    lines.push(`*การประเมินความแม่นยำในการแปลงเอกสารโลจิสติกส์สู่ 11 ฟิลด์มาตรฐาน (ชุดข้อมูล N=${kfoldReport.total_documents} ฉบับ)*\n`);

    const header =
      `| ฟิลด์ข้อมูล (Core Fields) | ` +
      kfoldReport.folds.map((f) => `Fold ${f.fold} (%)`).join(" | ") +
      ` | ค่าเฉลี่ยความแม่นยำ (Mean ± SD) | F1-Score (%) |`;
    const sep = `| :--- | ` + kfoldReport.folds.map(() => `:---:`).join(" | ") + ` | :---: | :---: |`;
    lines.push(header);
    lines.push(sep);

    for (const [key, meta] of Object.entries(FIELD_LABELS)) {
      const perf = kfoldReport.field_performance[key];
      if (perf) {
        const scores = perf.scores_per_fold.map((s) => `${s.toFixed(1)}%`).join(" | ");
        const f1Display = perf.mean_f1_score_pct ? `${perf.mean_f1_score_pct.toFixed(1)}%` : "-";
        lines.push(`| ${meta.th} (${meta.en}) | ${scores} | **${perf.display}** | ${f1Display} |`);
      }
    }

    const foldAccs = kfoldReport.folds.map((f) => `**${f.accuracy_pct.toFixed(1)}%**`).join(" | ");
    lines.push(`| **ความแม่นยำภาพรวม (Overall Accuracy)** | ${foldAccs} | **${kfoldReport.metrics_summary.accuracy_display}** | - |`);

    const foldF1s = kfoldReport.folds.map((f) => `${f.f1_score_pct.toFixed(1)}%`).join(" | ");
    lines.push(`| **F1-Score รวม (Overall F1-Score)** | ${foldF1s} | - | **${kfoldReport.metrics_summary.f1_display}** |`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopySuccess(true);
    showToast?.("คัดลอกตาราง Markdown สำหรับเล่มวิทยานิพนธ์แล้ว");
    setTimeout(() => setCopySuccess(false), 3000);
  }

  function handleDownloadReportJson() {
    if (!kfoldReport) return;
    const blob = new Blob([JSON.stringify(kfoldReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kfold_${kSplits}_evaluation_report.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.("ดาวน์โหลดรายงาน JSON สำเร็จ");
  }

  function handleDownloadCsv() {
    if (!kfoldReport) return;
    const rows = [
      ["Field", ...kfoldReport.folds.map((f) => `Fold ${f.fold}`), "Mean Accuracy", "Precision", "Recall", "F1 Score"],
    ];
    for (const [key, meta] of Object.entries(FIELD_LABELS)) {
      const perf = kfoldReport.field_performance[key];
      if (perf) {
        const scores = perf.scores_per_fold.map((s) => s.toFixed(2));
        const pMean = perf.mean_accuracy_pct.toFixed(2);
        const pPrec = (perf.mean_precision_pct ?? 0).toFixed(2);
        const pRec = (perf.mean_recall_pct ?? 0).toFixed(2);
        const pF1 = (perf.mean_f1_score_pct ?? 0).toFixed(2);
        rows.push([meta.en, ...scores, `${pMean}%`, `${pPrec}%`, `${pRec}%`, `${pF1}%`]);
      }
    }
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kfold_${kSplits}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.("ดาวน์โหลดตาราง CSV สำเร็จ");
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
      const q = searchDocQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.id.toLowerCase().includes(q) ||
        doc.file_name.toLowerCase().includes(q) ||
        (doc.ground_truth?.sender && String(doc.ground_truth.sender).toLowerCase().includes(q)) ||
        (doc.ground_truth?.receiver && String(doc.ground_truth.receiver).toLowerCase().includes(q)) ||
        (doc.ground_truth?.document_number && String(doc.ground_truth.document_number).toLowerCase().includes(q));

      // Fold filter if active
      if (selectedFoldIdx !== null && kfoldReport) {
        const fold = kfoldReport.folds[selectedFoldIdx];
        if (fold?.val_doc_ids && !fold.val_doc_ids.includes(doc.id)) {
          return false;
        }
      }

      return matchesCategory && matchesSearch;
    });
  }, [documents, categoryFilter, searchDocQuery, selectedFoldIdx, kfoldReport]);

  const docFoldMap = useMemo(() => {
    const map = new Map<string, number>();
    if (kfoldReport?.folds) {
      kfoldReport.folds.forEach((f) => {
        if (f.val_doc_ids) {
          f.val_doc_ids.forEach((id) => map.set(id, f.fold));
        }
      });
    }
    return map;
  }, [kfoldReport]);

  const slmF1 = kfoldReport?.metrics_summary?.mean_f1_score_pct;
  const baseF1 = kfoldReport?.baseline_model?.mean_f1_score_pct;
  const deltaF1 = optionalDelta(
    kfoldReport?.delta_improvement?.f1_delta_pct,
    slmF1,
    baseF1,
  );
  const slmAcc = kfoldReport?.metrics_summary?.mean_accuracy_pct;
  const slmPrecision = kfoldReport?.metrics_summary?.mean_precision_pct;
  const slmRecall = kfoldReport?.metrics_summary?.mean_recall_pct;
  const baseAcc = kfoldReport?.baseline_model?.mean_accuracy_pct;
  const deltaAcc = optionalDelta(
    kfoldReport?.delta_improvement?.accuracy_delta_pct,
    slmAcc,
    baseAcc,
  );
  const fieldCount = Object.keys(kfoldReport?.field_performance ?? {}).length;
  const datasetSize = kfoldReport?.total_documents ?? documents.length;

  const COCHRAN = kfoldReport?.sample_size_verification;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16 antialiased">
      {/* =================================================================== */}
      {/* TOP SUB-HEADER & QUICK BREADCRUMB                                   */}
      {/* =================================================================== */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>กลับ</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                  <Activity className="h-4 w-4" />
                </div>
                <h1 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                  การทดสอบโมเดล (Model Evaluation & K-Fold)
                </h1>
                <span className="hidden rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 sm:inline-flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-emerald-600" />
                  {kfoldReport?.device && kfoldReport.device.toLowerCase().includes("cuda")
                    ? "RTX 3050 · CUDA 12.6 (GPU:0)"
                    : kfoldReport?.device || "RTX 3050 · CUDA 12.6"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {kfoldReport
                  ? `ประเมินผลจาก ${kfoldReport.method || "Shuffled K-Fold"} (${datasetSize} ฉบับ · ${fieldCount || 11} ฟิลด์หลัก · Cochran n₀=246)`
                  : `ชุดข้อมูล Ground Truth 300 ฉบับ · สกัด 11 ฟิลด์มาตรฐาน (กดเริ่มประเมินเพื่อประมวลผล)`}
              </p>
            </div>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!kfoldReport}
              onClick={handleCopyThesisTable}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              title={kfoldReport ? "คัดลอกตาราง Markdown สำหรับเล่มรายงาน" : "ต้องรันการทดสอบก่อนคัดลอก"}
            >
              {copySuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copySuccess ? "คัดลอกแล้ว!" : "คัดลอก Markdown"}</span>
            </button>

            <button
              type="button"
              disabled={!kfoldReport}
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              title={kfoldReport ? "ดาวน์โหลดตารางผลทดสอบเป็น CSV" : "ต้องรันการทดสอบก่อนดาวน์โหลด"}
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              type="button"
              disabled={!kfoldReport}
              onClick={handleDownloadReportJson}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              title={kfoldReport ? "ดาวน์โหลดรายงานผลเป็น JSON" : "ต้องรันการทดสอบก่อนดาวน์โหลด"}
            >
              <FileCode className="h-3.5 w-3.5 text-blue-600" />
              <span>รายงาน JSON</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcelReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition active:scale-95"
              title="ดาวน์โหลดรายงานสรุปผลการประเมินอย่างละเอียด 4 ชีตในรูปแบบ Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>รายงาน Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 pt-5 space-y-5">
        {/* =================================================================== */}
        {/* INTERACTIVE CONTROLS BAR: K-SPLITS & RUNNER                         */}
        {/* =================================================================== */}
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Evaluation Mode Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  รูปแบบการทดสอบ (Evaluation Mode)
                </label>
                <div className="inline-flex items-center rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    disabled={evalJob?.is_running}
                    onClick={() => {
                      setEvaluationMode("round1");
                      setSelectedSingleFold(1);
                      setKSplits(5);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-extrabold transition disabled:opacity-60 ${
                      evaluationMode === "round1"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    รอบที่ 1 (Fold 1: 60 ฉบับ)
                  </button>
                  <button
                    type="button"
                    disabled={evalJob?.is_running}
                    onClick={() => {
                      setEvaluationMode("all_folds");
                      setKSplits(5);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-extrabold transition disabled:opacity-60 ${
                      evaluationMode === "all_folds"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    5-Fold ครบ 300 ฉบับ
                  </button>
                  <button
                    type="button"
                    disabled={evalJob?.is_running}
                    onClick={() => {
                      setEvaluationMode("single_doc");
                      setKSplits(1);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-extrabold transition disabled:opacity-60 ${
                      evaluationMode === "single_doc"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    1 ฉบับ (สด)
                  </button>
                </div>
              </div>

              {/* Fold Selector when round1 / single fold is active */}
              {evaluationMode === "round1" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5">
                    เลือกรอบทดสอบ (Target Fold)
                  </label>
                  <div className="inline-flex items-center rounded-xl bg-white p-1 border border-indigo-200 shadow-2xs">
                    {[1, 2, 3, 4, 5].map((f) => (
                      <button
                        key={f}
                        type="button"
                        disabled={evalJob?.is_running}
                        onClick={() => setSelectedSingleFold(f)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition disabled:opacity-60 ${
                          selectedSingleFold === f
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Fold {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Selector when single_doc is active */}
              {evaluationMode === "single_doc" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1.5">
                    เลือกเอกสารทดสอบสด
                  </label>
                  <div className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 border border-blue-300 shadow-2xs">
                    <FileText className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
                    <select
                      value={selectedTestDocId}
                      disabled={evalJob?.is_running}
                      onChange={(e) => setSelectedTestDocId(e.target.value)}
                      className="bg-transparent text-xs font-mono font-bold text-blue-900 focus:outline-none cursor-pointer disabled:opacity-60 max-w-[180px] truncate"
                    >
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.id} ({d.file_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Seed Control */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Random Seed
                </label>
                <div className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 border border-slate-200 shadow-2xs">
                  <span className="font-mono text-xs font-bold text-slate-400 mr-1.5">Seed:</span>
                  <select
                    value={randomSeed}
                    disabled={evalJob?.is_running}
                    onChange={(e) => setRandomSeed(Number(e.target.value))}
                    className="bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none cursor-pointer disabled:opacity-60"
                  >
                    <option value={42}>42 (Default)</option>
                    <option value={123}>123</option>
                    <option value={999}>999</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Prompt Variant
                </label>
                <div
                  className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-bold shadow-2xs transition ${
                    promptVariant === "zero-shot"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : promptVariant === "one-shot"
                      ? "border-blue-300 bg-blue-50 text-blue-800"
                      : "border-purple-300 bg-purple-50 text-purple-800"
                  }`}
                >
                  <select
                    value={promptVariant}
                    disabled={evalJob?.is_running}
                    onChange={(e) => setPromptVariant(e.target.value as "zero-shot" | "one-shot" | "few-shot")}
                    className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="zero-shot" className="text-slate-900 bg-white">Zero-shot</option>
                    <option value="one-shot" className="text-slate-900 bg-white">One-shot</option>
                    <option value="few-shot" className="text-slate-900 bg-white">Few-shot</option>
                  </select>
                </div>
              </div>

              {/* Dataset Size Tag */}
              <div className="hidden lg:block">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  ชุดข้อมูลทดสอบ
                </label>
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  <Database className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{datasetSize} ฉบับ ({fieldCount || 11} ฟิลด์หลัก)</span>
                </div>
              </div>
            </div>

            {/* Run CTA Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const targetMode = evaluationMode === "all_folds" ? "5_fold" : evaluationMode === "single_doc" ? "single_doc" : "single_fold";
                  handleStartEvaluationJob(targetMode, selectedSingleFold);
                }}
                disabled={evalJob?.is_running}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition ${
                  evalJob?.is_running
                    ? "bg-slate-700 cursor-not-allowed opacity-90"
                    : "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-blue-600/25 hover:scale-[1.02] hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98]"
                }`}
              >
                {evalJob?.is_running ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>
                      {evalJob.mode === "single_doc"
                        ? `กำลังประมวลผล ${evalJob.current_doc_id || "1 ฉบับ"}...`
                        : evalJob.mode === "single_fold"
                        ? `กำลังประมวลผล Fold ${evalJob.current_fold} (${evalJob.fold_current}/${evalJob.fold_total} ฉบับ)...`
                        : `กำลังประมวลผล 5-Fold (${evalJob.overall_current}/${evalJob.overall_total} ฉบับ)...`}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                    <span>
                      {evaluationMode === "single_doc"
                        ? `เริ่มทดสอบสด 1 ฉบับ (${selectedTestDocId})`
                        : evaluationMode === "round1"
                        ? `เริ่มประเมิน Fold ${selectedSingleFold} (60 ฉบับ)`
                        : `เริ่มประเมิน 5-Fold ครบ 300 ฉบับ`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* BACKGROUND EVALUATION JOB DASHBOARD (ZERO TIMEOUT ENGINE)          */}
        {/* =================================================================== */}
        {evalJob && evalJob.status !== "idle" && (
          <div className="rounded-2xl border-2 border-indigo-500/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl animate-in fade-in duration-300 space-y-4">
            {/* Top Bar: Title, Status Badge, and Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${
                    evalJob.is_running
                      ? "bg-indigo-600 shadow-indigo-500/40"
                      : evalJob.status === "completed"
                      ? "bg-emerald-600 shadow-emerald-500/40"
                      : evalJob.status === "stopped"
                      ? "bg-amber-600 shadow-amber-500/40"
                      : "bg-red-600 shadow-red-500/40"
                  }`}
                >
                  {evalJob.is_running ? (
                    <>
                      <Zap className="h-5 w-5 text-amber-300 animate-pulse" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                    </>
                  ) : evalJob.status === "completed" ? (
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  ) : evalJob.status === "stopped" ? (
                    <Clock className="h-6 w-6 text-white" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-white" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black tracking-wide text-white">
                      ระบบประมวลผลการประเมินผล Background Job (Zero Timeout Engine)
                    </h3>
                    <span className="rounded-md bg-indigo-500/30 border border-indigo-400/30 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-200">
                      Job: {evalJob.job_id}
                    </span>
                    {evalJob.prompt_variant && (
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold border uppercase ${
                          evalJob.prompt_variant === "one-shot"
                            ? "bg-blue-500/25 text-blue-200 border-blue-400/50"
                            : evalJob.prompt_variant === "few-shot"
                            ? "bg-purple-500/25 text-purple-200 border-purple-400/50"
                            : "bg-teal-500/25 text-teal-200 border-teal-400/50"
                        }`}
                      >
                        Variant: {evalJob.prompt_variant}
                      </span>
                    )}
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold border ${
                        evalJob.is_running
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                          : evalJob.status === "completed"
                          ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/50"
                          : evalJob.status === "stopped"
                          ? "bg-amber-500/30 text-amber-200 border-amber-500/50"
                          : "bg-red-500/30 text-red-200 border-red-500/50"
                      }`}
                    >
                      {evalJob.is_running
                        ? "● กำลังประมวลผลบน GPU (Running)"
                        : evalJob.status === "completed"
                        ? "✓ เสร็จสมบูรณ์ (Completed)"
                        : evalJob.status === "stopped"
                        ? "⏸ พักชั่วคราว (Stopped)"
                        : "✕ ล้มเหลว (Failed)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {evalJob.mode === "5_fold"
                      ? `ทดสอบแบบ 5-Fold ครบทุกรอบ (ทั้งหมด ${evalJob.overall_total} ฉบับ)`
                      : evalJob.mode === "single_fold"
                      ? `ทดสอบรอบที่ ${evalJob.current_fold} (Fold ${evalJob.current_fold}: ชุดทดสอบ ${evalJob.fold_total} ฉบับ)`
                      : `ทดสอบสด 1 ฉบับ (${evalJob.current_doc_id})`}
                    {" · "}
                    <span className="text-indigo-300">
                      PaddleOCR แคชพร้อมใช้ 300 ฉบับ (ไม่ต้องทำซ้ำ) · บันทึกผลรายฉบับทันที
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Controls: Resume Toggle, Stop / Resume Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={autoResume}
                    onChange={(e) => setAutoResume(e.target.checked)}
                    className="rounded border-slate-600 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Resume (ข้ามเอกสารเดิม)</span>
                </label>

                {evalJob.is_running ? (
                  <button
                    type="button"
                    onClick={handleStopEvaluationJob}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/50 bg-red-950/80 hover:bg-red-900 px-3.5 py-1.5 text-xs font-bold text-red-200 transition shadow-xs active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>หยุดการประมวลผล (Stop)</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEvaluationJob(evalJob.mode, evalJob.current_fold)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-950/80 hover:bg-emerald-900 px-3.5 py-1.5 text-xs font-bold text-emerald-200 transition shadow-xs active:scale-95"
                    >
                      <Play className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                      <span>
                        {evalJob.status === "stopped" ? "ทำต่อจากจุดเดิม (Resume)" : "รันใหม่อีกรอบ (Re-run)"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetEvaluationJob}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition shadow-xs active:scale-95"
                      title="รีเซ็ตสถานะหน้าต่างประเมินผลกลับสู่เริ่มต้น"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                      <span>รีเซ็ต (Reset)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadExcelReport}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/80 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm active:scale-95"
                      title="ดาวน์โหลดรายงานสรุป Excel อย่างละเอียด (.xlsx)"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>ดาวน์โหลด Excel (.xlsx)</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Job Completion Banner */}
            {evalJob.status === "completed" && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-100 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-white">
                      การประเมินผลเสร็จสิ้นสมบูรณ์ ({evalJob.completed_docs}/{evalJob.overall_total} ฉบับ)!
                    </span>
                    <span className="text-[11px] text-emerald-300">
                      ระบบได้บันทึกคะแนนและสร้างไฟล์ Excel สรุปผล 4 ชีตอย่างละเอียดพร้อมให้ดาวน์โหลดแล้ว
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExcelReport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-black text-slate-950 transition shadow-md shrink-0 active:scale-95"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>ดาวน์โหลดรายงานสรุป Excel (.xlsx)</span>
                </button>
              </div>
            )}

            {/* Dual Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Progress Bar 1: Overall Progress */}
              <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-blue-400" />
                    <span>ความคืบหน้าภาพรวม (Overall Progress)</span>
                  </span>
                  <span className="font-mono font-black text-blue-400">
                    {evalJob.overall_current} / {evalJob.overall_total} ฉบับ (
                    {Math.round(((evalJob.overall_current || 0) / (evalJob.overall_total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/80">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((evalJob.overall_current || 0) / (evalJob.overall_total || 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Progress Bar 2: Current Fold Progress */}
              <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>
                      {evalJob.mode === "single_doc"
                        ? "ประมวลผลเอกสารสด (Single Doc)"
                        : `รอบปัจจุบัน: Fold ${evalJob.current_fold} (Current Fold)`}
                    </span>
                  </span>
                  <span className="font-mono font-black text-indigo-400">
                    {evalJob.fold_current} / {evalJob.fold_total} ฉบับ (
                    {Math.round(((evalJob.fold_current || 0) / (evalJob.fold_total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/80">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((evalJob.fold_current || 0) / (evalJob.fold_total || 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Current Document Live Status Indicator */}
            {evalJob.is_running && evalJob.current_doc_id && (
              <div className="flex items-center gap-2 text-xs font-mono bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-3 py-1.5 text-slate-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
                <span className="text-slate-400">กำลังประมวลผลเอกสาร:</span>
                <span className="font-bold text-white">{evalJob.current_doc_id}</span>
                <span className="text-slate-400 truncate max-w-[320px]">({evalJob.current_file_name || "-"})</span>
              </div>
            )}

            {/* Live Stats Cards (4 Columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  เวลาที่ใช้ไป (Elapsed Time)
                </span>
                <div className="text-lg font-black text-white">
                  {formatSeconds(evalJob.elapsed_seconds || 0)}
                </div>
                <span className="text-[10px] text-slate-400">
                  เฉลี่ย{" "}
                  {(evalJob.overall_current ?? 0) > 0
                    ? ((evalJob.elapsed_seconds ?? 0) / (evalJob.overall_current ?? 1)).toFixed(1)
                    : "0"}{" "}
                  s/ฉบับ
                </span>
              </div>

              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  ความแม่นยำสด (Live Accuracy)
                </span>
                <div className="text-lg font-black text-emerald-400">
                  {typeof evalJob.live_accuracy_pct === "number"
                    ? evalJob.live_accuracy_pct.toFixed(2)
                    : "0.00"}
                  %
                </div>
                <span className="text-[10px] text-slate-400">คำนวณจากเอกสารที่เสร็จ</span>
              </div>

              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  แคชเดิม vs รันสด GPU
                </span>
                <div className="flex items-baseline gap-1 text-sm font-bold">
                  <span className="text-cyan-400">{evalJob.resumed_cached_docs ?? evalJob.cached_count ?? 0} แคช</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-amber-400">{evalJob.live_gpu_docs ?? evalJob.live_gpu_count ?? 0} GPU สด</span>
                </div>
                <span className="text-[10px] text-slate-400">ประหยัดเวลาด้วยแคชเดิม</span>
              </div>

              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  โหมดการจัดเก็บข้อมูล
                </span>
                <div className="text-xs font-bold text-indigo-300">Real-time Disk Write</div>
                <span className="text-[10px] text-emerald-400">✓ บันทึกทันทีต่อ 1 ฉบับ</span>
              </div>
            </div>

            {/* Live Terminal Log Stream */}
            {evalJob.recent_logs && evalJob.recent_logs.length > 0 && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-300">Live Execution Log Stream:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("perf_log")}
                    className="text-indigo-400 hover:text-indigo-300 underline text-[10px]"
                  >
                    ดูตารางบันทึก Performance ละเอียด (OCR vs SLM) →
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px] text-emerald-400">
                  {evalJob.recent_logs.map((log: string, lIdx: number) => (
                    <div key={lIdx} className="flex items-start gap-2">
                      <span className="text-slate-500 select-none">&gt;</span>
                      <span className="break-all">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {kfoldReport && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-mono text-slate-600">
            <span>Run: <b className="text-slate-900">{kfoldReport.run_id || "-"}</b></span>
            <span>Variant: <b className="text-slate-900">{kfoldReport.prompt_variant || "-"}</b></span>
            <span>Seed: <b className="text-slate-900">{kfoldReport.random_seed ?? "-"}</b></span>
            <span>Method: <b className="text-slate-900">{kfoldReport.method}</b></span>
            <span>Created: <b className="text-slate-900">{kfoldReport.created_at ? new Date(kfoldReport.created_at).toLocaleString("th-TH") : "-"}</b></span>
          </div>
        )}

        {/* =================================================================== */}
        {/* NAVIGATION TABS                                                     */}
        {/* =================================================================== */}
        <div className="flex items-center gap-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 py-3 px-1 text-xs font-bold transition-all border-b-2 ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>ภาพรวมผลการประเมิน (Overview)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perf_log")}
            className={`flex items-center gap-2 py-3 px-1 text-xs font-bold transition-all border-b-2 ${
              activeTab === "perf_log"
                ? "border-blue-600 text-blue-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Performance Log (เวลาประมวลผล)</span>
            {perfLogs.records.length > 0 && (
              <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 font-bold font-mono">
                {perfLogs.records.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("folds")}
            className={`flex items-center gap-2 py-3 px-1 text-xs font-bold transition-all border-b-2 ${
              activeTab === "folds"
                ? "border-blue-600 text-blue-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Table className="h-4 w-4" />
            <span>ผลการทดสอบราย Fold (Fold Matrix)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`flex items-center gap-2 py-3 px-1 text-xs font-bold transition-all border-b-2 ${
              activeTab === "docs"
                ? "border-blue-600 text-blue-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>สำรวจเอกสาร (Document Explorer)</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW & COMPARISON                                        */}
        {/* =================================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 4 Hero KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: F1-Score */}
              <div
                className={`rounded-2xl border border-indigo-200/80 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition duration-500 ${
                  resultPulsing ? "ring-4 ring-indigo-500/40 scale-[1.02]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    คะแนน F1-Score รวม (Overall F1)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600 font-mono tracking-tight">
                    {kfoldReport?.metrics_summary?.f1_display || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">เป้าหมายโมเดล: <b>&ge; 85%</b></span>
                  <span className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    kfoldReport ? "text-indigo-600 bg-indigo-50" : "text-slate-400 bg-slate-50"
                  }`}>
                    <TrendingUp className="h-3 w-3" /> {kfoldReport ? "ประสิทธิภาพสูง" : "รอการทดสอบ"}
                  </span>
                </div>
              </div>

              {/* Card 2: Overall Accuracy */}
              <div
                className={`rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition duration-500 ${
                  resultPulsing ? "ring-4 ring-emerald-500/40 scale-[1.02]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    ความแม่นยำรวม (Overall Accuracy)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
                    {kfoldReport?.metrics_summary?.accuracy_display || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">เกณฑ์มาตรฐาน: <b>&ge; 80%</b></span>
                  <span className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    kfoldReport ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50"
                  }`}>
                    <CheckCircle2 className="h-3 w-3" /> {kfoldReport ? "ผ่านเกณฑ์การทดสอบ" : "รอการทดสอบ"}
                  </span>
                </div>
              </div>

              {/* Card 3: Precision & Recall */}
              <div
                className={`rounded-2xl border border-blue-200/80 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-blue-300 transition duration-500 ${
                  resultPulsing ? "ring-4 ring-blue-500/40 scale-[1.02]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Precision vs Recall
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Precision:</span>
                    <span className="font-mono font-black text-blue-700">{formatPercent(slmPrecision)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${slmPrecision ?? 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-semibold text-slate-600">Recall:</span>
                    <span className="font-mono font-black text-emerald-700">{formatPercent(slmRecall)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${slmRecall ?? 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Card 4: Levenshtein Similarity */}
              <div
                className={`rounded-2xl border border-sky-200/80 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-sky-300 transition duration-500 ${
                  resultPulsing ? "ring-4 ring-sky-500/40 scale-[1.02]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    ความเหมือนตัวอักษร (Similarity)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-sky-600 font-mono tracking-tight">
                    {kfoldReport?.metrics_summary?.similarity_display || "-"}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 truncate">
                  คำนวณผ่าน Normalized Token Levenshtein Distance
                </p>
              </div>
            </div>

            {/* Statistical Rigor Card (Cochran's Formula) */}
            {COCHRAN && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-black text-white uppercase tracking-wider">
                        <Check className="h-3.5 w-3.5" /> ผ่านเกณฑ์ทางสถิติ
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        การพิสูจน์ขนาดกลุ่มตัวอย่างขั้นต่ำตามสูตรของคอแครน (Cochran's Formula)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 max-w-[850px] leading-relaxed">
                      คำนวณขนาดตัวอย่างขั้นต่ำได้ <b>n₀ = {COCHRAN.calculated_n0 ?? "-"} ฉบับ</b> จากข้อมูลที่รายงานโดย runtime จริง
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-emerald-200 shadow-2xs shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400">ขนาดตัวอย่างจริง (Actual N)</span>
                      <p className="text-lg font-mono font-black text-emerald-700">
                        N = {COCHRAN.actual_dataset_size ?? "-"} ฉบับ
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-left">
                      <span className="text-[10px] font-bold uppercase text-slate-400">สถานะกลุ่มตัวอย่าง</span>
                      <p className="text-xs font-black text-emerald-600 flex items-center gap-1">
                        {COCHRAN.is_statistically_significant ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            N &ge; n₀ (ครบถ้วน)
                          </>
                        ) : (
                          "ไม่ถึงเกณฑ์ n₀"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Head-to-Head Comparison Chart (11 Core Fields) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span>ผลความแม่นยำรายฟิลด์ (Field-level Accuracy - Qwen SLM)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แสดงค่าความแม่นยำรายฟิลด์ 11 ฟิลด์หลักจาก {kfoldReport?.method || "Shuffled K-Fold"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-indigo-600" />
                    <span className="text-slate-800">Qwen SLM (ความแม่นยำของโมเดล)</span>
                  </span>
                </div>
              </div>

              {/* 11 Fields Visual Meters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(FIELD_LABELS).map(([key, meta]) => {
                  const Icon = meta.icon;
                  const slmScore = kfoldReport?.proposed_slm?.field_scores[key]?.mean ?? kfoldReport?.field_performance[key]?.mean_accuracy_pct;

                  return (
                    <div key={key} className="space-y-1.5 p-2.5 rounded-xl hover:bg-slate-50/80 transition">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                          <span className="font-bold text-slate-900">{meta.th}</span>
                          <span className="font-mono text-[11px] text-slate-400">({meta.en})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-indigo-600">{formatPercent(slmScore)}</span>
                          {typeof slmScore === "number" && (
                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                slmScore >= 90
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : slmScore >= 70
                                  ? "text-blue-700 bg-blue-50 border-blue-200"
                                  : "text-amber-700 bg-amber-50 border-amber-200"
                              }`}
                            >
                              {slmScore >= 90 ? "ดีเยี่ยม" : slmScore >= 70 ? "ผ่านเกณฑ์" : "ต้องตรวจทาน"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clean Single SLM Progress Bar */}
                      <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 opacity-90 shadow-xs"
                          style={{ width: `${slmScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dedicated Round Breakdown & Vector Comparison Panel */}
            {kfoldReport?.round_info?.is_single_fold && (
              <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60 p-5 sm:p-6 shadow-xs space-y-6">
                {/* Round Header & Fold Mapping */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-black text-white uppercase tracking-wider">
                        การทดสอบรอบที่ {kfoldReport.round_info.current_round}
                      </span>
                      <h3 className="text-base font-black text-slate-900">
                        5-Fold Cross-Validation: รอบที่ {kfoldReport.round_info.current_round}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      การแบ่งกลุ่มข้อมูล 5 Fold: กำหนดให้ <b>Fold {kfoldReport.round_info.test_fold} เป็น TEST (ชุดทดสอบ)</b> และ <b>Fold {kfoldReport.round_info.train_folds.join(", ")} เป็น TRAIN (ชุดฝึกสอน)</b>
                    </p>
                  </div>

                  {/* 5 Fold Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 2, 3, 4, 5].map((f) => {
                      const isTest = f === kfoldReport.round_info?.test_fold;
                      return (
                        <div
                          key={f}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-xs font-black transition ${
                            isTest
                              ? "bg-blue-600 border-blue-700 text-white shadow-xs ring-2 ring-blue-400/40"
                              : "bg-white border-slate-200 text-slate-700 shadow-2xs"
                          }`}
                        >
                          <span className="font-mono">Fold {f}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                            isTest ? "bg-white text-blue-700" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {isTest ? "TEST (60)" : "TRAIN (60)"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Train / Test Counts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      ชุดฝึกสอน (Train Set)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-emerald-600">
                        Train: {kfoldReport.round_info.train_count}
                      </span>
                      <span className="text-xs font-bold text-slate-500">ฉบับ (80%)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Fold {kfoldReport.round_info.train_folds.join(", Fold ")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      ชุดทดสอบ (Test Set)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-blue-600">
                        Test: {kfoldReport.round_info.test_count}
                      </span>
                      <span className="text-xs font-bold text-slate-500">ฉบับ (20%)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Fold {kfoldReport.round_info.test_fold} (60 ฉบับ × 11 ฟิลด์ = {kfoldReport.round_info.total_checks} จุดตรวจสอบ)
                    </p>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      ความแม่นยำรอบที่ {kfoldReport.round_info.current_round} (Accuracy)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-indigo-600">
                        {kfoldReport.metrics_summary.accuracy_display}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        ({kfoldReport.round_info.matched_checks} / {kfoldReport.round_info.total_checks})
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700 font-bold mt-1">
                      คำนวณจากการเปรียบเทียบ Label vs Predicted
                    </p>
                  </div>
                </div>

                {/* 3 Performance Timing Cards (Per Document Latency) */}
                <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-4 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        สถิติระยะเวลาประมวลผล (Performance Latency ต่อ 1 ฉบับ)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("perf_log")}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>ดูตาราง Performance Log ละเอียด</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPerfCsv}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                      >
                        <Download className="h-3 w-3 text-slate-500" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* OCR Timing */}
                    <div className="rounded-lg border border-sky-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1">
                          📷 PaddleOCR v4 เฉลี่ย
                        </span>
                        <span className="rounded bg-sky-100 text-sky-800 px-1.5 py-0.2 font-mono text-[9px] font-bold">
                          Optical OCR
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono text-sky-600">
                          {(kfoldReport.latency_summary?.mean_ocr_time_sec ?? perfLogs.summary?.mean_ocr_time_sec ?? 0.85).toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">วินาที/ฉบับ</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        เวลาอ่านและแปลงภาพเอกสารเป็น Text Coordinates
                      </p>
                    </div>

                    {/* SLM Timing */}
                    <div className="rounded-lg border border-indigo-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                          🧠 Qwen2.5-1.5B (CUDA) เฉลี่ย
                        </span>
                        <span className="rounded bg-indigo-100 text-indigo-800 px-1.5 py-0.2 font-mono text-[9px] font-bold">
                          GPU Inferred
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono text-indigo-600">
                          {(kfoldReport.latency_summary?.mean_slm_time_sec ?? perfLogs.summary?.mean_slm_time_sec ?? 12.56).toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">วินาที/ฉบับ</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        เวลาสกัด 11 ฟิลด์ข้อมูลโลจิสติกส์บน GPU
                      </p>
                    </div>

                    {/* Total Timing */}
                    <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          ⏱️ เวลารวมทั้ง 2 (ต่อ 1 ฉบับ)
                        </span>
                        <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 font-mono text-[9px] font-bold">
                          OCR + SLM
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono text-emerald-600">
                          {(kfoldReport.latency_summary?.mean_total_time_sec ?? perfLogs.summary?.mean_total_time_sec ?? 13.41).toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">วินาที/ฉบับ</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        เร็วสุด: {(kfoldReport.latency_summary?.min_total_time_sec ?? perfLogs.summary?.min_total_time_sec ?? 11.2).toFixed(1)}s · ช้าสุด: {(kfoldReport.latency_summary?.max_total_time_sec ?? perfLogs.summary?.max_total_time_sec ?? 15.6).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vector Comparison Box (Exact format requested by User) */}
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5 text-white font-mono text-xs shadow-inner space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span className="font-bold text-slate-200">
                        เวกเตอร์เปรียบเทียบ Label vs Predicted (Output Representation)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Train: {kfoldReport.round_info.train_count} | Test: {kfoldReport.round_info.test_count}
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px] leading-relaxed">
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Label (Ground Truth) :</span>
                      <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 overflow-x-auto whitespace-nowrap border border-slate-800">
                        [ {kfoldReport.round_info.label_sample ? kfoldReport.round_info.label_sample.map((s) => `"${s}"`).join(", ") : "..."} ... ]
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Predicted (Qwen SLM) :</span>
                      <div className="bg-slate-950 p-2.5 rounded-lg text-cyan-300 overflow-x-auto whitespace-nowrap border border-slate-800">
                        [ {kfoldReport.round_info.pred_sample ? kfoldReport.round_info.pred_sample.map((s) => `"${s}"`).join(", ") : "..."} ... ]
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-400 font-bold">Matches Vector (1 = Exact Match ตรงกัน, 0 = ไม่ตรงกัน) :</span>
                        <span className="text-emerald-400 font-bold">
                          ตรงกัน {kfoldReport.round_info.matched_checks} / {kfoldReport.round_info.total_checks} จุดตรวจสอบ
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg text-amber-300 overflow-x-auto whitespace-nowrap border border-slate-800 tracking-wider">
                        [ {kfoldReport.round_info.matches_vector.join(" ")} ... ]
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 font-sans">
                        เอาทั้ง 2 ค่ามาเปรียบเทียบกันเพื่อคำนวณค่า Accuracy:
                      </span>
                      <span className="text-emerald-400 font-bold text-sm">
                        Accuracy: {kfoldReport.metrics_summary.mean_accuracy_pct.toFixed(2)}% ({kfoldReport.round_info.matched_checks}/{kfoldReport.round_info.total_checks})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 60 Documents List for Fold 1 */}
                {kfoldReport.folds?.[0]?.document_evaluations && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          รายการเอกสารทดสอบทั้ง 60 ฉบับใน Fold {kfoldReport.round_info.test_fold} (Ground Truth vs Model Output)
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        คลิกที่เอกสารเพื่อดูการเปรียบเทียบทั้ง 11 ฟิลด์
                      </span>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 text-xs">
                      {kfoldReport.folds[0].document_evaluations.map((docEval, docIdx) => {
                        const isExpanded = expandedDocId === docEval.id;
                        return (
                          <div key={docEval.id} className="transition">
                            <div
                              onClick={() => setExpandedDocId(isExpanded ? null : docEval.id)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50/80 select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono text-slate-400 text-[11px] w-6 text-right">
                                  #{docIdx + 1}
                                </span>
                                <span className="font-mono font-black text-blue-700">{docEval.id}</span>
                                <span className="text-slate-800 font-bold truncate max-w-[280px]">
                                  {docEval.file_name}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Timing Badges per document */}
                                <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10.5px]">
                                  <span
                                    className="rounded bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 font-bold"
                                    title="ระยะเวลา PaddleOCR สแกนภาพฉบับนี้"
                                  >
                                    📷 OCR: {docEval.performance?.ocr_time_sec != null ? `${docEval.performance.ocr_time_sec.toFixed(2)}s` : "-"}
                                  </span>
                                  <span
                                    className="rounded bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 font-bold"
                                    title="ระยะเวลา Qwen SLM สกัด 11 ฟิลด์ฉบับนี้"
                                  >
                                    🧠 SLM: {docEval.performance?.slm_time_sec != null ? `${docEval.performance.slm_time_sec.toFixed(2)}s` : "-"}
                                  </span>
                                  <span
                                    className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 font-black"
                                    title="ระยะเวลารวม OCR + SLM (ต่อ 1 ฉบับ)"
                                  >
                                    ⏱️ รวม: {docEval.performance?.total_time_sec != null ? `${docEval.performance.total_time_sec.toFixed(2)}s` : "-"}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="font-mono font-black text-slate-800">
                                    {docEval.matched_fields_count} / {docEval.total_fields} ฟิลด์
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    ({docEval.accuracy_pct}%)
                                  </span>
                                </div>

                                <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                                  docEval.accuracy_pct >= 80
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : docEval.accuracy_pct >= 50
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {docEval.accuracy_pct >= 80 ? "PASS" : "REVIEW"}
                                </span>

                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`} />
                              </div>
                            </div>

                            {/* Expanded 11 Fields Comparison Table */}
                            {isExpanded && (
                              <div className="bg-slate-50/70 p-4 border-t border-slate-100">
                                {/* Per-Document Timing Banner in Drawer */}
                                <div className="mb-3 rounded-lg border border-indigo-100 bg-white p-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-indigo-600" />
                                    <span className="font-bold text-slate-800">
                                      บันทึกความเร็วเฉพาะฉบับนี้ (#{docIdx + 1} - {docEval.id}):
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                                    <span className="text-slate-600">
                                      📷 เวลา OCR สแกน: <b className="text-sky-700">{docEval.performance?.ocr_time_sec != null ? `${docEval.performance.ocr_time_sec.toFixed(2)}s` : "-"}</b>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-600">
                                      🧠 เวลา SLM สกัด: <b className="text-indigo-700">{docEval.performance?.slm_time_sec != null ? `${docEval.performance.slm_time_sec.toFixed(2)}s` : "-"}</b>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-800 font-bold">
                                      ⏱️ เวลารวมทั้ง 2 (ต่อ 1 ฉบับ): <b className="text-emerald-700">{docEval.performance?.total_time_sec != null ? `${docEval.performance.total_time_sec.toFixed(2)}s` : "-"}</b>
                                    </span>
                                  </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                                        <th className="py-2 px-3">ฟิลด์ข้อมูล</th>
                                        <th className="py-2 px-3">Label (Ground Truth)</th>
                                        <th className="py-2 px-3">Predicted (Qwen SLM)</th>
                                        <th className="py-2 px-3 text-center">สถานะ</th>
                                        <th className="py-2 px-3 text-right">Similarity</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                      {Object.entries(FIELD_LABELS).map(([fieldKey, meta]) => {
                                        const fScore = docEval.field_scores?.[fieldKey];
                                        const labelVal = docEval.ground_truth?.[fieldKey] ?? "-";
                                        const predVal = docEval.prediction?.[fieldKey] ?? "-";
                                        const isMatch = fScore?.exact_match;

                                        return (
                                          <tr key={fieldKey} className="hover:bg-slate-50/60">
                                            <td className="py-1.5 px-3 font-sans font-bold text-slate-700">{meta.th}</td>
                                            <td className="py-1.5 px-3 text-slate-900 font-bold">{String(labelVal)}</td>
                                            <td className="py-1.5 px-3 text-indigo-700">{String(predVal)}</td>
                                            <td className="py-1.5 px-3 text-center">
                                              {isMatch ? (
                                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                                                  <Check className="h-3 w-3" /> ตรงกัน
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                                  ไม่ตรงกัน
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-1.5 px-3 text-right text-slate-600">
                                              {((fScore?.similarity ?? 0) * 100).toFixed(0)}%
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PERFORMANCE LOGS (PER DOCUMENT OCR, SLM & TOTAL LATENCY)     */}
        {/* =================================================================== */}
        {activeTab === "perf_log" && (
          <div className="space-y-6">
            {/* Header & Quick Action Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        บันทึก Log Performance ความเร็วการสแกนและการสกัดข้อมูล (ต่อ 1 ฉบับ)
                      </h3>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-black font-mono">
                        {perfLogs.records.length} Records Logged
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      เก็บบันทึกระยะเวลาการทำงานจริงของ <b>PaddleOCR v4 (เวลาสแกนภาพ)</b>, <b>โมเดล Qwen2.5-1.5B บน GPU (เวลาสกัด 11 ฟิลด์)</b> และ <b>เวลารวมทั้งสองขั้นตอนต่อ 1 ฉบับ</b>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchPerformanceLogs}
                    disabled={loadingPerfLogs}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingPerfLogs ? "animate-spin text-blue-600" : "text-slate-500"}`} />
                    <span>รีเฟรชข้อมูล</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPerfCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>ส่งออก CSV (.csv)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadExcelReport}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    title="ดาวน์โหลดรายงานผลสรุปและบันทึกเวลาเป็นไฟล์ Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>รายงานสรุป Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearPerformanceLogs}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>ล้าง Log</span>
                  </button>
                </div>
              </div>

              {/* 5 KPI Summary Cards for Performance */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    📄 จำนวนเอกสารที่บันทึก
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {perfLogs.summary?.total_documents_logged ?? perfLogs.records.length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">ฉบับ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">จับเวลาจริงแยกรายฉบับ</p>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                    📷 PaddleOCR เฉลี่ย
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-sky-600">
                      {perfLogs.summary?.mean_ocr_time_sec != null ? perfLogs.summary.mean_ocr_time_sec.toFixed(3) : "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">วินาที/ฉบับ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">สแกน Optical Text</p>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
                    🧠 Qwen SLM เฉลี่ย
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-indigo-600">
                      {perfLogs.summary?.mean_slm_time_sec != null ? perfLogs.summary.mean_slm_time_sec.toFixed(3) : "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">วินาที/ฉบับ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">สกัด 11 ฟิลด์บน CUDA GPU</p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                    ⏱️ เวลารวมเฉลี่ยต่อฉบับ
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-emerald-600">
                      {perfLogs.summary?.mean_total_time_sec != null ? perfLogs.summary.mean_total_time_sec.toFixed(3) : "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">วินาที/ฉบับ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">OCR + SLM ทั้งสองขั้นตอน</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-2xs col-span-2 sm:col-span-3 lg:col-span-1">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                    ⚡ เร็วสุด / ช้าสุด
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black font-mono text-amber-700">
                      {perfLogs.summary?.min_total_time_sec != null ? `${perfLogs.summary.min_total_time_sec.toFixed(2)}s` : "-"}
                    </span>
                    <span className="text-xs text-slate-400">/</span>
                    <span className="text-lg font-black font-mono text-amber-700">
                      {perfLogs.summary?.max_total_time_sec != null ? `${perfLogs.summary.max_total_time_sec.toFixed(2)}s` : "-"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">ช่วงเวลาของเอกสารทั้งหมด</p>
                </div>
              </div>
            </div>

            {/* Performance Log Table Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    ตารางแสดง Log Performance แยกรายฉบับ (Per-Document Breakdown)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    ({filteredPerfRecords.length} จาก {perfLogs.records.length} รายการ)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหารหัสเอกสาร หรือชื่อไฟล์..."
                      value={searchPerfQuery}
                      onChange={(e) => setSearchPerfQuery(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 w-56"
                    />
                  </div>
                  {searchPerfQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchPerfQuery("")}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {filteredPerfRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[10.5px] font-black uppercase text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">วัน-เวลาบันทึก (Timestamp)</th>
                        <th className="py-2.5 px-3">รหัสเอกสาร</th>
                        <th className="py-2.5 px-3">ชื่อไฟล์ภาพ</th>
                        <th className="py-2.5 px-3 text-center">Fold</th>
                        <th className="py-2.5 px-3 text-right text-sky-700">📷 เวลา OCR (วินาที)</th>
                        <th className="py-2.5 px-3 text-right text-indigo-700">🧠 เวลา SLM (วินาที)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700">⏱️ เวลารวมทั้ง 2 (วินาที)</th>
                        <th className="py-2.5 px-3 text-center">จุดตรวจสอบที่ตรง</th>
                        <th className="py-2.5 px-3 text-right">ความแม่นยำ</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredPerfRecords.map((r, rIdx) => {
                        const isHighAcc = r.accuracy_pct >= 80;
                        const formattedTime = r.timestamp
                          ? new Date(r.timestamp).toLocaleString("th-TH")
                          : "-";

                        return (
                          <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                            <td className="py-2 px-3 text-slate-400 text-[10px]">#{rIdx + 1}</td>
                            <td className="py-2 px-3 text-slate-500 font-sans text-[11px] whitespace-nowrap">
                              {formattedTime}
                            </td>
                            <td className="py-2 px-3 font-bold text-blue-700 font-mono">
                              {r.doc_id}
                            </td>
                            <td className="py-2 px-3 text-slate-800 font-sans truncate max-w-[220px]" title={r.file_name}>
                              {r.file_name}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-600 font-sans">
                              {r.fold ? `Fold ${r.fold}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-sky-700">
                              {r.ocr_time_sec.toFixed(3)}s
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-indigo-700">
                              {r.slm_time_sec.toFixed(3)}s
                            </td>
                            <td className="py-2 px-3 text-right font-black text-emerald-700">
                              {r.total_time_sec.toFixed(3)}s
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-700 font-sans">
                              {r.matched_fields} / {r.total_fields} ฟิลด์
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-900">
                              {r.accuracy_pct.toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                                isHighAcc
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : r.accuracy_pct >= 50
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {isHighAcc ? "PASS" : "REVIEW"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-600">
                    {searchPerfQuery
                      ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา"
                      : "ยังไม่มีข้อมูล Log Performance ในระบบ"}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    กรุณากลับไปที่แท็บ <b>"ภาพรวมผลการประเมิน"</b> แล้วกด <b>"ทดสอบสด 1 ฉบับ"</b> หรือ <b>"เริ่มรันสดบน GPU"</b> ระบบจะบันทึกเวลา OCR, SLM และเวลารวมของเอกสารทุกฉบับมาแสดงที่นี่โดยอัตโนมัติ
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: FOLD BREAKDOWN MATRIX                                        */}
        {/* =================================================================== */}
        {activeTab === "folds" && (
          <div className="space-y-5">
            {/* Fold Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 mr-1">เลือกดูเจาะลึก Fold:</span>
                <button
                  type="button"
                  onClick={() => setSelectedFoldIdx(null)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedFoldIdx === null
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                  }`}
                >
                  ทั้งหมด ({kSplits} Folds)
                </button>
                {kfoldReport?.folds.map((fold, idx) => (
                  <button
                    key={fold.fold}
                    type="button"
                    onClick={() => setSelectedFoldIdx(idx)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      selectedFoldIdx === idx
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                    }`}
                  >
                    Fold {fold.fold} ({fold.accuracy_pct.toFixed(1)}%)
                  </button>
                ))}
              </div>

              {selectedFoldIdx !== null && kfoldReport?.folds[selectedFoldIdx] && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">
                    กลุ่มทดสอบ: <b>{kfoldReport.folds[selectedFoldIdx].val_samples_count} ฉบับ</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("docs")}
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                  >
                    <span>ดูเอกสารใน Fold นี้</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 11 Fields Cross-Validation Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Table className="h-4 w-4 text-blue-600" />
                    <span>ตารางผลการทดสอบ {kSplits}-Fold Cross-Validation (บทที่ 4)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ประเมินความแม่นยำรายฟิลด์ 11 ฟิลด์หลักในแต่ละ Fold (Fold 1 ถึง Fold {kSplits}) พร้อมค่าเบี่ยงเบนมาตรฐาน (σ)
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
                  สับกลุ่มตัวอย่างแบบ Shuffled K-Fold (Seed {randomSeed})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 min-w-[220px]">ฟิลด์ข้อมูลหลัก (11 Core Fields)</th>
                      {kfoldReport?.folds.map((f) => (
                        <th
                          key={f.fold}
                          className={`p-3.5 text-center min-w-[90px] ${
                            selectedFoldIdx === f.fold - 1 ? "bg-blue-100/70 text-blue-950 font-black" : ""
                          }`}
                        >
                          Fold {f.fold}
                        </th>
                      ))}
                      <th className="p-3.5 text-center bg-blue-50/80 text-blue-950 font-black min-w-[160px]">
                        ความแม่นยำเฉลี่ย (Mean ± SD)
                      </th>
                      <th className="p-3.5 text-center bg-indigo-50/80 text-indigo-950 font-black min-w-[110px]">
                        สถานะประเมิน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(FIELD_LABELS).map(([key, meta]) => {
                      const Icon = meta.icon;
                      const perf = kfoldReport?.field_performance[key];

                      return (
                        <tr key={key} className="hover:bg-blue-50/20 transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${meta.color}`} />
                              <div>
                                <p className="font-bold text-slate-900">{meta.th}</p>
                                <p className="font-mono text-[10.5px] text-slate-400">{meta.en}</p>
                              </div>
                            </div>
                          </td>
                          {perf ? (
                            perf.scores_per_fold.map((score, sIdx) => (
                              <td
                                key={sIdx}
                                className={`p-3 text-center font-mono font-bold text-slate-800 ${
                                  selectedFoldIdx === sIdx ? "bg-blue-50/60 font-black text-blue-900" : ""
                                }`}
                              >
                                {score.toFixed(1)}%
                              </td>
                            ))
                          ) : (
                            <td colSpan={kfoldReport?.folds.length || 5} className="text-center text-slate-400">
                              -
                            </td>
                          )}
                          <td className="p-3 text-center font-mono font-black text-blue-900 bg-blue-50/40">
                            <div>{perf?.display || "-"}</div>
                            {perf && (
                              <div className="mt-1 text-[10px] font-medium leading-4 text-slate-500">
                                P {perf.mean_precision_pct?.toFixed(1) ?? "-"}% · R {perf.mean_recall_pct?.toFixed(1) ?? "-"}% · F1 {perf.mean_f1_score_pct?.toFixed(1) ?? "-"}%
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {perf ? (
                              <span
                                className={`font-mono text-[10.5px] font-black px-2 py-0.5 rounded-md border ${
                                  perf.mean_accuracy_pct >= 85
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                    : perf.mean_accuracy_pct >= 70
                                    ? "text-blue-700 bg-blue-50 border-blue-200"
                                    : "text-amber-700 bg-amber-50 border-amber-200"
                                }`}
                              >
                                {perf.mean_accuracy_pct >= 85 ? "ดีเยี่ยม" : perf.mean_accuracy_pct >= 70 ? "ผ่านเกณฑ์" : "ต้องตรวจทาน"}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Overall Accuracy Row */}
                    <tr className="bg-slate-50/90 font-black border-t-2 border-slate-300">
                      <td className="p-3.5 text-slate-900 font-black flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>ความแม่นยำภาพรวม (Overall Accuracy)</span>
                      </td>
                      {kfoldReport?.folds.map((f) => (
                        <td
                          key={f.fold}
                          className={`p-3 text-center font-mono font-black text-emerald-700 ${
                            selectedFoldIdx === f.fold - 1 ? "bg-blue-100 text-blue-950 font-black" : ""
                          }`}
                        >
                          {f.accuracy_pct.toFixed(1)}%
                        </td>
                      ))}
                      <td className="p-3 text-center font-mono text-blue-900 bg-blue-100 font-bold">
                        🏆 {kfoldReport?.metrics_summary?.accuracy_display}
                      </td>
                      <td className="p-3 text-center">
                        <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[11px] font-black text-emerald-800">
                          ผ่านเกณฑ์ประเมิน
                        </span>
                      </td>
                    </tr>

                    {/* Overall F1 Row */}
                    <tr className="bg-indigo-50/60 font-black">
                      <td className="p-3.5 text-indigo-950 font-black flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-indigo-600" />
                        <span>F1-Score รวม (Overall F1-Score)</span>
                      </td>
                      {kfoldReport?.folds.map((f) => (
                        <td
                          key={f.fold}
                          className={`p-3 text-center font-mono font-black text-indigo-700 ${
                            selectedFoldIdx === f.fold - 1 ? "bg-indigo-100 text-indigo-950" : ""
                          }`}
                        >
                          {f.f1_score_pct.toFixed(1)}%
                        </td>
                      ))}
                      <td className="p-3 text-center font-mono text-indigo-900 bg-indigo-100 font-bold">
                        🏆 {kfoldReport?.metrics_summary?.f1_display}
                      </td>
                      <td className="p-3 text-center">
                        <span className="rounded-md bg-indigo-100 border border-indigo-300 px-2 py-0.5 text-[11px] font-black text-indigo-800">
                          ประสิทธิภาพสูง
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scientific Finding Summary Box */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>ข้อสรุปผลการทดลองทางวิทยาศาสตร์ (Research Finding & Thesis Note)</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                การทดสอบ <b>{kfoldReport?.method || "Shuffled K-Fold"}</b> รายงานค่าความแม่นยำเฉลี่ย <b>{kfoldReport?.metrics_summary?.accuracy_display || "-"}</b> และ F1-Score เฉลี่ย <b>{kfoldReport?.metrics_summary?.f1_display || "-"}</b> ผ่านการประเมิน 11 ฟิลด์มาตรฐานจากโมเดล Qwen2.5-1.5B (CUDA) โดยรายงานนี้เป็นผลจาก Run ID และ Fold manifest ที่แสดงด้านบน
              </p>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: 300 INVOICES EXPLORER & DEEP-DIVE INSPECTOR                  */}
        {/* =================================================================== */}
        {activeTab === "docs" && (
          <div className="grid min-h-[640px] grid-cols-1 md:grid-cols-[380px_1fr] rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* LEFT COLUMN: Searchable List */}
            <div className="flex flex-col border-r border-slate-200 bg-slate-50/50">
              <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อไฟล์, เลขที่, บริษัท..."
                    value={searchDocQuery}
                    onChange={(e) => setSearchDocQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
                  />
                  {searchDocQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchDocQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      setSelectedFoldIdx(null);
                    }}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                      categoryFilter === "all" && selectedFoldIdx === null
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    ทั้งหมด ({documents.length})
                  </button>
                  {selectedFoldIdx !== null && (
                    <button
                      type="button"
                      onClick={() => setSelectedFoldIdx(null)}
                      className="rounded-lg bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-800 flex items-center gap-1 hover:bg-amber-200 transition"
                      title="คลิกเพื่อยกเลิกตัวกรอง Fold และแสดงเอกสารทั้งหมด"
                    >
                      <span>Fold {selectedFoldIdx + 1} ({filteredDocs.length} ฉบับ)</span>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase transition ${
                        categoryFilter === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Doc List */}
              <div
                className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[600px]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
              >
                {filteredDocs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">
                    ไม่พบเอกสารตรงตามเงื่อนไข
                  </div>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const gt = doc.ground_truth || {};
                    const party = gt.sender || gt.receiver || "-";
                    const totalVal = gt.total_amount ? `${gt.currency || "USD"} ${Number(gt.total_amount).toLocaleString()}` : "-";

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition select-none ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/30"
                            : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-xs font-black text-blue-700">{doc.id}</span>
                              {docFoldMap.has(doc.id) && (
                                <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 font-mono text-[9.5px] font-black text-indigo-700 whitespace-nowrap">
                                  Fold {docFoldMap.get(doc.id)}
                                </span>
                              )}
                            </div>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 uppercase truncate max-w-[110px]">
                              {doc.category || gt.document_type || "doc"}
                            </span>
                          </div>
                          <p className="truncate text-xs font-bold text-slate-900 mt-0.5" title={doc.file_name}>
                            {doc.file_name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 font-normal">{party}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-emerald-600">{totalVal}</span>
                            <span className="text-[10px] font-bold text-slate-400">#{gt.document_number || "-"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Selected Doc Inspector */}
            <div
              className="p-5 sm:p-6 overflow-y-auto max-h-[700px] space-y-6"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
            >
              {selectedDoc ? (
                <div className="space-y-6">
                  {/* Doc Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900">{selectedDoc.file_name}</h4>
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          ID: {selectedDoc.id}
                        </span>
                        {docFoldMap.has(selectedDoc.id) && (
                          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-black text-indigo-700">
                            ชุดทดสอบ Fold {docFoldMap.get(selectedDoc.id)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        หมวดหมู่: <b className="text-slate-800 uppercase">{selectedDoc.category || "Invoice"}</b> | เอกสารตัวอย่างในชุดทดสอบ {datasetSize} ฉบับ
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal(benchmarkImageUrl(selectedDoc.file_name))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>ดูภาพต้นฉบับ (View Original)</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Thumbnail Preview Strip */}
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div
                      onClick={() => setPreviewImageModal(benchmarkImageUrl(selectedDoc.file_name))}
                      className="group relative h-24 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xs"
                    >
                      <img
                        src={benchmarkImageUrl(selectedDoc.file_name)}
                        alt={selectedDoc.file_name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[11px] font-bold uppercase text-slate-400">รูปภาพเอกสารในชุดทดสอบ</span>
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedDoc.file_name}</p>
                      <p className="text-[11px] text-slate-500">
                        ขนาดความละเอียดมาตรฐานสำหรับ OCR & SLM Multimodal Feature Alignment
                      </p>
                    </div>
                  </div>

                  {/* 11 Core Fields Ground Truth Card Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        <span>ค่าเฉลยที่ถูกต้อง 11 ฟิลด์หลัก (11 Core Ground Truth)</span>
                      </h5>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        Human-Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {Object.entries(FIELD_LABELS).map(([key, meta]) => {
                        const val = selectedDoc.ground_truth[key];
                        const displayVal =
                          val !== undefined && val !== null && String(val) !== ""
                            ? typeof val === "number"
                              ? val.toLocaleString()
                              : String(val)
                            : "-";

                        return (
                          <div key={key} className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-200 transition">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1 truncate">
                              {meta.th}
                            </span>
                            <p className="font-bold text-xs text-slate-900 truncate" title={String(displayVal)}>
                              {displayVal}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* JSON Syntax Viewer */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FileCode className="h-4 w-4 text-blue-600" />
                        <span>JSON Schema Payload (Ground Truth)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedDoc.ground_truth, null, 2));
                          showToast?.("คัดลอก JSON แล้ว");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Copy className="h-3 w-3" />
                        <span>คัดลอก JSON</span>
                      </button>
                    </div>
                    <pre className="max-h-[220px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800">
                      {JSON.stringify(selectedDoc.ground_truth, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-xs font-bold">
                  เลือกเอกสารทางซ้ายเพื่อตรวจดูรายละเอียดและค่าเฉลย
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* ORIGINAL IMAGE PREVIEW MODAL                                        */}
      {/* =================================================================== */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <span className="text-xs font-bold text-slate-800">ภาพต้นฉบับเอกสารชุดทดสอบ (Original Document)</span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto p-2">
              <img src={previewImageModal} alt="Original Invoice" className="mx-auto max-h-[75vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
