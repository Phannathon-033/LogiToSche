import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { useRef } from "react";
import type { BatchDocumentItem, BatchFileStatus } from "../types";

interface BatchDocumentGalleryProps {
  documents: BatchDocumentItem[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveDocument: (index: number) => void;
  onExportAllJson: () => void;
  isProcessing: boolean;
  batchPhase: "idle" | "ocr" | "slm" | "completed";
}

export function BatchDocumentGallery({
  documents,
  activeIndex,
  onSelectIndex,
  onAddFiles,
  onRemoveDocument,
  onExportAllJson,
  isProcessing,
  batchPhase,
}: BatchDocumentGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (documents.length === 0) return null;

  const totalCount = documents.length;
  const ocrDoneCount = documents.filter(
    (d) => d.status === "ocr_completed" || d.status === "slm_processing" || d.status === "completed",
  ).length;
  const slmDoneCount = documents.filter((d) => d.status === "completed").length;

  // Calculate overall batch progress percentage (0 to 100)
  // Phase 1 (OCR) accounts for 45%, Phase 2 (SLM) accounts for 55%
  const ocrProgressPct = (ocrDoneCount / Math.max(totalCount, 1)) * 45;
  const slmProgressPct = (slmDoneCount / Math.max(totalCount, 1)) * 55;
  const totalProgressPct = Math.min(100, Math.round(ocrProgressPct + slmProgressPct));

  function getStatusInfo(status: BatchFileStatus, acc?: number | null) {
    switch (status) {
      case "queued":
        return {
          label: "รอคิวประมวลผล",
          bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300",
          icon: <span className="h-2 w-2 rounded-full bg-slate-400" />,
        };
      case "ocr_processing":
        return {
          label: "กำลัง OCR (GPU)...",
          bg: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 animate-pulse",
          icon: <Loader2 className="h-3 w-3 animate-spin text-blue-600" />,
        };
      case "ocr_completed":
        return {
          label: "OCR สำเร็จ (รอ SLM)",
          bg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300",
          icon: <CheckCircle2 className="h-3 w-3 text-amber-600" />,
        };
      case "slm_processing":
        return {
          label: "กำลังวิเคราะห์ SLM...",
          bg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 animate-pulse",
          icon: <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />,
        };
      case "completed":
        return {
          label: `เสร็จสมบูรณ์ (${acc ?? 98}%)`,
          bg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300",
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
        };
      case "error":
        return {
          label: "เกิดข้อผิดพลาด",
          bg: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300",
          icon: <AlertCircle className="h-3 w-3 text-rose-600" />,
        };
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-panel transition-all dark:border-indigo-950/60 dark:bg-slate-900">
      {/* Top Header with Progress & Action Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="text-base font-extrabold text-navy dark:text-white">
              คลังเอกสารแบทช์ ({documents.length} เอกสาร)
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              กำลังดูเอกสารที่ {activeIndex + 1}/{documents.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ระบบทำงานแบบ 2 เฟส: <b>เฟส 1 OCR ทุกรูปภาพให้เสร็จก่อน</b> แล้วจึง <b>เฟส 2 ส่งเข้า Qwen SLM ทีละรูป</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) onAddFiles(files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            เพิ่มรูปภาพ
          </button>

          {slmDoneCount > 0 ? (
            <button
              type="button"
              onClick={onExportAllJson}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              ดาวน์โหลด JSON ทั้งหมด ({slmDoneCount}/{totalCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* Batch Overall Processing Status Bar */}
      <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50/60 p-4 dark:border-indigo-900/40 dark:from-slate-800/80 dark:via-slate-800 dark:to-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy dark:text-white">
              {batchPhase === "completed"
                ? "🎉 ประมวลผลเสร็จสมบูรณ์ทุกเอกสารแล้ว"
                : isProcessing
                ? "⚡ ระบบกำลังประมวลผลตามลำดับอัตโนมัติ"
                : "พร้อมประมวลผล"}
            </span>
            <span className="font-mono text-xs font-black text-primary">
              {totalProgressPct}%
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              เฟส 1 (OCR): <b>{ocrDoneCount}/{totalCount}</b>
            </span>
            <span className="inline-flex items-center gap-1">
              <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
              เฟส 2 (SLM): <b>{slmDoneCount}/{totalCount}</b>
            </span>
          </div>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalProgressPct === 100
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-blue-500 to-indigo-600"
            }`}
            style={{ width: `${totalProgressPct}%` }}
          />
        </div>
      </div>

      {/* Horizontal Document Thumbnails & Cards */}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
        {documents.map((doc, idx) => {
          const isActive = idx === activeIndex;
          const statusInfo = getStatusInfo(doc.status, doc.performance?.accuracy_pct ?? doc.overallConfidence);
          const isPdf = doc.fileName.toLowerCase().endsWith(".pdf");

          return (
            <div
              key={doc.id}
              onClick={() => onSelectIndex(idx)}
              className={`group relative flex w-60 shrink-0 cursor-pointer flex-col justify-between rounded-xl border p-3 transition-all duration-200 ${
                isActive
                  ? "border-primary bg-blue-50/40 ring-2 ring-primary/30 shadow-md dark:border-primary dark:bg-slate-800"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/60"
              }`}
            >
              {/* Card Top: Index Badge & Delete button */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  {idx + 1}
                </span>

                <button
                  type="button"
                  title="ลบเอกสารออกจากแบทช์"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDocument(idx);
                  }}
                  className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Card Middle: Preview Thumbnail / Icon & File Title */}
              <div className="my-2.5 flex items-center gap-2.5">
                {doc.previewUrl && !isPdf ? (
                  <img
                    src={doc.previewUrl}
                    alt={doc.fileName}
                    className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/30">
                    <FileText className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-navy dark:text-white" title={doc.fileName}>
                    {doc.fileName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {doc.fileSize}
                  </p>
                </div>
              </div>

              {/* Card Bottom: Status Badge */}
              <div className="mt-1">
                <span
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold ${statusInfo.bg}`}
                >
                  {statusInfo.icon}
                  <span className="truncate">{statusInfo.label}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
