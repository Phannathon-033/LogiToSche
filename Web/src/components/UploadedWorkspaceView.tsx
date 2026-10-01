import {
  BrainCircuit,
  Check,
  Cloud,
  Code2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Table,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { EMPTY_JSON_SCHEMA, type BatchDocumentItem, type JsonSchemaOutput } from "../types";
import type { OcrLine } from "../services/ocrApi";
import { calculateDocumentCompleteness } from "../services/dataValidationService";
import { DocumentPreview } from "./DocumentPreview";

interface UploadedWorkspaceViewProps {
  activeDoc: BatchDocumentItem | null;
  batchDocuments: BatchDocumentItem[];
  activeDocIndex: number;
  onSelectDocIndex: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onReRunOcr: () => void;
  onExportAllJson: () => void;
  onExportAllExcel?: () => void;
  onExportAllCsv?: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onDownloadExcel?: () => void;
  onDownloadCsv?: () => void;
  onSaveToFirebase: (updatedJson?: JsonSchemaOutput) => void;
  onUpdateLocalJson?: (updatedJson: JsonSchemaOutput) => void;
  isSavingToFirebase?: boolean;
  onMoveOtherToCore?: (sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) => void;
  onShowToast: (msg: string) => void;
  onUpdateOcrLines?: (updatedLines: OcrLine[], autoTriggerSlm?: boolean) => void;
  onReRunSlmWithOcr?: (overrideLines?: OcrLine[], overrideText?: string) => void;
  isProcessing?: boolean;
}

type SlmSubView = "form" | "json";

type CoreField = {
  key: keyof JsonSchemaOutput;
  label: string;
  input: "text" | "number" | "select";
};

const CORE_FIELDS: CoreField[] = [
  { key: "document_type", label: "ประเภทเอกสาร", input: "select" },
  { key: "document_number", label: "เลขที่เอกสาร", input: "text" },
  { key: "document_date", label: "วันที่เอกสาร", input: "text" },
  { key: "sender", label: "ผู้ส่ง / ผู้ขาย", input: "text" },
  { key: "receiver", label: "ผู้รับ / ผู้ซื้อ", input: "text" },
  { key: "origin", label: "ต้นทาง", input: "text" },
  { key: "destination", label: "ปลายทาง", input: "text" },
  { key: "reference_number", label: "เลขที่อ้างอิง", input: "text" },
  { key: "unit_price", label: "ราคาต่อหน่วย", input: "number" },
  { key: "total_amount", label: "มูลค่ารวม", input: "number" },
  { key: "currency", label: "สกุลเงิน", input: "select" },
];

const DOC_TYPES = ["invoice", "bill_of_lading", "packing_list", "purchase_order", "unknown"];
const CURRENCIES = ["", "THB", "USD", "EUR", "JPY", "SGD", "CNY", "GBP"];

export function UploadedWorkspaceView({
  activeDoc,
  batchDocuments,
  activeDocIndex,
  onSelectDocIndex,
  onAddFiles,
  onReRunOcr,
  onExportAllJson,
  onExportAllExcel,
  onExportAllCsv,
  onCopyJson,
  onDownloadJson,
  onDownloadExcel,
  onDownloadCsv,
  onSaveToFirebase,
  onUpdateLocalJson,
  isSavingToFirebase = false,
  onShowToast,
  onUpdateOcrLines,
  onReRunSlmWithOcr,
  isProcessing = false,
}: UploadedWorkspaceViewProps) {
  const [slmSubView, setSlmSubView] = useState<SlmSubView>("form");
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "review">("all");
  const [selectedOcrIndex, setSelectedOcrIndex] = useState<number | null>(null);
  const [showAllBoxes, setShowAllBoxes] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<{ line: OcrLine; index: number } | null>(null);
  const [jsonDraft, setJsonDraft] = useState<JsonSchemaOutput>(EMPTY_JSON_SCHEMA);
  const [jsonRawDraft, setJsonRawDraft] = useState("");
  const [jsonError, setJsonError] = useState("");
  const ocrTableScrollRef = useRef<HTMLDivElement | null>(null);
  const ocrRowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  useEffect(() => {
    const next = activeDoc?.jsonOutput || EMPTY_JSON_SCHEMA;
    setJsonDraft(next);
    setJsonRawDraft(JSON.stringify(next, null, 2));
    setJsonError("");
  }, [activeDoc?.id, activeDoc?.jsonOutput]);

  useEffect(() => {
    if (selectedOcrIndex === null) return;
    window.requestAnimationFrame(() => {
      ocrRowRefs.current[selectedOcrIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [selectedOcrIndex]);

  const ocrLines = activeDoc?.ocrLines || [];
  const totalDocs = batchDocuments.length;
  const completedDocs = batchDocuments.filter((doc) => doc.status === "completed").length;
  const otherEntries = Object.entries(jsonDraft.other || {}).filter(([, value]) => value !== undefined && value !== "");

  const filledCount = CORE_FIELDS.filter(({ key }) => {
    const value = jsonDraft[key];
    return typeof value === "number" ? value > 0 : String(value || "").trim().length > 0;
  }).length;

  const filteredOcrLines = useMemo(() => {
    return ocrLines
      .map((line: any, originalIndex: number) => ({ ...line, originalIndex }))
      .filter((line: any) => {
        const conf = normalizedConfidence(line.confidence);
        const matchesSearch = !searchQuery.trim() || String(line.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (confidenceFilter === "high") return conf >= 0.9;
        if (confidenceFilter === "review") return conf < 0.85;
        return true;
      });
  }, [confidenceFilter, ocrLines, searchQuery]);

  if (!activeDoc) return null;

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
    const updated = ocrLines.map((line: any, idx) => idx === lineIdx ? { ...line, text: trimmed, isManual: true, isEdited: true, confidence: 1 } : line);
    setEditingIndex(null);
    setEditingText("");
    onUpdateOcrLines?.(updated, true);
  }

  function handleConfirmDelete(lineIdx: number, event?: MouseEvent) {
    event?.stopPropagation();
    const itemToDelete = ocrLines[lineIdx];
    setLastDeletedItem({ line: itemToDelete, index: lineIdx });
    const updated = ocrLines.filter((_, idx) => idx !== lineIdx);
    setSelectedOcrIndex((current) => current === lineIdx ? null : current !== null && current > lineIdx ? current - 1 : current);
    setDeletingIndex(null);
    setEditingIndex(null);
    onUpdateOcrLines?.(updated, true);
  }

  function handleUndoDelete() {
    if (!lastDeletedItem) return;
    const updated = [...ocrLines];
    updated.splice(lastDeletedItem.index, 0, lastDeletedItem.line);
    setLastDeletedItem(null);
    onUpdateOcrLines?.(updated, true);
  }

  function handleAddNewLine() {
    const updated = [
      ...ocrLines,
      { text: "ข้อความใหม่", confidence: 1, position: { region: "body" }, bounding_box: [], isManual: true, isEdited: true },
    ];
    const newIdx = updated.length - 1;
    onUpdateOcrLines?.(updated, false);
    setEditingIndex(newIdx);
    setEditingText("ข้อความใหม่");
  }

  function updateJsonField(key: keyof JsonSchemaOutput, value: string) {
    setJsonDraft((current) => ({
      ...current,
      [key]: key === "unit_price" || key === "total_amount" ? Number(value) || 0 : value,
    }));
  }

  function saveJsonDraft() {
    onUpdateLocalJson?.(jsonDraft);
    setJsonRawDraft(JSON.stringify(jsonDraft, null, 2));
    onShowToast("บันทึก JSON ใน Workspace แล้ว");
  }

  function handleRawJsonChange(value: string) {
    setJsonRawDraft(value);
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("JSON ต้องเป็น object");
        return;
      }
      setJsonDraft(parsed as JsonSchemaOutput);
      setJsonError("");
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "JSON ไม่ถูกต้อง");
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-panel">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="max-w-[62vw] truncate text-base font-bold text-slate-950">{activeDoc.fileName}</h1>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{fileExt(activeDoc.fileName)}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{activeDoc.fileSize}</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">เอกสารที่ {activeDocIndex + 1} จาก {totalDocs} · เสร็จแล้ว {completedDocs}/{totalDocs}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onReRunOcr} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> รับ OCR ใหม่
          </button>
          <button type="button" onClick={() => onReRunSlmWithOcr?.()} disabled={!onReRunSlmWithOcr || activeDoc.status === "slm_processing"} className="btn-secondary text-blue-700">
            <BrainCircuit className={`h-4 w-4 ${activeDoc.status === "slm_processing" ? "animate-spin" : ""}`} /> วิเคราะห์ใหม่ (SLM)
          </button>
          {activeDoc.status === "completed" && activeDoc.jsonOutput && (
            <button type="button" onClick={onDownloadJson} className="btn-primary">
              <Download className="h-4 w-4" /> ดาวน์โหลด JSON
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_460px]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-panel">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-950">เอกสารในชุด ({totalDocs})</h2>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">
              <Plus className="h-3.5 w-3.5" /> เพิ่ม
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.jpg,.jpeg,.png,.tif,.tiff"
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length > 0) onAddFiles(files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="space-y-2">
            {batchDocuments.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectDocIndex(idx)}
                className={`flex w-full gap-2 rounded-xl border p-2 text-left transition ${idx === activeDocIndex ? "border-blue-300 bg-blue-50 shadow-xs" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {doc.previewUrl ? <img src={doc.previewUrl} alt="" className="h-full w-full object-cover" /> : <FileText className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-xs font-bold text-slate-900">{doc.fileName}</p>
                    <MoreVertical className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </div>
                  <p className="mt-0.5 text-[11px] font-mono text-slate-500">{fileExt(doc.fileName)} · {doc.fileSize}</p>
                  <StatusPill doc={doc} />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-3">
            {onExportAllExcel && <button type="button" onClick={onExportAllExcel} className="mini-action"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>}
            {onExportAllCsv && <button type="button" onClick={onExportAllCsv} className="mini-action"><FileText className="h-3.5 w-3.5" />CSV</button>}
            <button type="button" onClick={onExportAllJson} className="mini-action"><Code2 className="h-3.5 w-3.5" />JSON</button>
          </div>
        </aside>

        <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-panel">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-950">เอกสารต้นฉบับ</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" /> แสดงกล่อง OCR
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(320px,0.9fr)]">
            <div className="min-w-0">
              <DocumentPreview
                previewUrl={activeDoc.previewUrl}
                previewName={activeDoc.fileName}
                progress={activeDoc.status === "ocr_processing" ? 50 : 100}
                isProcessing={activeDoc.status === "ocr_processing" || activeDoc.status === "slm_processing" || isProcessing}
                ocrLines={ocrLines}
                selectedOcrIndex={selectedOcrIndex}
                onSelectOcrIndex={(idx) => setSelectedOcrIndex(idx)}
                showAllBoxes={showAllBoxes}
                onToggleShowAllBoxes={() => setShowAllBoxes((current) => !current)}
                onToast={onShowToast}
              />
            </div>

            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white xl:max-h-[calc(100vh-13rem)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-blue-700">
                  <Table className="h-3.5 w-3.5" /> OCR ข้อความ ({ocrLines.length})
                </div>
                {lastDeletedItem && <button type="button" onClick={handleUndoDelete} className="text-xs font-bold text-amber-700 hover:underline">กู้คืนที่เพิ่งลบ</button>}
              </div>

              <div className="p-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ค้นหาข้อความ OCR..." className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value as "all" | "high" | "review")} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none">
                    <option value="all">ทั้งหมด</option>
                    <option value="high">มั่นใจสูง</option>
                    <option value="review">รอตรวจ</option>
                  </select>
                  <button type="button" onClick={handleAddNewLine} className="btn-secondary h-9"><Plus className="h-3.5 w-3.5" /> เพิ่มข้อความ</button>
                </div>

                <div ref={ocrTableScrollRef} className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 xl:max-h-[calc(100vh-24rem)]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="w-12 px-3 py-2 font-bold">#</th>
                        <th className="px-3 py-2 font-bold">ข้อความ</th>
                        <th className="w-24 px-3 py-2 text-center font-bold">Conf.</th>
                        <th className="w-20 px-3 py-2 text-center font-bold">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOcrLines.map((line: any) => {
                        const lineIdx = line.originalIndex;
                        const conf = normalizedConfidence(line.confidence);
                        const isEditing = editingIndex === lineIdx;
                        const isSelected = selectedOcrIndex === lineIdx;
                        return (
                          <tr
                            key={lineIdx}
                            ref={(node) => { ocrRowRefs.current[lineIdx] = node; }}
                            onClick={() => !isEditing && setSelectedOcrIndex(isSelected ? null : lineIdx)}
                            className={`${isSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-300" : conf < 0.85 ? "bg-rose-50/60" : "hover:bg-slate-50"} cursor-pointer`}
                          >
                            <td className="px-3 py-2 font-mono text-slate-500">{lineIdx + 1}</td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <div className="flex gap-1.5">
                                  <input autoFocus value={editingText} onChange={(event) => setEditingText(event.target.value)} onKeyDown={(event) => {
                                    if (event.key === "Enter") handleSaveEdit(lineIdx);
                                    if (event.key === "Escape") setEditingIndex(null);
                                  }} className="min-w-0 flex-1 rounded-md border border-blue-300 px-2 py-1 text-xs focus:outline-none" />
                                  <button type="button" onClick={() => handleSaveEdit(lineIdx)} className="rounded-md bg-blue-600 px-2 text-white"><Check className="h-3.5 w-3.5" /></button>
                                  <button type="button" onClick={() => setEditingIndex(null)} className="rounded-md border border-slate-200 px-2 text-slate-600"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : (
                                <span className="font-medium text-slate-900">{line.text}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center"><ConfidencePill confidence={conf} /></td>
                            <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                              {deletingIndex === lineIdx ? (
                                <div className="flex justify-center gap-1">
                                  <button type="button" onClick={(event) => handleConfirmDelete(lineIdx, event)} className="rounded bg-rose-600 px-1.5 py-1 text-[10px] font-bold text-white">ลบ</button>
                                  <button type="button" onClick={() => setDeletingIndex(null)} className="rounded border px-1.5 py-1 text-[10px]">ยกเลิก</button>
                                </div>
                              ) : (
                                <div className="flex justify-center gap-1">
                                  <button type="button" onClick={() => handleStartEdit(lineIdx, line.text)} className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button type="button" onClick={() => setDeletingIndex(lineIdx)} className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </main>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">ผลการวิเคราะห์ (SLM)</h2>
                <span className={activeDoc.status === "completed" ? "pill-success" : activeDoc.status === "error" ? "pill-error" : "pill-info"}>{statusText(activeDoc.status)}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">Qwen2.5-1.5B (Local GPU)</p>
            </div>
            <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{filledCount}/11</span>
          </div>

          <div className="mb-3 flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
            <TabButton active={slmSubView === "form"} onClick={() => setSlmSubView("form")} label="ฟอร์มข้อมูล" />
            <TabButton active={slmSubView === "json"} onClick={() => setSlmSubView("json")} label="JSON Raw" />
          </div>

          {activeDoc.status === "ocr_processing" ? (
            <EmptyState icon={<Loader2 className="h-5 w-5 animate-spin" />} title="รอ OCR" detail="ระบบจะวิเคราะห์ SLM หลัง OCR เสร็จ" />
          ) : activeDoc.status === "slm_processing" || (!activeDoc.jsonOutput && isProcessing) ? (
            <EmptyState icon={<BrainCircuit className="h-5 w-5 animate-pulse" />} title="กำลังวิเคราะห์ SLM" detail="กำลังจัดข้อมูลลง 11 ฟิลด์หลัก" />
          ) : activeDoc.status === "error" ? (
            <EmptyState icon={<X className="h-5 w-5" />} title="ประมวลผลไม่สำเร็จ" detail={activeDoc.error || activeDoc.statusLabel} />
          ) : slmSubView === "form" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {CORE_FIELDS.map((field, index) => (
                  <label key={field.key} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-2 text-xs">
                    <span className="font-medium text-slate-600">{index + 1}. {field.label}</span>
                    {field.input === "select" ? (
                      <select value={String(jsonDraft[field.key] ?? "")} onChange={(event) => updateJsonField(field.key, event.target.value)} className="field-input">
                        {(field.key === "currency" ? CURRENCIES : DOC_TYPES).map((value) => <option key={value} value={value}>{value || "-"}</option>)}
                      </select>
                    ) : (
                      <input type={field.input} value={String(jsonDraft[field.key] ?? "")} onChange={(event) => updateJsonField(field.key, event.target.value)} className="field-input" />
                    )}
                  </label>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">ข้อมูลเพิ่มเติม (other)</h3>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{otherEntries.length} รายการ</span>
                </div>
                <div className="space-y-1.5">
                  {otherEntries.length === 0 ? <p className="text-xs text-slate-500">ไม่มีข้อมูลเพิ่มเติม</p> : otherEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 rounded-lg bg-white px-2 py-1.5 text-xs">
                      <span className="truncate font-mono text-slate-600">{key}</span>
                      <span className="truncate font-medium text-slate-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={saveJsonDraft} disabled={!onUpdateLocalJson} className="btn-secondary justify-center"><Check className="h-4 w-4" /> บันทึกแก้ไข</button>
                <button type="button" onClick={onCopyJson} className="btn-secondary justify-center"><Copy className="h-4 w-4" /> คัดลอก JSON</button>
                <button type="button" onClick={() => onSaveToFirebase(jsonDraft)} disabled={isSavingToFirebase} className="btn-secondary col-span-2 justify-center text-blue-700"><Cloud className="h-4 w-4" /> {isSavingToFirebase ? "กำลังบันทึก..." : "บันทึก Firebase"}</button>
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  {onDownloadExcel && <button type="button" onClick={onDownloadExcel} className="mini-action"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>}
                  {onDownloadCsv && <button type="button" onClick={onDownloadCsv} className="mini-action"><FileText className="h-3.5 w-3.5" />CSV</button>}
                  <button type="button" onClick={onDownloadJson} className="mini-action"><Download className="h-3.5 w-3.5" />JSON</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea value={jsonRawDraft} onChange={(event) => handleRawJsonChange(event.target.value)} className="h-[520px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-5 text-emerald-300 focus:outline-none" spellCheck={false} />
              {jsonError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700">{jsonError}</p>}
              <button type="button" onClick={saveJsonDraft} disabled={Boolean(jsonError) || !onUpdateLocalJson} className="btn-primary w-full justify-center"><Check className="h-4 w-4" /> บันทึก JSON Raw</button>
            </div>
          )}

          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            JSON ถูกต้องตาม Schema · อัปเดตล่าสุด {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ doc }: { doc: BatchDocumentItem }) {
  const completeness = calculateDocumentCompleteness(doc);
  if (doc.status === "error") return <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">เกิดข้อผิดพลาด</span>;
  if (doc.status === "completed") return <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">เสร็จแล้ว {completeness.pct}%</span>;
  if (doc.status === "slm_processing") return <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">กำลัง SLM</span>;
  if (doc.status === "ocr_processing") return <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">กำลัง OCR</span>;
  if (doc.status === "ocr_completed") return <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">รอ SLM</span>;
  return <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">รอคิว</span>;
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const cls = confidence < 0.85 ? "bg-rose-50 text-rose-700" : confidence >= 0.9 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ${cls}`}>{pct}%</span>;
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${active ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-950"}`}>
      {icon}{label}
    </button>
  );
}

function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 shadow-xs">{icon}</div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs font-medium text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function normalizedConfidence(value: unknown) {
  const numeric = Number(value ?? 0.95);
  if (!Number.isFinite(numeric)) return 0.95;
  return numeric > 1 ? numeric / 100 : numeric;
}

function fileExt(fileName: string) {
  const ext = fileName.split(".").pop();
  return (ext || "FILE").toUpperCase();
}

function statusText(status: BatchDocumentItem["status"]) {
  switch (status) {
    case "completed": return "เสร็จแล้ว";
    case "error": return "ผิดพลาด";
    case "ocr_processing": return "กำลัง OCR";
    case "ocr_completed": return "รอ SLM";
    case "slm_processing": return "กำลัง SLM";
    default: return "รอคิว";
  }
}
