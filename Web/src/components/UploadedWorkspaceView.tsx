import {
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Download,
  Expand,
  FileCode,
  FileText,
  Flame,
  Layers,
  Maximize2,
  Plus,
  RefreshCw,
  Save,
  Scan,
  ScanText,
  Sparkles,
  Target,
  UploadCloud,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { initialJson } from "../data/mockData";
import type { BatchDocumentItem, JsonSchemaOutput } from "../types";
import { DocumentPreview } from "./DocumentPreview";
import { JSONOutputPanel } from "./JSONOutputPanel";
import { OCRResultPanel } from "./OCRResultPanel";

interface UploadedWorkspaceViewProps {
  activeDoc: BatchDocumentItem | null;
  batchDocuments: BatchDocumentItem[];
  activeDocIndex: number;
  onSelectDocIndex: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onReRunOcr: () => void;
  onExportAllJson: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onSaveToFirebase: (updatedJson: JsonSchemaOutput) => void;
  onMoveOtherToCore?: (sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) => void;
  onShowToast: (msg: string) => void;
  isProcessing?: boolean;
}

export function UploadedWorkspaceView({
  activeDoc,
  batchDocuments,
  activeDocIndex,
  onSelectDocIndex,
  onAddFiles,
  onReRunOcr,
  onExportAllJson,
  onCopyJson,
  onDownloadJson,
  onSaveToFirebase,
  onMoveOtherToCore,
  onShowToast,
  isProcessing = false,
}: UploadedWorkspaceViewProps) {
  const [ocrSubView, setOcrSubView] = useState<"cards" | "table" | "raw" | "json">("cards");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  if (!activeDoc) return null;

  const fileName = activeDoc.fileName;
  const jsonOutput = activeDoc.jsonOutput || initialJson;
  const performance = activeDoc.performance;
  const ocrLines = activeDoc.ocrLines || [];
  const fields = activeDoc.fields || [];
  const accuracyPct = performance?.accuracy_pct ?? activeDoc.overallConfidence ?? 98.4;
  const processingTime = performance?.inference_time_sec
    ? `${performance.inference_time_sec.toFixed(2)}s`
    : "0.85s";
  const fieldsCount = fields.length > 0 ? fields.length : 24;

  const totalDocs = batchDocuments.length;
  const completedDocs = batchDocuments.filter((d) => d.status === "completed").length;
  const progressPercent = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 100;

  // Extract preview lines for the Human Cards / Table preview in OCR card
  const previewFields = [
    {
      field: "Document Type",
      value: jsonOutput?.document_type ? String(jsonOutput.document_type).toUpperCase() : "BILL OF LADING",
      confidence: 0.98,
      location: "Header",
      locColor: "bg-blue-100 text-blue-700",
    },
    {
      field: "Document No.",
      value: jsonOutput?.document_no || "BL240528-002",
      confidence: 0.98,
      location: "Header",
      locColor: "bg-blue-100 text-blue-700",
    },
    {
      field: "Document Date",
      value: jsonOutput?.document_date || "28 MAY 2024",
      confidence: 0.97,
      location: "Header",
      locColor: "bg-blue-100 text-blue-700",
    },
    {
      field: "Party Name",
      value: jsonOutput?.party_name || "Global Trade Co., Ltd.",
      confidence: 0.96,
      location: "Body",
      locColor: "bg-purple-100 text-purple-700",
    },
    {
      field: "Total Amount",
      value: jsonOutput?.total_amount
        ? Number(jsonOutput.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })
        : "12,500.00",
      confidence: 0.98,
      location: "Footer",
      locColor: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ========================================================================= */}
      {/* 1. TOP HERO BANNER: HEADLINE + BADGES + VISUAL CONVERTER FLOW             */}
      {/* ========================================================================= */}
      <section className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
        {/* Left Headline & Description */}
        <div className="flex flex-col items-start gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Logistics Document{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 bg-clip-text text-transparent">
              Converter
            </span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            แปลงเอกสารโลจิสติกส์ เช่น Invoice, Bill of Lading, Purchase Order และ Packing List
            เป็นข้อมูลมาตรฐานในรูปแบบ JSON Schema ด้วย OCR + AI
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-bold text-blue-800 shadow-xs">
              <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3]" />
              Supports batch conversion
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-bold text-emerald-800 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Ready
            </span>
          </div>
        </div>

        {/* Right Visual File Converter Graphic */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 lg:justify-end">
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
            <span className="mb-2.5 text-[11px] font-black tracking-wider text-slate-500 uppercase">
              PDF / JPG / PNG
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-14 w-11 flex-col items-center justify-between rounded-xl border border-red-200 bg-red-50 p-1.5 shadow-xs">
                <FileText className="h-5 w-5 text-red-600" />
                <span className="rounded bg-red-600 px-1 py-0.2 text-[8px] font-black text-white">
                  PDF
                </span>
              </div>
              <div className="flex h-14 w-11 flex-col items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-1.5 shadow-xs">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="rounded bg-blue-600 px-1 py-0.2 text-[8px] font-black text-white">
                  JPG
                </span>
              </div>
              <div className="flex h-14 w-11 flex-col items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-1.5 shadow-xs">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="rounded bg-emerald-600 px-1 py-0.2 text-[8px] font-black text-white">
                  PNG
                </span>
              </div>
            </div>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ArrowRight className="h-4 w-4 text-indigo-600 animate-pulse" />
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-panel ring-1 ring-indigo-500/20">
            <span className="mb-2.5 text-[11px] font-black tracking-wider text-indigo-600 uppercase">
              JSON
            </span>
            <div className="flex h-14 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-indigo-300 bg-white p-1.5 shadow-xs">
              <span className="text-sm font-black text-indigo-600 font-mono">{"{ }"}</span>
              <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[8px] font-black text-white">
                JSON
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. BATCH STATUS BAR WITH PROGRESS & ACTIONS                                */}
      {/* ========================================================================= */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-panel">
        {/* Left: Checkmark + Batch Info + Gradient Progress Bar */}
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Batch uploaded successfully
            </h3>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                {totalDocs} files uploaded
              </span>
              <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-indigo-600 font-mono">
                {completedDocs}/{totalDocs} processed
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add More Files */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300">
            <Plus className="h-4 w-4 text-slate-500" />
            <span>Add More Files</span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.jpg,.jpeg,.png,.tif,.tiff"
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) onAddFiles(files);
                e.target.value = "";
              }}
            />
          </label>

          {/* Re-run OCR */}
          <button
            type="button"
            onClick={onReRunOcr}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Re-run OCR</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={onExportAllJson}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export JSON</span>
          </button>
        </div>
      </section>

      {/* Multi-document Batch Switcher Pills (If more than 1 document) */}
      {batchDocuments.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">
            สลับดูเอกสาร:
          </span>
          {batchDocuments.map((doc, idx) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDocIndex(idx)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                idx === activeDocIndex
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="truncate max-w-[140px]">{doc.fileName}</span>
              <span className="rounded bg-white/20 px-1 py-0.2 text-[10px] font-black">
                #{idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN 3-COLUMN STUDIO WORKBENCH GRID                                    */}
      {/* ========================================================================= */}
      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.3fr_1.1fr_270px]">
        {/* ===================================================================== */}
        {/* COLUMN 1 (LEFT): OCR RESULT (Image Viewer + Human Cards / Table)      */}
        {/* ===================================================================== */}
        <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          {/* Card Header */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-black text-slate-900">OCR Result</h2>
            </div>

            {/* OCR Sub-view Switcher Tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOcrSubView("cards")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  ocrSubView === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Human Cards
              </button>
              <button
                type="button"
                onClick={() => setOcrSubView("table")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  ocrSubView === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setOcrSubView("raw")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  ocrSubView === "raw" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Raw Text
              </button>
              <button
                type="button"
                onClick={() => setOcrSubView("json")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  ocrSubView === "json" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Dual Split inside OCR Result: Left Document Preview | Right Field Breakdown */}
          <div className="grid min-w-0 gap-4 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
            {/* Left: Document Image Viewer */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-2.5 overflow-hidden">
              <DocumentPreview
                previewUrl={activeDoc.previewUrl}
                previewName={fileName}
                progress={100}
                onToast={onShowToast}
              />
            </div>

            {/* Right: Field Cards / Table Breakdown */}
            <div className="flex flex-col justify-between min-w-0">
              {ocrSubView === "cards" || ocrSubView === "table" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold">
                        <th className="pb-2">Field</th>
                        <th className="pb-2">Value</th>
                        <th className="pb-2">Confidence</th>
                        <th className="pb-2 text-right">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewFields.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 font-bold text-slate-700">{item.field}</td>
                          <td className="py-2.5 font-mono text-slate-900 font-medium truncate max-w-[130px]" title={item.value}>
                            {item.value}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {item.confidence}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${item.locColor}`}>
                              {item.location}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {ocrSubView === "raw" && (
                <div className="h-full min-h-[220px] max-h-[300px] overflow-y-auto rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700 whitespace-pre-wrap border border-slate-200">
                  {activeDoc.spatialText || activeDoc.ocrText || "กำลังรอผลลัพธ์ OCR..."}
                </div>
              )}

              {ocrSubView === "json" && (
                <div className="h-full min-h-[220px] max-h-[300px] overflow-y-auto rounded-xl bg-[#0F172A] p-3 font-mono text-xs text-emerald-400 whitespace-pre border border-slate-800">
                  {JSON.stringify(ocrLines, null, 2)}
                </div>
              )}

              {/* OCR Card Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">
                <span>Fields detected: <b className="text-slate-800">{fieldsCount}</b></span>
                <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  OCR Model: PaddleOCR (GPU)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* COLUMN 2 (MIDDLE): SLM JSON RESULT (Code Editor & Output)             */}
        {/* ===================================================================== */}
        <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          {/* Card Header */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">SLM JSON Result</h2>
            </div>

            <button
              type="button"
              onClick={() => setIsEditorExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              <Expand className="h-3.5 w-3.5" />
              <span>{isEditorExpanded ? "Collapse" : "Expand"}</span>
            </button>
          </div>

          {/* JSON Output / Editor */}
          <div className="flex-1 min-w-0">
            <JSONOutputPanel
              json={jsonOutput}
              onCopy={onCopyJson}
              onDownload={onDownloadJson}
              onMoveOtherToCore={onMoveOtherToCore}
              onSaveJson={onSaveToFirebase}
            />
          </div>

          {/* Card Bottom Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyJson}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy JSON</span>
              </button>

              <button
                type="button"
                onClick={onDownloadJson}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Download .json</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSaveToFirebase(jsonOutput)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-extrabold text-amber-900 shadow-xs transition hover:bg-amber-100"
            >
              <Save className="h-3.5 w-3.5 text-amber-600" />
              <span>Save to Firebase</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* COLUMN 3 (RIGHT): TELEMETRY & STATUS SIDEBAR                          */}
        {/* ===================================================================== */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="space-y-3.5">
            {/* Step 1: OCR Ready */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Scan className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">OCR</p>
                <p className="text-xs font-black text-emerald-700">Ready</p>
              </div>
            </div>

            {/* Step 2: SLM Done */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple-100 text-purple-700">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">SLM (AI Reasoning)</p>
                <p className="text-xs font-black text-purple-700">Done</p>
              </div>
            </div>

            {/* Step 3: Output JSON Ready */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-700">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">Output</p>
                <p className="text-xs font-black text-slate-900">JSON Ready</p>
              </div>
            </div>

            <div className="my-2 h-px bg-slate-100" />

            {/* Metric 1: OCR Accuracy */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Target className="h-3.5 w-3.5 text-blue-600" />
                OCR Accuracy
              </span>
              <span className="text-xs font-black text-slate-900 font-mono">
                {accuracyPct}%
              </span>
            </div>

            {/* Metric 2: Fields Extracted */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                Fields Extracted
              </span>
              <span className="text-xs font-black text-slate-900 font-mono">
                {fieldsCount}
              </span>
            </div>

            {/* Metric 3: Processing Time */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
                Processing Time
              </span>
              <span className="text-xs font-black text-slate-900 font-mono">
                {processingTime}
              </span>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Last updated: Just now
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BOTTOM 4-STEP PIPELINE STEPPER                                         */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel sm:grid-cols-4 sm:gap-6">
        {/* Step 1: Upload */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">1. Upload</p>
            <p className="text-[11px] text-slate-500">อัปโหลดเอกสาร</p>
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200">
              Completed
            </span>
          </div>
        </div>

        {/* Step 2: OCR */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">2. OCR</p>
            <p className="text-[11px] text-slate-500">ดึงข้อความจากเอกสาร</p>
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200">
              Completed
            </span>
          </div>
        </div>

        {/* Step 3: AI Reasoning */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-purple-100 text-purple-700">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">3. AI Reasoning</p>
            <p className="text-[11px] text-slate-500">วิเคราะห์และจัดโครงสร้างข้อมูล</p>
            <span className="mt-1 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-black text-purple-700 border border-purple-200">
              Completed
            </span>
          </div>
        </div>

        {/* Step 4: JSON Output */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">4. JSON Output</p>
            <p className="text-[11px] text-slate-500">ส่งออกเป็น JSON Schema</p>
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200">
              Ready
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
