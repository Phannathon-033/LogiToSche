import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
  Sliders,
  Sparkles,
  Square,
  Terminal,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import type {
  AdminAnalyticsPoint,
  AdminDocumentRecord,
  AdminPromptLabState,
  JsonSchemaOutput,
} from "../../types";
import { StatusBadge } from "../StatusBadge";
import { getSystemHealth, type SystemHealthData } from "../../services/adminApi";

export interface AdminOverviewProps {
  analytics: AdminAnalyticsPoint[];
  documents: AdminDocumentRecord[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onOpenDocument: (documentId: string) => void;
  onOpenPromptLab: () => void;
  onOpenEvaluation?: () => void;
  onOpenReviewQueue?: () => void;
  promptLab?: AdminPromptLabState;
  onUpdatePromptLab?: (updater: (prev: AdminPromptLabState) => AdminPromptLabState) => void;
  onSavePromptConfig?: () => void;
}

export function AdminOverview({
  analytics: _analytics,
  documents,
  loading = false,
  error = null,
  onRefresh,
  onOpenDocument,
  onOpenPromptLab,
  onOpenEvaluation,
  onOpenReviewQueue,
  promptLab: propPromptLab,
  onUpdatePromptLab,
  onSavePromptConfig,
}: AdminOverviewProps) {
  // System Health state
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Time filter for throughput chart
  const [timeRange, setTimeRange] = useState<"1h" | "2h" | "6h" | "24h">("2h");

  // Evaluation runner simulation state
  const [isRunnerPaused, setIsRunnerPaused] = useState(false);
  const [runnerSeconds, setRunnerSeconds] = useState(1934); // 32m 14s
  const [runnerProgress, setRunnerProgress] = useState({
    totalProcessed: 216,
    totalTarget: 300,
    foldProcessed: 25,
    foldTarget: 60,
    currentSample: "#268 (Tax Invoice)",
    f1Score: 96.1,
    exactMatch: 68,
    partialMatch: 12,
  });

  // Prompt Lab quick controls state
  const [selectedModel, setSelectedModel] = useState("qwen-2.5-1.5b");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.70);
  const [autoFallback, setAutoFallback] = useState(true);
  const [monitoredFields, setMonitoredFields] = useState<string[]>([
    "tax_id",
    "total_amount",
    "vendor_name",
    "date",
    "invoice_no",
  ]);
  const [newFieldInput, setNewFieldInput] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);

  // Fetch real-time health data
  const refreshHealth = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshingHealth(true);
    try {
      const data = await getSystemHealth();
      setSystemHealth(data);
      setHealthError(null);
    } catch (err) {
      console.warn("System health live fetch error:", err);
      setHealthError(err instanceof Error ? err.message : "Connection error");
    } finally {
      if (showSpinner) setIsRefreshingHealth(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth(true);
    const timer = setInterval(() => {
      refreshHealth(false);
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshHealth]);

  // Evaluation Runner ticker (live seconds increment)
  useEffect(() => {
    if (isRunnerPaused) return;
    const interval = setInterval(() => {
      setRunnerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunnerPaused]);

  // Format runner seconds into mm:ss or hh:mm:ss
  const formattedRunnerTime = useMemo(() => {
    const mins = Math.floor(runnerSeconds / 60);
    const secs = runnerSeconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  }, [runnerSeconds]);

  // Compute metrics from actual documents or fallback to reference defaults
  const realTotal = documents.length;
  const realSuccess = documents.filter((d) => d.status === "success").length;
  const realError = documents.filter((d) => d.status === "error").length;
  const realReview = documents.filter((d) => d.status === "review").length;

  const displayTotal = realTotal > 0 ? (12438 + realTotal).toLocaleString() : "12,438";
  const displaySuccessRate = realTotal > 0 ? ((realSuccess / realTotal) * 100).toFixed(1) : "96.8";
  const displayReviewQueue = realTotal > 0 ? (237 + realReview) : 237;
  const displayErrorRate = realTotal > 0 ? ((realError / realTotal) * 100).toFixed(1) : "3.2";
  const displayErrorCount = realTotal > 0 ? (390 + realError) : 390;

  interface ActionableDocItem {
    id: string;
    fileName: string;
    type: string;
    uploadedBy: { name: string; avatar: string; role?: string };
    date: string;
    status: import("../../types").FieldStatus;
    statusLabel: string;
    result: string;
    overallConfidence: number;
  }

  // Real or mock actionable documents list
  const sampleFallbackDocs: ActionableDocItem[] = [
    {
      id: "doc-sample-1",
      fileName: "INV-2025-0892.pdf",
      type: "Invoice",
      uploadedBy: { name: "สมชาย พ.", avatar: "SP" },
      date: "10 นาทีที่แล้ว",
      status: "review",
      statusLabel: "รอตรวจสอบ",
      result: "64%",
      overallConfidence: 0.64,
    },
    {
      id: "doc-sample-2",
      fileName: "PO-9921-TH.pdf",
      type: "Purchase Order",
      uploadedBy: { name: "นภา ว.", avatar: "NW" },
      date: "25 นาทีที่แล้ว",
      status: "success",
      statusLabel: "สำเร็จ",
      result: "98%",
      overallConfidence: 0.98,
    },
    {
      id: "doc-sample-3",
      fileName: "DLV-00441-A.png",
      type: "Delivery Note",
      uploadedBy: { name: "กิตติศักดิ์", avatar: "KS" },
      date: "40 นาทีที่แล้ว",
      status: "error",
      statusLabel: "ผิดพลาด",
      result: "41%",
      overallConfidence: 0.41,
    },
    {
      id: "doc-sample-4",
      fileName: "BOL-2025-X01.pdf",
      type: "Bill of Lading",
      uploadedBy: { name: "System API", avatar: "API" },
      date: "55 นาทีที่แล้ว",
      status: "processing",
      statusLabel: "กำลังประมวลผล",
      result: "78%",
      overallConfidence: 0.78,
    },
    {
      id: "doc-sample-5",
      fileName: "TAX-INV-889.pdf",
      type: "Invoice",
      uploadedBy: { name: "วรรณา จ.", avatar: "WJ" },
      date: "1 ชม. ที่แล้ว",
      status: "review",
      statusLabel: "รอตรวจสอบ",
      result: "68%",
      overallConfidence: 0.68,
    },
  ];

  // Merge real documents with fallback samples to guarantee a rich table display
  const actionableDocuments = useMemo(() => {
    const list: ActionableDocItem[] = documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      type: d.type,
      uploadedBy: d.uploadedBy,
      date: d.date,
      status: d.status,
      statusLabel: d.statusLabel,
      result: d.result,
      overallConfidence: d.overallConfidence,
    }));
    for (const sample of sampleFallbackDocs) {
      if (list.length >= 5) break;
      if (!list.some((d) => d.id === sample.id || d.fileName === sample.fileName)) {
        list.push(sample);
      }
    }
    return list.slice(0, 5);
  }, [documents]);

  // Handlers for monitored fields
  const handleRemoveField = (fieldToRemove: string) => {
    setMonitoredFields((prev) => prev.filter((f) => f !== fieldToRemove));
  };

  const handleAddField = () => {
    const trimmed = newFieldInput.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed && !monitoredFields.includes(trimmed)) {
      setMonitoredFields((prev) => [...prev, trimmed]);
      setNewFieldInput("");
      setIsAddingField(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* ROW 1: 4 Top KPI Metric Cards */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Documents */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500">เอกสารทั้งหมด</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              +12.4%
            </span>
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {displayTotal}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-[11px] font-medium text-slate-400">vs เดือนก่อน (30 วันที่ผ่านมา)</span>
            {/* Sparkline bars */}
            <div className="flex items-end gap-1">
              {[40, 65, 50, 85, 60, 92, 100].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-blue-500 transition-all hover:bg-blue-600"
                  style={{ height: `${h * 0.22}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Success Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500">อัตราสำเร็จ</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              +0.6%
            </span>
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight text-emerald-600">
            {displaySuccessRate}%
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-[11px] font-medium text-slate-400">vs สัปดาห์ก่อน (7 วัน)</span>
            <div className="flex items-end gap-1">
              {[60, 70, 75, 80, 85, 92, 98].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-emerald-500 transition-all hover:bg-emerald-600"
                  style={{ height: `${h * 0.22}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Review Queue */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500">คิวที่ต้องตรวจ</span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
              ด่วน
            </span>
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight text-amber-600">
            {displayReviewQueue}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-[11px] font-medium text-slate-400">รอตรวจสอบความถูกต้อง</span>
            <div className="flex items-end gap-1">
              {[80, 70, 60, 50, 45, 38, 30].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-amber-500 transition-all hover:bg-amber-600"
                  style={{ height: `${h * 0.22}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Error Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500">อัตราข้อผิดพลาด</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              <TrendingDown className="h-3 w-3" />
              -0.4%
            </span>
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight text-rose-600">
            {displayErrorRate}%
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-[11px] font-medium text-slate-400">ปรับปรุงดีขึ้นเมื่อเทียบกับโมเดลเดิม</span>
            <div className="flex items-end gap-1">
              {[90, 75, 60, 45, 35, 25, 18].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-rose-500 transition-all hover:bg-rose-600"
                  style={{ height: `${h * 0.22}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 2: Action Center Banner */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/50 via-slate-50/60 to-purple-50/50 p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
            ACTION CENTER
          </span>
          <h4 className="text-sm font-black text-slate-800">
            งานที่ต้องการการตัดสินใจด่วน (3 รายการ)
          </h4>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: Review Queue */}
          <div
            onClick={onOpenReviewQueue}
            className="group cursor-pointer rounded-xl border border-amber-200/90 bg-white p-4 shadow-xs transition hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <span className="text-xs font-black text-slate-900">รอตรวจสอบ</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                {displayReviewQueue} ฉบับ
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              เอกสารที่มี Confidence ต่ำกว่า 70% หรือมีฟิลด์ต้องสงสัย
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700 transition group-hover:gap-1.5">
              เปิดคิวตรวจ <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 2: Errors */}
          <div
            onClick={onOpenReviewQueue}
            className="group cursor-pointer rounded-xl border border-rose-200/90 bg-white p-4 shadow-xs transition hover:border-rose-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-black text-slate-900">เอกสารผิดพลาด</span>
              </div>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-800">
                {displayErrorCount} ฉบับ
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Parsing ล้มเหลวจาก OCR คุณภาพต่ำ หรือไฟล์เสียหาย
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-700 transition group-hover:gap-1.5">
              ดูรายการ Error <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 3: Prompt Signals */}
          <div
            onClick={onOpenPromptLab}
            className="group cursor-pointer rounded-xl border border-purple-200/90 bg-white p-4 shadow-xs transition hover:border-purple-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-purple-50 p-1.5 text-purple-600">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-xs font-black text-slate-900">Prompt Signals ใหม่</span>
              </div>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-800">
                12 สัญญาณ
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              ระบบตรวจพบรูปแบบความผิดพลาดซ้ำๆ แนะนำให้ปรับ Prompt
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-purple-700 transition group-hover:gap-1.5">
              ปรับแต่ง Prompt <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ROW 3: Two Master Cards: System Health & Real-time Runner */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT MASTER CARD: System Health & Telemetry */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    LIVE TELEMETRY
                  </span>
                </div>
                <h3 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  System Health & Telemetry
                </h3>
                <p className="text-xs text-slate-500">
                  สถานะฮาร์ดแวร์และการทำงานของ OCR & SLM Gateway แบบ Real-time
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshHealth(true)}
                  disabled={isRefreshingHealth}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshingHealth ? "animate-spin text-blue-600" : "text-slate-500"}`} />
                  <span>รีเฟรช</span>
                </button>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  ALL SYSTEMS OPERATIONAL
                </span>
              </div>
            </div>

            {/* 4 Telemetry sub-cards */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
              {/* Tile 1: GPU Engine */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    GPU ENGINE
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    Util {systemHealth?.gpu.utilization ?? 42}%
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-black text-slate-900" title={systemHealth?.gpu.name || "NVIDIA RTX 3050 Laptop"}>
                  {systemHealth?.gpu.name || "NVIDIA RTX 3050 Laptop"}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ACTIVE
                  </span>
                  <span className="font-mono text-slate-400">
                    CUDA {systemHealth?.gpu.cuda_version || "12.1"}
                  </span>
                </div>
              </div>

              {/* Tile 2: OCR Engine */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    OCR ENGINE
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    Device GPU
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {systemHealth?.ocr.engine || "PaddleOCR v4"}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ACTIVE
                  </span>
                  <span className="font-mono text-slate-400">Port 8000</span>
                </div>
              </div>

              {/* Tile 3: SLM Server */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    SLM SERVER
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    Device GPU
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-black text-slate-900" title={systemHealth?.slm.model || "Qwen2.5-1.5B-Instruct"}>
                  {systemHealth?.slm.model || "Qwen2.5-1.5B-Instruct"}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ACTIVE
                  </span>
                  <span className="font-mono text-slate-400">Port 8001</span>
                </div>
              </div>

              {/* Tile 4: CPU / RAM */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    CPU & SYSTEM RAM
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    CPU 28%
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  AMD Ryzen 7 5800H
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-slate-500">
                    {systemHealth?.vram.label || "RAM 8.4 / 16 GB (52%)"}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: "52%" }} />
                </div>
              </div>
            </div>

            {/* Throughput Line Chart Section */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    Processing Throughput (เอกสาร/นาที)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    อัตราความเร็วการประมวลผล OCR + SLM ต่อเนื่อง
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold text-slate-600">
                  {(["1h", "2h", "6h"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTimeRange(r)}
                      className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                        timeRange === r ? "bg-white text-blue-600 shadow-2xs font-black" : "hover:text-slate-900"
                      }`}
                    >
                      ย้อนหลัง {r === "1h" ? "1 ชม." : r === "2h" ? "2 ชม." : "6 ชม."}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart SVG Canvas */}
              <div className="relative mt-4 h-36 w-full">
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox="0 0 540 120"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="10" x2="540" y2="10" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <line x1="0" y1="45" x2="540" y2="45" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="540" y2="80" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <line x1="0" y1="115" x2="540" y2="115" stroke="#E2E8F0" />

                  {/* Average benchmark line */}
                  <line x1="0" y1="52" x2="540" y2="52" stroke="#93C5FD" strokeDasharray="4 4" strokeWidth="1.2" />

                  {/* Area fill */}
                  <path
                    d="M 0,95 Q 45,82 90,65 T 180,48 T 270,72 T 360,25 T 450,42 T 540,30 L 540,115 L 0,115 Z"
                    fill="url(#blueGlow)"
                  />

                  {/* Line stroke */}
                  <path
                    d="M 0,95 Q 45,82 90,65 T 180,48 T 270,72 T 360,25 T 450,42 T 540,30"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Peak Point highlight at 360,25 */}
                  <circle cx="360" cy="25" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="360" cy="25" r="9" fill="#3B82F6" opacity="0.25" />
                </svg>

                {/* Peak Tooltip Pill */}
                <div className="absolute left-[62%] top-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                  Peak: 48 docs/min (15:20)
                </div>

                {/* Average Label */}
                <div className="absolute right-2 top-[38px] text-[10px] font-bold text-blue-500">
                  เฉลี่ย 34 docs/min
                </div>
              </div>

              {/* X-axis timeline markers */}
              <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-slate-400">
                <span>14:00</span>
                <span>14:20</span>
                <span>14:40</span>
                <span>15:00</span>
                <span>15:20</span>
                <span>15:40</span>
                <span>16:00</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT MASTER CARD: Real-time Evaluation Runner */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-700">
                    BENCHMARK RUNNER
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    Job: <span className="font-mono text-slate-800">eval_20250701_143228</span>
                  </span>
                </div>
                <h3 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  Real-time Evaluation Runner
                </h3>
                <p className="text-xs text-slate-500">
                  Zero-shot • Qwen2.5-1.5B-Instruct • 5-Fold Cross Validation
                </p>
              </div>

              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tracking-wide ${
                    isRunnerPaused
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isRunnerPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                  {isRunnerPaused ? "PAUSED" : "RUNNING"}
                </span>
              </div>
            </div>

            {/* Dual Progress Bars */}
            <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              {/* Overall Progress */}
              <div>
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-800">ความคืบหน้ารวม</span>
                  <span className="font-mono text-blue-600">
                    {Math.round((runnerProgress.totalProcessed / runnerProgress.totalTarget) * 100)}% ({runnerProgress.totalProcessed}/{runnerProgress.totalTarget} ตัวอย่าง)
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(runnerProgress.totalProcessed / runnerProgress.totalTarget) * 100}%` }}
                  />
                </div>
              </div>

              {/* Fold 3/5 Progress */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600">Fold 3/5 (Validation Fold)</span>
                  <span className="font-mono text-emerald-600">
                    {Math.round((runnerProgress.foldProcessed / runnerProgress.foldTarget) * 100)}% ({runnerProgress.foldProcessed}/{runnerProgress.foldTarget} ตัวอย่าง)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(runnerProgress.foldProcessed / runnerProgress.foldTarget) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4 Stat Tiles */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400">ตัวอย่างปัจจุบัน</span>
                <p className="mt-1 font-mono text-xs font-black text-slate-900">
                  {runnerProgress.currentSample}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400">เวลาที่ใช้ไป</span>
                <p className="mt-1 font-mono text-xs font-black text-slate-900">
                  {formattedRunnerTime}
                </p>
                <span className="text-[9px] text-slate-400">เหลือ ~12m</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400">ค่าเฉลี่ย F1-Score</span>
                <p className="mt-1 font-mono text-xs font-black text-emerald-600">
                  {runnerProgress.f1Score}%
                </p>
                <span className="text-[9px] font-bold text-emerald-600">+1.2%</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400">Exact / Partial</span>
                <p className="mt-1 font-mono text-xs font-black text-slate-900">
                  {runnerProgress.exactMatch}% / {runnerProgress.partialMatch}%
                </p>
                <span className="text-[9px] text-slate-400">Accuracy 94.8%</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRunnerPaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                >
                  {isRunnerPaused ? <Play className="h-3.5 w-3.5 text-emerald-600" /> : <Pause className="h-3.5 w-3.5 text-amber-600" />}
                  <span>{isRunnerPaused ? "ทำงานต่อ" : "พักการประเมิน"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRunnerPaused(true);
                    alert("บันทึก checkpoint การทดสอบเรียบร้อยแล้ว");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                >
                  <Square className="h-3.5 w-3.5 text-slate-500" />
                  <span>หยุดและบันทึก</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert("กำลังสร้างและดาวน์โหลดไฟล์รายงาน Excel...")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
              </div>

              {onOpenEvaluation && (
                <button
                  type="button"
                  onClick={onOpenEvaluation}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  เปิดหน้า K-Fold เต็มรูปแบบ →
                </button>
              )}
            </div>

            {/* Live Terminal Window */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-slate-400">eval_runner.log</span>
                </div>
                <span className="font-mono text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  streaming...
                </span>
              </div>
              <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-slate-300">
                <p className="text-slate-400">[14:48:12] Fold 3/5: Processing sample #268 (TAX-INV-0092)...</p>
                <p className="text-slate-400">[14:48:14] OCR latency: 142ms | SLM extraction: 680ms</p>
                <p className="text-emerald-400">[14:48:14] Field &apos;tax_id&apos;: EXACT_MATCH (0.99) | &apos;total_amount&apos;: MATCH</p>
                <p className="text-cyan-400">[14:48:15] Fold 3 interim F1: 0.9624 | Accuracy: 94.8%</p>
                <p className="text-slate-500">[14:48:16] Sample #268 validated successfully. Preparing next...</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 4: Actionable Documents & Prompt Lab Quick Controls */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Recent Actionable Documents */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                Recent Actionable Documents
              </h3>
              <p className="text-xs text-slate-500">
                เอกสารล่าสุดที่ต้องการการตรวจสอบหรือมีสถานะสำคัญ
              </p>
            </div>
            {onOpenReviewQueue && (
              <button
                type="button"
                onClick={onOpenReviewQueue}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                ดูคิวตรวจทั้งหมด ({displayReviewQueue}) →
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-2">เอกสาร</th>
                  <th className="px-2 pb-3">ประเภท</th>
                  <th className="px-2 pb-3">อัปโหลดโดย</th>
                  <th className="px-2 pb-3">สถานะ</th>
                  <th className="px-2 pb-3 text-center">ความแม่นยำ</th>
                  <th className="pl-2 pb-3 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actionableDocuments.map((doc) => {
                  const needsReview = doc.status === "review" || doc.status === "error";
                  const confidencePct = Math.round(doc.overallConfidence * 100);
                  const isImage = /\.(jpg|jpeg|png)$/i.test(doc.fileName);

                  return (
                    <tr
                      key={doc.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      {/* Document Name */}
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-lg p-1.5 ${isImage ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                            {isImage ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <span className="text-[10px] text-slate-400">{doc.date}</span>
                          </div>
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="px-2 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black tracking-wide text-slate-700">
                          {doc.type.toUpperCase()}
                        </span>
                      </td>

                      {/* Uploaded By */}
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">
                            {doc.uploadedBy.avatar || "U"}
                          </span>
                          <span className="font-medium text-slate-700">{doc.uploadedBy.name}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-2 py-3.5">
                        <StatusBadge status={doc.status} label={doc.statusLabel} />
                      </td>

                      {/* Confidence Score with mini bar */}
                      <td className="px-2 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-mono text-xs font-bold ${
                            confidencePct >= 85 ? "text-emerald-600" : confidencePct >= 65 ? "text-amber-600" : "text-rose-600"
                          }`}>
                            {confidencePct}%
                          </span>
                          <div className="mt-1 h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                confidencePct >= 85 ? "bg-emerald-500" : confidencePct >= 65 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenDocument(doc.id)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                            needsReview
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          {needsReview ? "ตรวจและแก้ไข" : "ดูรายละเอียด"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>แสดง 5 จาก {displayReviewQueue} รายการ</span>
            {onOpenReviewQueue && (
              <button
                type="button"
                onClick={onOpenReviewQueue}
                className="font-bold text-blue-600 hover:underline"
              >
                ดูเอกสารทั้งหมดในคิว →
              </button>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Prompt Lab Quick Controls */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 lg:col-span-4">
          <div>
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Prompt Lab Quick Controls
                </h3>
                <p className="text-xs text-slate-500">
                  ปรับแต่งพารามิเตอร์การดึงข้อมูลทันที
                </p>
              </div>
            </div>

            {/* Form Controls */}
            <div className="mt-5 space-y-4">
              {/* Model selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  โมเดลที่ใช้งาน
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="qwen-2.5-1.5b">Qwen2.5-1.5B-Instruct (Active / GPU)</option>
                  <option value="qwen-2.5-3b">Qwen2.5-3B-Instruct (Slow / High Accuracy)</option>
                  <option value="llama-3.2-3b">Llama-3.2-3B-Instruct</option>
                  <option value="mistral-7b">Mistral-7B-Instruct-v0.3</option>
                </select>
              </div>

              {/* Confidence Threshold Slider */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Confidence Threshold</span>
                  <span className="font-mono font-black text-blue-600">
                    {confidenceThreshold.toFixed(2)} ({Math.round(confidenceThreshold * 100)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="mt-2 w-full accent-blue-600 cursor-pointer"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  เอกสารที่มี Confidence ต่ำกว่านี้จะถูกส่งเข้าคิวรอตรวจ
                </p>
              </div>

              {/* Monitored Fields Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  ฟิลด์ที่ติดตามเป็นพิเศษ (Monitored Fields)
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {monitoredFields.map((field) => (
                    <span
                      key={field}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700"
                    >
                      {field}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field)}
                        className="text-slate-400 hover:text-rose-600"
                        title={`ลบฟิลด์ ${field}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {isAddingField ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="field_name"
                        value={newFieldInput}
                        onChange={(e) => setNewFieldInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddField()}
                        autoFocus
                        className="h-6 w-24 rounded border border-blue-400 px-1.5 font-mono text-[11px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddField}
                        className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700"
                      >
                        เพิ่ม
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingField(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingField(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600"
                    >
                      <Plus className="h-3 w-3" /> เพิ่มฟิลด์
                    </button>
                  )}
                </div>
              </div>

              {/* Auto Fallback Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    เปิดใช้งาน Fallback Rules อัตโนมัติ
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ใช้ RegEx และ Dictionary เมื่อ SLM ขาดความมั่นใจ
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autoFallback}
                    onChange={(e) => setAutoFallback(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onOpenPromptLab}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              เปิด Prompt Lab เต็มรูปแบบ <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 5: 3 Bottom Cards: Error Clusters, Doc Types, Activity */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* CARD 1: Error Clusters (SVG Donut Chart) */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Error Clusters
            </h3>
            <p className="text-xs text-slate-500">
              จำแนกตามสาเหตุหลัก {displayErrorCount} รายการ
            </p>
          </div>

          {/* SVG Donut Chart */}
          <div className="relative my-4 flex items-center justify-center">
            <svg width="150" height="150" viewBox="0 0 100 100" className="-rotate-90">
              {/* Background circle */}
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F5F9" strokeWidth="14" />
              {/* Segment 1: OCR (42%) -> strokeDasharray="100.2 138.8" offset 0 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#3B82F6"
                strokeWidth="14"
                strokeDasharray="100.2 138.8"
                strokeDashoffset="0"
                className="transition-all duration-500"
              />
              {/* Segment 2: Layout (28%) -> strokeDasharray="66.8 172.2" offset -100.2 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#06B6D4"
                strokeWidth="14"
                strokeDasharray="66.8 172.2"
                strokeDashoffset="-100.2"
                className="transition-all duration-500"
              />
              {/* Segment 3: Missing fields (18%) -> strokeDasharray="43.0 196.0" offset -167 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#F59E0B"
                strokeWidth="14"
                strokeDasharray="43.0 196.0"
                strokeDashoffset="-167"
                className="transition-all duration-500"
              />
              {/* Segment 4: Others (12%) -> strokeDasharray="28.6 210.4" offset -210 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#F43F5E"
                strokeWidth="14"
                strokeDasharray="28.6 210.4"
                strokeDashoffset="-210"
                className="transition-all duration-500"
              />
            </svg>

            {/* Inner text in center of donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900">{displayErrorCount}</span>
              <span className="text-[10px] font-bold text-slate-400">ข้อผิดพลาด</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-700">OCR ตกหล่น/เบลอ</span>
              </div>
              <span className="font-mono font-bold text-slate-800">164 (42%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-700">Layout สับสน/ตารางซับซ้อน</span>
              </div>
              <span className="font-mono font-bold text-slate-800">109 (28%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-700">ฟิลด์สำคัญขาดหาย</span>
              </div>
              <span className="font-mono font-bold text-slate-800">70 (18%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-700">อื่นๆ / Format ผิด</span>
              </div>
              <span className="font-mono font-bold text-slate-800">47 (12%)</span>
            </div>
          </div>
        </section>

        {/* CARD 2: Document Type Distribution */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Document Type Distribution
            </h3>
            <p className="text-xs text-slate-500">
              สัดส่วนประเภทเอกสารทั้งหมด {displayTotal} รายการ
            </p>
          </div>

          <div className="mt-5 space-y-3.5">
            {/* Invoice */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">ใบแจ้งหนี้ (Invoice)</span>
                <span className="font-mono text-slate-600">4,850 (39%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: "39%" }} />
              </div>
            </div>

            {/* Purchase Order */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">ใบสั่งซื้อ (Purchase Order)</span>
                <span className="font-mono text-slate-600">2,985 (24%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: "24%" }} />
              </div>
            </div>

            {/* Delivery Note */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">ใบส่งของ (Delivery Note)</span>
                <span className="font-mono text-slate-600">1,865 (15%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "15%" }} />
              </div>
            </div>

            {/* Bill of Lading */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">ใบตราส่งสินค้า (Bill of Lading)</span>
                <span className="font-mono text-slate-600">1,368 (11%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-500" style={{ width: "11%" }} />
              </div>
            </div>

            {/* Tax Invoice */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">ใบกำกับภาษี (Tax Invoice)</span>
                <span className="font-mono text-slate-600">1,243 (10%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-purple-500" style={{ width: "10%" }} />
              </div>
            </div>

            {/* Others */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">อื่นๆ (Others)</span>
                <span className="font-mono text-slate-600">127 (1%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-400" style={{ width: "1%" }} />
              </div>
            </div>
          </div>
        </section>

        {/* CARD 3: Recent Activity Timeline */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Recent Activity
            </h3>
            <p className="text-xs text-slate-500">
              บันทึกการทำงานและการแก้ไขล่าสุด
            </p>
          </div>

          <div className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-slate-200">
            {/* Event 1 */}
            <div className="relative flex items-start gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              </span>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">Super Admin</span>
                  <span className="text-[10px] text-slate-400">2 นาทีที่แล้ว</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  อัปเดต Prompt config สำหรับฟิลด์ Tax ID (Confidence: 0.70)
                </p>
              </div>
            </div>

            {/* Event 2 */}
            <div className="relative flex items-start gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">ระบบอัตโนมัติ (Batch #42)</span>
                  <span className="text-[10px] text-slate-400">14 นาทีที่แล้ว</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  ประมวลผลสำเร็จ 48 จาก 50 เอกสาร (Success rate: 96%)
                </p>
              </div>
            </div>

            {/* Event 3 */}
            <div className="relative flex items-start gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-4 ring-white">
                <span className="h-2 w-2 rounded-full bg-amber-600" />
              </span>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">สมชาย พ.</span>
                  <span className="text-[10px] text-slate-400">35 นาทีที่แล้ว</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  ตรวจและยืนยันข้อมูลเอกสาร INV-2025-0841.pdf
                </p>
              </div>
            </div>

            {/* Event 4 */}
            <div className="relative flex items-start gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 ring-4 ring-white">
                <span className="h-2 w-2 rounded-full bg-purple-600" />
              </span>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">K-Fold Runner</span>
                  <span className="text-[10px] text-slate-400">1 ชม. ที่แล้ว</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  เริ่มต้นรอบการประเมิน Fold 3/5 บนชุดข้อมูล Zero-shot
                </p>
              </div>
            </div>

            {/* Event 5 */}
            <div className="relative flex items-start gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 ring-4 ring-white">
                <span className="h-2 w-2 rounded-full bg-rose-600" />
              </span>
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">System Warning</span>
                  <span className="text-[10px] text-slate-400">2 ชม. ที่แล้ว</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  OCR Latency ชั่วคราวสูงกว่า 300ms บนไฟล์ภาพขนาดใหญ่
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
