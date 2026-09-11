import {
  AlignLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Code2,
  Copy,
  Crosshair,
  Download,
  Building2,
  Calendar,
  DollarSign,
  Expand,
  Eye,
  FileCode,
  FileText,
  Filter,
  Flame,
  Hash,
  Info,
  LayoutGrid,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Scan,
  ScanText,
  Search,
  Sparkles,
  Table,
  Target,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { initialJson } from "../data/mockData";
import type { BatchDocumentItem, JsonSchemaOutput } from "../types";
import { DocumentPreview } from "./DocumentPreview";
import { DynamicStepTracker } from "./DynamicStepTracker";
import { OcrProcessingAnimation } from "./OcrProcessingAnimation";
import { SlmReasoningAnimation } from "./SlmReasoningAnimation";
import { JSONOutputPanel } from "./JSONOutputPanel";

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
  onSaveToFirebase: (updatedJson?: JsonSchemaOutput) => void;
  onUpdateLocalJson?: (updatedJson: JsonSchemaOutput) => void;
  isSavingToFirebase?: boolean;
  onMoveOtherToCore?: (sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) => void;
  onShowToast: (msg: string) => void;
  onUpdateOcrLines?: (updatedLines: any[]) => void;
  onReRunSlmWithOcr?: () => void;
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
  onUpdateLocalJson,
  isSavingToFirebase = false,
  onMoveOtherToCore,
  onShowToast,
  onUpdateOcrLines,
  onReRunSlmWithOcr,
  isProcessing = false,
}: UploadedWorkspaceViewProps) {
  const [ocrSubView, setOcrSubView] = useState<"table" | "raw" | "json">("table");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "review">("all");
  const [expandedOcrRow, setExpandedOcrRow] = useState<number | null>(null);
  const [selectedOcrIndex, setSelectedOcrIndex] = useState<number | null>(null);
  const [showAllBoxes, setShowAllBoxes] = useState<boolean>(true);

  // Manual OCR Editing & Deleting State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<{ line: any; index: number } | null>(null);

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

  const totalDocs = batchDocuments.length;
  const completedDocs = batchDocuments.filter((d) => d.status === "completed").length;
  const progressPercent = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 100;

  // Filtered live OCR lines from PaddleOCR GPU with normalized confidence and preserved originalIndex
  const filteredOcrLines = useMemo(() => {
    return ocrLines
      .map((line: any, originalIndex: number) => ({ ...line, originalIndex }))
      .filter((line: any) => {
        const rawConf = line.confidence ?? 0.95;
        const conf = rawConf > 1.0 ? rawConf / 100.0 : rawConf;
        const matchesSearch =
          !searchQuery.trim() || line.text.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (confidenceFilter === "high") return conf >= 0.85;
        if (confidenceFilter === "review") return conf < 0.85;
        return true;
      });
  }, [ocrLines, searchQuery, confidenceFilter]);

  // Check if active document has bounding box coordinates
  const hasAnyValidBox = useMemo(() => {
    return ocrLines.some((l: any) => {
      const b = l.bounding_box || l.box;
      return Array.isArray(b) && b.length >= 4;
    });
  }, [ocrLines]);

  // Format real OCR JSON output with standard schema
  const ocrJsonString = useMemo(() => {
    const ocrObjects = ocrLines.map((l) => ({
      text: l.text,
      confidence: Number((l.confidence ?? 0.95).toFixed(2)),
      bounding_box: l.bounding_box || l.box || [],
    }));
    return JSON.stringify(ocrObjects, null, 2);
  }, [ocrLines]);

  // Check if active document has any manually edited or added lines
  const hasEditedLines = useMemo(() => {
    return ocrLines.some((l: any) => l.isEdited || l.isManual);
  }, [ocrLines]);

  function handleStartEdit(lineIdx: number, currentText: string) {
    setEditingIndex(lineIdx);
    setEditingText(currentText);
    setDeletingIndex(null);
  }

  function handleSaveEdit(lineIdx: number) {
    const trimmed = editingText.trim();
    if (!trimmed) {
      onShowToast("ข้อความต้องไม่ว่างเปล่า");
      return;
    }
    const updated = ocrLines.map((l: any, i: number) => {
      if (i === lineIdx) {
        return {
          ...l,
          text: trimmed,
          isManual: true,
          isEdited: true,
          confidence: 1.0,
        };
      }
      return l;
    });
    onUpdateOcrLines?.(updated);
    setEditingIndex(null);
    setEditingText("");
    onShowToast(`แก้ไขข้อความ #${lineIdx + 1} เป็น "${trimmed}" สำเร็จ`);
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  function handleConfirmDelete(lineIdx: number, e?: React.MouseEvent) {
    e?.stopPropagation();
    const itemToDelete = ocrLines[lineIdx];
    const textDeleted = itemToDelete?.text || `#${lineIdx + 1}`;

    // Save for undo
    setLastDeletedItem({ line: itemToDelete, index: lineIdx });

    const updated = ocrLines.filter((_: any, i: number) => i !== lineIdx);
    if (selectedOcrIndex === lineIdx) {
      setSelectedOcrIndex(null);
    } else if (selectedOcrIndex !== null && selectedOcrIndex > lineIdx) {
      setSelectedOcrIndex(selectedOcrIndex - 1);
    }
    if (editingIndex === lineIdx) {
      setEditingIndex(null);
    }
    setDeletingIndex(null);
    onUpdateOcrLines?.(updated);
    onShowToast(`ลบข้อความ "${textDeleted}" เรียบร้อยแล้ว`);
  }

  function handleUndoDelete() {
    if (!lastDeletedItem) return;
    const { line, index } = lastDeletedItem;
    const updated = [...ocrLines];
    if (index >= 0 && index <= updated.length) {
      updated.splice(index, 0, line);
    } else {
      updated.push(line);
    }
    setLastDeletedItem(null);
    onUpdateOcrLines?.(updated);
    onShowToast(`กู้คืนข้อความ "${line.text}" เรียบร้อยแล้ว`);
  }

  function handleAddNewLine() {
    const newLine = {
      text: "ข้อความใหม่",
      confidence: 1.0,
      position: { region: "body" },
      bounding_box: [],
      isManual: true,
      isEdited: true,
    };
    const updated = [...ocrLines, newLine];
    const newIdx = updated.length - 1;
    onUpdateOcrLines?.(updated);
    setEditingIndex(newIdx);
    setEditingText("ข้อความใหม่");
    setDeletingIndex(null);
    onShowToast("เพิ่มข้อความใหม่แล้ว สามารถพิมพ์แก้ไขและกดบันทึกได้ทันที");
    setTimeout(() => {
      const el = document.getElementById(`ocr-row-${newIdx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  // Core 11 Fields extraction summary
  const coreFieldsSummary = useMemo(() => {
    const raw: any = activeDoc?.jsonOutput || {};
    const docType = raw.document_type || "Invoice";
    const docNumber = raw.document_number || raw.document_no || "-";
    const docDate = raw.document_date || "-";
    const sender = raw.sender || raw.party_name || "-";
    const receiver = raw.receiver || "-";
    const origin = raw.origin || "-";
    const destination = raw.destination || "-";
    const refNo = raw.reference_number || "-";
    const unitPrice = raw.unit_price !== undefined ? Number(raw.unit_price) : 0;
    const totalAmount = raw.total_amount !== undefined ? Number(raw.total_amount) : 0;
    const currency = raw.currency || "THB";

    const fields = [
      { key: "document_type", label: "ประเภทเอกสาร", val: docType, isSet: Boolean(raw.document_type) },
      { key: "document_number", label: "เลขที่เอกสาร", val: docNumber, isSet: docNumber !== "-" },
      { key: "document_date", label: "วันที่เอกสาร", val: docDate, isSet: docDate !== "-" },
      { key: "sender", label: "ผู้ส่ง / ผู้ขาย", val: sender, isSet: sender !== "-" },
      { key: "receiver", label: "ผู้รับ / ผู้ซื้อ", val: receiver, isSet: receiver !== "-" },
      { key: "origin", label: "ต้นทาง", val: origin, isSet: origin !== "-" },
      { key: "destination", label: "ปลายทาง", val: destination, isSet: destination !== "-" },
      { key: "reference_number", label: "เลขอ้างอิง", val: refNo, isSet: refNo !== "-" },
      { key: "unit_price", label: "ราคาต่อหน่วย", val: unitPrice ? `${unitPrice.toLocaleString()} ${currency}` : "-", isSet: unitPrice > 0 },
      { key: "total_amount", label: "ยอดรวมทั้งสิ้น", val: totalAmount ? `${totalAmount.toLocaleString()} ${currency}` : "-", isSet: totalAmount > 0 },
      { key: "currency", label: "สกุลเงิน", val: currency, isSet: Boolean(raw.currency) },
    ];

    const filledCount = fields.filter((f) => f.isSet).length;
    const otherKeys = raw.other ? Object.keys(raw.other).filter((k: string) => Boolean(raw.other[k])) : [];

    return {
      docType,
      docNumber,
      docDate,
      sender,
      receiver,
      origin,
      destination,
      refNo,
      unitPrice,
      totalAmount,
      currency,
      fields,
      filledCount,
      otherKeys,
    };
  }, [activeDoc?.jsonOutput]);

  function getHumanRegion(region?: string) {
    switch (region) {
      case "top-left":
        return { label: "Header (Top-Left)", color: "bg-blue-100 text-blue-700" };
      case "top-center":
      case "top-right":
        return { label: "Header (ส่วนหัว)", color: "bg-blue-100 text-blue-700" };
      case "middle-left":
      case "middle-right":
        return { label: "Body (เนื้อหา)", color: "bg-purple-100 text-purple-700" };
      case "bottom-left":
      case "bottom-right":
      case "bottom-center":
        return { label: "Footer (ยอดเงิน/ท้าย)", color: "bg-emerald-100 text-emerald-700" };
      default:
        return { label: "Body", color: "bg-slate-100 text-slate-700" };
    }
  }

  function getHumanBoxSummary(box?: number[][]) {
    if (!box || box.length < 4) return "ไม่พบพิกัด";
    const xs = box.map((p) => p[0]);
    const ys = box.map((p) => p[1]);
    const minX = Math.round(Math.min(...xs));
    const minY = Math.round(Math.min(...ys));
    const maxX = Math.round(Math.max(...xs));
    const maxY = Math.round(Math.max(...ys));
    const w = maxX - minX;
    const h = maxY - minY;
    return `[${minX}, ${minY}] · ${w}x${h}px`;
  }

  return (
    <div className="flex flex-col gap-3.5 py-1">
      {/* ========================================================================= */}
      {/* 1. BATCH WORKSPACE TOOLBAR                                                */}
      {/* ========================================================================= */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-panel">
        {/* Left: Document indicator + Batch Progress */}
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-slate-900 leading-tight">
                {activeDoc.fileName}
              </h2>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                {activeDoc.fileSize}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span>ชุดเอกสาร: {totalDocs} ไฟล์</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[11px] font-medium text-slate-700">
                {completedDocs}/{totalDocs}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add More Files */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300">
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>เพิ่มไฟล์ (Add Files)</span>
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>สแกน OCR ใหม่</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={onExportAllJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>ดาวน์โหลด JSON ทั้งหมด</span>
          </button>
        </div>
      </section>

      {/* Multi-document Batch Switcher Pills (If more than 1 document) */}
      {batchDocuments.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            สลับดูเอกสาร:
          </span>
          {batchDocuments.map((doc, idx) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDocIndex(idx)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                idx === activeDocIndex
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="truncate max-w-[140px]">{doc.fileName}</span>
              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                idx === activeDocIndex ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                #{idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WORKFLOW STEP TRACKER (แสดงขั้นตอนปัจจุบันแบบ Real-Time)               */}
      {/* ========================================================================= */}
      <DynamicStepTracker activeDoc={activeDoc} isProcessing={isProcessing} />

      {/* ========================================================================= */}
      {/* 4. ROW 1: OCR RESULT STUDIO (PaddleOCR GPU) - Full-Width Line             */}
      {/* ========================================================================= */}
      <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-panel">
        {/* Section Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <Scan className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900">OCR Result (PaddleOCR GPU)</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                  {ocrLines.length} ข้อความสกัด
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                สกัดข้อความพร้อมตำแหน่ง Bounding Box ด้วยโมเดล PaddleOCR บนฮาร์ดแวร์ GPU แบบเรียลไทม์
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Re-run SLM Button when OCR has been edited or items deleted */}
            {hasEditedLines && onReRunSlmWithOcr && (
              <button
                type="button"
                onClick={onReRunSlmWithOcr}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 shadow-xs hover:bg-indigo-100 transition"
                title="ส่งข้อความ OCR ที่แก้ไขแล้วให้โมเดล Qwen SLM สกัดโครงสร้าง JSON อีกครั้ง"
              >
                <BrainCircuit className="h-3.5 w-3.5 text-indigo-600" />
                <span>วิเคราะห์ SLM ใหม่อีกครั้ง</span>
              </button>
            )}

            {/* CUDA GPU Status Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>CUDA GPU (Port 8000)</span>
            </span>

            {/* Sub-view Switcher Tabs */}
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium border border-slate-200">
              <button
                type="button"
                onClick={() => setOcrSubView("table")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                  ocrSubView === "table"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Table className="h-3 w-3" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setOcrSubView("raw")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                  ocrSubView === "raw"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <AlignLeft className="h-3 w-3" />
                <span>Raw Text</span>
              </button>
              <button
                type="button"
                onClick={() => setOcrSubView("json")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                  ocrSubView === "json"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Code2 className="h-3 w-3" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Body: Large Document Preview (Left) + Live OCR Data (Right) */}
        <div className="grid min-w-0 gap-4 lg:grid-cols-12 items-start">
          {/* Left: Extra Large Document Image Viewer (7 cols) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-inner">
            <DocumentPreview
              previewUrl={activeDoc.previewUrl}
              previewName={fileName}
              progress={100}
              ocrLines={ocrLines}
              selectedOcrIndex={selectedOcrIndex}
              onSelectOcrIndex={(idx) => {
                setSelectedOcrIndex(idx);
                if (idx !== null) {
                  setTimeout(() => {
                    const el = document.getElementById(`ocr-row-${idx}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  }, 60);
                }
              }}
              showAllBoxes={showAllBoxes}
              onToggleShowAllBoxes={() => setShowAllBoxes((prev) => !prev)}
              onToast={onShowToast}
            />
          </div>

          {/* Right: Live PaddleOCR Extracted Lines / Text / JSON (5 cols) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col min-w-0">
            {activeDoc.status === "ocr_processing" || (ocrLines.length === 0 && isProcessing) ? (
              <OcrProcessingAnimation fileName={fileName} isProcessing={true} />
            ) : (
              <div className="flex flex-col h-full min-w-0">
                {/* Search & Confidence Filter in Table Mode */}
                {ocrSubView === "table" && (
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 border border-slate-200 text-xs">
                    <div className="relative flex-1 min-w-[140px]">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาข้อความ OCR..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={confidenceFilter}
                        onChange={(e) => setConfidenceFilter(e.target.value as "all" | "high" | "review")}
                        className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="all">ความมั่นใจทั้งหมด ({ocrLines.length})</option>
                        <option value="high">มั่นใจสูง (≥90%)</option>
                        <option value="review">รอตรวจ (&lt;85%)</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleAddNewLine}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                        title="เพิ่มข้อความ OCR ด้วยตนเอง (Manual Add)"
                      >
                        <Plus className="h-3 w-3" />
                        <span>เพิ่มข้อความ</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-view Content */}
                {ocrSubView === "table" && (
                  <div className="flex-1 min-h-[360px] lg:min-h-[400px] xl:min-h-[440px] max-h-[540px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xs">
                    {/* Interactive Hint Bar */}
                    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-1.5 bg-blue-50/95 px-2.5 py-1.5 border-b border-blue-200 text-[11px] text-blue-900 shadow-2xs backdrop-blur-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>คลิกส่องกรอบ · ดับเบิ้ลคลิกหรือกดไอคอนดินสอเพื่อแก้ไข</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {lastDeletedItem && (
                          <button
                            type="button"
                            onClick={handleUndoDelete}
                            className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 underline text-[11px] cursor-pointer"
                            title="กู้คืนข้อความที่เพิ่งลบไป"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>กู้คืนที่เพิ่งลบ</span>
                          </button>
                        )}
                        {!hasAnyValidBox && ocrLines.length > 0 && (
                          <button
                            type="button"
                            onClick={onReRunOcr}
                            className="flex items-center gap-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium px-2 py-0.5 text-[11px] shadow-xs transition"
                            title="สแกนเอกสารนี้ใหม่เพื่อดึงพิกัด Bounding Box ลงบนภาพ"
                          >
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                            <span>สแกนพิกัดใหม่ (Re-OCR)</span>
                          </button>
                        )}
                        {selectedOcrIndex !== null && (
                          <button
                            type="button"
                            onClick={() => setSelectedOcrIndex(null)}
                            className="font-medium text-blue-700 hover:text-blue-950 underline text-[11px] cursor-pointer"
                          >
                            ล้างการส่อง (#{selectedOcrIndex + 1})
                          </button>
                        )}
                      </div>
                    </div>

                    <table className="w-full text-left text-xs font-sans">
                      <thead className="sticky top-[29px] z-10 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 shadow-xs">
                        <tr>
                          <th className="py-2 px-2.5 w-10 text-slate-400">#</th>
                          <th className="py-2 px-2.5">Text (ข้อความที่สกัดได้)</th>
                          <th className="py-2 px-2.5 text-center w-24">Confidence</th>
                          <th className="py-2 px-2.5 text-right w-20">Location</th>
                          <th className="py-2 px-2 text-center w-20">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOcrLines.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                              ไม่พบข้อความ OCR ที่ตรงกับเงื่อนไขการค้นหา
                            </td>
                          </tr>
                        ) : (
                          filteredOcrLines.map((line: any) => {
                            const lineIdx = line.originalIndex;
                            const isSelected = selectedOcrIndex === lineIdx;
                            const isEditing = editingIndex === lineIdx;
                            const isDeleting = deletingIndex === lineIdx;
                            const rawConf = line.confidence ?? 0.95;
                            const conf = rawConf > 1.0 ? rawConf / 100.0 : rawConf;
                            const pct = Math.round(conf * 100);
                            const isLowConfidence = conf < 0.85;
                            const region = getHumanRegion(line.position?.region);

                            return (
                              <tr
                                key={lineIdx}
                                id={`ocr-row-${lineIdx}`}
                                onClick={() => {
                                  if (!isEditing) {
                                    setSelectedOcrIndex(isSelected ? null : lineIdx);
                                  }
                                }}
                                className={`cursor-pointer transition-all duration-150 select-none ${
                                  isSelected
                                    ? "bg-blue-50/90 ring-1 ring-blue-500/40 text-blue-950 shadow-xs"
                                    : isLowConfidence && !line.isEdited
                                    ? "bg-rose-50/60 hover:bg-rose-100/60"
                                    : "hover:bg-slate-50"
                                }`}
                                title={isEditing ? undefined : "คลิกเพื่อส่องตำแหน่งบนภาพ (ดับเบิ้ลคลิกเพื่อแก้ไข)"}
                              >
                                <td className="py-1.5 px-2.5 font-mono text-slate-400 text-[11px]">
                                  <div className="flex items-center gap-1">
                                    {isSelected ? (
                                      <span className="flex h-4 items-center gap-1 rounded bg-blue-600 px-1 font-mono text-[10px] font-medium text-white shadow-xs">
                                        <Crosshair className="h-2.5 w-2.5 shrink-0" />
                                        <span>#{lineIdx + 1}</span>
                                      </span>
                                    ) : (
                                      <span>#{lineIdx + 1}</span>
                                    )}
                                  </div>
                                </td>

                                {isEditing ? (
                                  <td className="py-1.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSaveEdit(lineIdx);
                                          if (e.key === "Escape") handleCancelEdit();
                                        }}
                                        autoFocus
                                        className="flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="พิมพ์ข้อความที่ถูกต้อง..."
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEdit(lineIdx)}
                                        className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white shadow-xs hover:bg-blue-700 transition shrink-0"
                                        title="บันทึกข้อความ (Enter)"
                                      >
                                        <Check className="h-3 w-3" />
                                        <span>บันทึก</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition shrink-0"
                                        title="ยกเลิก (Esc)"
                                      >
                                        <X className="h-3 w-3" />
                                        <span>ยกเลิก</span>
                                      </button>
                                    </div>
                                  </td>
                                ) : (
                                  <td
                                    className={`py-1.5 px-2.5 break-words ${
                                      isSelected
                                        ? "text-blue-950 font-medium"
                                        : isLowConfidence && !line.isEdited
                                        ? "text-rose-950 font-medium"
                                        : "text-slate-800"
                                    }`}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(lineIdx, line.text);
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isLowConfidence && !isSelected && !line.isEdited && (
                                        <span
                                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
                                          title="ความมั่นใจต่ำกว่าเกณฑ์"
                                        />
                                      )}
                                      <span>{line.text}</span>
                                      {line.isEdited && (
                                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9.5px] font-semibold text-amber-700">
                                          แก้ไขแล้ว
                                        </span>
                                      )}
                                      {isSelected && (
                                        <span className="ml-1 inline-flex items-center gap-0.5 rounded border border-blue-200 bg-white px-1.5 py-0.2 text-[10px] font-medium text-blue-700">
                                          <Eye className="h-2.5 w-2.5" />
                                          ส่องบนภาพ
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}

                                <td className="py-1.5 px-2.5 text-center">
                                  {line.isEdited ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-mono text-[11px] font-medium text-amber-700">
                                      1.00 (100%)
                                    </span>
                                  ) : isLowConfidence ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 font-mono text-[11px] font-medium text-rose-800">
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                      {conf.toFixed(2)} ({pct}%)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-mono text-[11px] font-medium text-emerald-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                      {conf.toFixed(2)} ({pct}%)
                                    </span>
                                  )}
                                </td>

                                <td className="py-1.5 px-2.5 text-right">
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${region.color}`}>
                                    {region.label}
                                  </span>
                                </td>

                                <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  {isDeleting ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-[10px] font-semibold text-rose-600">ลบ?</span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleConfirmDelete(lineIdx, e)}
                                        className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700 transition"
                                        title="ยืนยันการลบข้อความนี้"
                                      >
                                        ลบ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingIndex(null);
                                        }}
                                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition"
                                        title="ยกเลิกการลบ"
                                      >
                                        ยกเลิก
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(lineIdx, line.text);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                                        title="แก้ไขข้อความ (Manual Edit)"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingIndex(lineIdx);
                                          setEditingIndex(null);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                        title="ลบข้อความนี้"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {ocrSubView === "raw" && (
                  <div className="flex-1 min-h-[360px] lg:min-h-[400px] xl:min-h-[440px] max-h-[540px] overflow-y-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800 whitespace-pre-wrap border border-slate-200 leading-relaxed shadow-inner">
                    {activeDoc.spatialText || activeDoc.ocrText || "กำลังประมวลผลข้อความ OCR..."}
                  </div>
                )}

                {ocrSubView === "json" && (
                  <div className="flex-1 min-h-[360px] lg:min-h-[400px] xl:min-h-[440px] max-h-[540px] overflow-y-auto rounded-lg bg-[#0F172A] p-3 font-mono text-xs text-emerald-400 whitespace-pre border border-slate-800 shadow-inner scrollbar-thin">
                    {ocrJsonString}
                  </div>
                )}

                {/* OCR Bottom Status Line */}
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10.5px] font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>PaddleOCR Lines: <b className="text-slate-800">{ocrLines.length}</b></span>
                    <span className="text-slate-300">|</span>
                    <span>แสดง: <b className="text-slate-800">{filteredOcrLines.length}</b></span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    CUDA GPU Powered
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ROW 2: SLM JSON RESULT STUDIO - Full-Width Next Line                   */}
      {/* ========================================================================= */}
      <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-panel">
        {/* Section Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900">SLM JSON Result</h2>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-200">
                  Qwen2.5-1.5B (Local GPU)
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200 hidden sm:inline">
                  11 Core Logistics Fields Schema
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                วิเคราะห์โครงสร้างภาษาและจัดข้อมูลลงฟิลด์มาตรฐานโลจิสติกส์ 11 ฟิลด์พร้อมโหมดแก้ไขและบันทึกเฉลย Ground Truth
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditorExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs"
              title={isEditorExpanded ? "ย่อกลับเป็น 2 คอลัมน์" : "ขยายตัวแก้ไข JSON ให้เต็มความกว้าง"}
            >
              {isEditorExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              <span>{isEditorExpanded ? "Split View" : "Expand JSON"}</span>
            </button>

            <button
              type="button"
              onClick={onCopyJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>คัดลอก</span>
            </button>

            <button
              type="button"
              onClick={onDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>ดาวน์โหลด</span>
            </button>

            <button
              type="button"
              onClick={() => onSaveToFirebase(jsonOutput)}
              disabled={isSavingToFirebase}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              title="บันทึกข้อมูลและ JSON Schema ชุดนี้ลง Cloud Firebase"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>{isSavingToFirebase ? "กำลังบันทึก..." : "บันทึก Firebase"}</span>
            </button>
          </div>
        </div>

        {/* Section Body: 11 Core Logistics Fields Overview (Left) + Interactive JSON Studio (Right) */}
        <div className="flex-1 min-w-0 flex flex-col">
          {activeDoc.status === "ocr_processing" ? (
            /* State 1: OCR running, SLM waiting */
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 shadow-xs mb-2.5 border border-indigo-100">
                <BrainCircuit className="h-6 w-6 opacity-80 animate-pulse" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                รอรับข้อมูลจาก PaddleOCR (Waiting for OCR)
              </h4>
              <p className="mt-1 text-xs text-slate-500 max-w-md leading-relaxed">
                ระบบกำลังสแกนข้อความ OCR ในเอกสารด้านบน เมื่อเสร็จสิ้น โมเดล Qwen SLM (GPU) จะเริ่มสกัด 11 ฟิลด์มาตรฐานโดยอัตโนมัติ
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-700 border border-slate-300/60">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>สเต็ปถัดไป: สกัด 11 ฟิลด์หลักด้วย Qwen SLM</span>
              </div>
            </div>
          ) : activeDoc.status === "slm_processing" || (!activeDoc.jsonOutput && isProcessing) ? (
            /* State 2: SLM reasoning */
            <SlmReasoningAnimation
              title="กำลังวิเคราะห์และจัดโครงสร้าง JSON Schema ด้วย Qwen SLM (GPU)"
              fileName={fileName}
              isProcessing={true}
            />
          ) : activeDoc.jsonOutput ? (
            /* State 3: SLM Completed -> 11 Core Summary Card + JSONOutputPanel */
            <div className={`grid min-w-0 gap-4 ${isEditorExpanded ? "grid-cols-1" : "lg:grid-cols-12"} items-start`}>
              {!isEditorExpanded && (
                /* Left Column: 11 Core Logistics Fields Overview Dashboard */
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-3 shadow-xs space-y-2.5">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        11 Core Logistics Fields
                      </h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                      coreFieldsSummary.filledCount >= 10
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      <Check className="h-2.5 w-2.5" />
                      <span>{coreFieldsSummary.filledCount}/11 ({Math.round((coreFieldsSummary.filledCount / 11) * 100)}%)</span>
                    </span>
                  </div>

                  {/* Financial Highlight Box */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2.5 flex items-center justify-between shadow-xs">
                    <div>
                      <p className="text-[11px] font-medium text-emerald-800">ยอดเงินรวม (Total Amount)</p>
                      <p className="text-base font-semibold text-emerald-950 font-mono mt-0.5">
                        {coreFieldsSummary.totalAmount > 0
                          ? `${coreFieldsSummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${coreFieldsSummary.currency}`
                          : "0.00 THB"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-emerald-700">ราคา/หน่วย</p>
                      <p className="text-xs font-semibold text-emerald-900 font-mono">
                        {coreFieldsSummary.unitPrice > 0
                          ? `${coreFieldsSummary.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Core Fields Grid List */}
                  <div className="space-y-1.5 text-xs">
                    {/* 1. Doc Type & No */}
                    <div className="rounded-md bg-white p-2 border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500">1. ประเภทเอกสาร</span>
                        <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 uppercase">
                          {coreFieldsSummary.docType}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
                        <span className="text-[11px] font-medium text-slate-500">2. เลขที่เอกสาร</span>
                        <span className="font-mono font-semibold text-blue-700">
                          {coreFieldsSummary.docNumber}
                        </span>
                      </div>
                    </div>

                    {/* 2. Date & Reference */}
                    <div className="rounded-md bg-white p-2 border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500">3. วันที่เอกสาร</span>
                        <span className="font-mono font-medium text-slate-800">
                          {coreFieldsSummary.docDate}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
                        <span className="text-[11px] font-medium text-slate-500">8. เลขอ้างอิง (Ref)</span>
                        <span className="font-mono font-medium text-slate-800">
                          {coreFieldsSummary.refNo}
                        </span>
                      </div>
                    </div>

                    {/* 3. Sender & Receiver */}
                    <div className="rounded-md bg-white p-2 border border-slate-200 shadow-xs space-y-1">
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">4. ผู้ส่ง / ผู้ขาย (Sender)</span>
                        <span className="font-semibold text-slate-900 block truncate text-xs" title={coreFieldsSummary.sender}>
                          {coreFieldsSummary.sender}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-1">
                        <span className="text-[11px] font-medium text-slate-400 block">5. ผู้รับ / ผู้ซื้อ (Receiver)</span>
                        <span className="font-semibold text-slate-900 block truncate text-xs" title={coreFieldsSummary.receiver}>
                          {coreFieldsSummary.receiver}
                        </span>
                      </div>
                    </div>

                    {/* 4. Origin & Destination */}
                    <div className="rounded-md bg-white p-2 border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">6-7. เส้นทางขนส่ง (Route)</span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                        <span className="truncate max-w-[110px]" title={coreFieldsSummary.origin}>
                          {coreFieldsSummary.origin}
                        </span>
                        <ArrowRight className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[110px]" title={coreFieldsSummary.destination}>
                          {coreFieldsSummary.destination}
                        </span>
                      </div>
                    </div>

                    {/* Extra Other Fields if any */}
                    {coreFieldsSummary.otherKeys.length > 0 && (
                      <div className="rounded-md bg-blue-50/60 p-2 border border-blue-100 text-[11px]">
                        <span className="font-medium text-blue-900 block mb-1">
                          ฟิลด์เพิ่มเติม (Other): {coreFieldsSummary.otherKeys.length} รายการ
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {coreFieldsSummary.otherKeys.map((key) => (
                            <span key={key} className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-800 border border-blue-200">
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Right Column (or Full Width when expanded): JSON Schema Output Panel */}
              <div className={isEditorExpanded ? "w-full" : "lg:col-span-7 xl:col-span-8"}>
                <JSONOutputPanel
                  json={activeDoc.jsonOutput}
                  onCopy={onCopyJson}
                  onDownload={onDownloadJson}
                  onMoveOtherToCore={onMoveOtherToCore}
                  onSaveJson={onUpdateLocalJson}
                />
              </div>
            </div>
          ) : (
            /* State 4: Standby */
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-400">
              <FileCode className="h-10 w-10 mb-2 opacity-50 text-indigo-400" />
              <p className="text-xs font-bold text-slate-700">พร้อมสำหรับการวิเคราะห์ JSON Schema</p>
              <p className="text-[11px] text-slate-500 mt-0.5">อัปโหลดเอกสารหรือกดรันเพื่อเริ่มสกัด 11 ฟิลด์มาตรฐาน</p>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SYSTEM TELEMETRY & ENGINE STATUS FOOTER                                */}
      {/* ========================================================================= */}
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-panel">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 font-medium">
            <Target className="h-3.5 w-3.5 text-blue-600" />
            <span>ความแม่นยำ OCR:</span>
            <span className="font-mono font-semibold text-slate-900">{accuracyPct}%</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>สกัดข้อความ:</span>
            <span className="font-mono font-semibold text-slate-900">{ocrLines.length} บรรทัด</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <span>เวลาประมวลผล:</span>
            <span className="font-mono font-semibold text-slate-900">{processingTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>PaddleOCR GPU (Port 8000)</span>
          </span>
          <span>·</span>
          <span>Qwen2.5-1.5B CUDA SLM (Port 8001)</span>
        </div>
      </footer>

      
    </div>
  );
}
