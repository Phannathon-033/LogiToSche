import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  Edit3,
  ListPlus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CORE_FIELDS_DEF, type JsonSchemaOutput } from "../types";
import { Card } from "./Card";

interface JSONOutputPanelProps {
  json: JsonSchemaOutput;
  onCopy: () => void;
  onDownload: () => void;
  onMoveOtherToCore?: (sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) => void;
  onSaveJson?: (updatedJson: JsonSchemaOutput) => void;
}

const tokenColors = {
  key: "text-sky-300",
  string: "text-amber-300",
  number: "text-orange-300",
  punctuation: "text-slate-400",
};

export function JSONOutputPanel({
  json,
  onCopy,
  onDownload,
  onMoveOtherToCore,
  onSaveJson,
}: JSONOutputPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<"form" | "raw">("form");
  const [showMoveForm, setShowMoveForm] = useState(false);

  // Raw editor state
  const [rawText, setRawText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Form editor state
  const [formDocType, setFormDocType] = useState(json.document_type || "invoice");
  const [formDocNo, setFormDocNo] = useState(json.document_no || "");
  const [formDocDate, setFormDocDate] = useState(json.document_date || "");
  const [formPartyName, setFormPartyName] = useState(json.party_name || "");
  const [formSourceFile, setFormSourceFile] = useState(json.source_file || "");
  const [formQuantity, setFormQuantity] = useState<string | number>(json.quantity ?? 1);
  const [formTotalAmount, setFormTotalAmount] = useState<string | number>(json.total_amount ?? 0);
  const [otherEntries, setOtherEntries] = useState<Array<{ key: string; value: string }>>([]);

  // New Other field input
  const [newOtherKey, setNewOtherKey] = useState("");
  const [newOtherValue, setNewOtherValue] = useState("");

  // Sync state when props change
  useEffect(() => {
    setRawText(JSON.stringify(json, null, 2));
    setFormDocType(json.document_type || "invoice");
    setFormDocNo(json.document_no || "");
    setFormDocDate(json.document_date || "");
    setFormPartyName(json.party_name || "");
    setFormSourceFile(json.source_file || "");
    setFormQuantity(json.quantity ?? 1);
    setFormTotalAmount(json.total_amount ?? 0);

    const entries = json.other
      ? Object.entries(json.other).map(([k, v]) => ({ key: k, value: String(v) }))
      : [];
    setOtherEntries(entries);
  }, [json]);

  const otherKeys = json.other
    ? Object.keys(json.other).filter((k) => json.other[k] !== undefined && json.other[k] !== "")
    : [];
  const [sourceKey, setSourceKey] = useState<string>(otherKeys[0] || "");
  const [targetKey, setTargetKey] = useState<string>("party_name");
  const [removeFromOther, setRemoveFromOther] = useState(true);

  // Start editing
  function handleStartEdit() {
    setRawText(JSON.stringify(json, null, 2));
    setJsonError(null);
    setIsEditing(true);
    setShowMoveForm(false);
  }

  // Cancel editing
  function handleCancelEdit() {
    setIsEditing(false);
    setJsonError(null);
    // Reset to current props
    setRawText(JSON.stringify(json, null, 2));
    setFormDocType(json.document_type || "invoice");
    setFormDocNo(json.document_no || "");
    setFormDocDate(json.document_date || "");
    setFormPartyName(json.party_name || "");
    setFormSourceFile(json.source_file || "");
    setFormQuantity(json.quantity ?? 1);
    setFormTotalAmount(json.total_amount ?? 0);
    const entries = json.other
      ? Object.entries(json.other).map(([k, v]) => ({ key: k, value: String(v) }))
      : [];
    setOtherEntries(entries);
  }

  // Raw JSON changes
  function handleRawChange(val: string) {
    setRawText(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax");
    }
  }

  // Format Raw JSON
  function handleFormatRaw() {
    try {
      const parsed = JSON.parse(rawText);
      setRawText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch {
      // ignore
    }
  }

  // Add Other field in form mode
  function handleAddOtherField(e: React.FormEvent) {
    e.preventDefault();
    const k = newOtherKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!k) return;
    if (otherEntries.some((item) => item.key === k)) {
      alert(`มีฟิลด์ "${k}" อยู่แล้ว`);
      return;
    }
    setOtherEntries([...otherEntries, { key: k, value: newOtherValue.trim() }]);
    setNewOtherKey("");
    setNewOtherValue("");
  }

  // Remove Other field
  function handleRemoveOtherField(index: number) {
    setOtherEntries(otherEntries.filter((_, idx) => idx !== index));
  }

  // Save changes
  function handleSave() {
    if (!onSaveJson) return;

    if (editTab === "raw") {
      try {
        const parsed = JSON.parse(rawText);
        if (typeof parsed !== "object" || parsed === null) {
          setJsonError("JSON ต้องเป็น Object");
          return;
        }
        onSaveJson(parsed as JsonSchemaOutput);
        setIsEditing(false);
      } catch (err: any) {
        setJsonError(`ไม่สามารถบันทึกได้: ${err.message}`);
      }
    } else {
      // Form mode save
      const otherObj: Record<string, any> = {};
      otherEntries.forEach(({ key, value }) => {
        if (key.trim()) {
          const num = Number(value);
          otherObj[key.trim()] = !isNaN(num) && value !== "" && !value.includes("-") ? num : value;
        }
      });

      const parsedQty = typeof formQuantity === "number" ? formQuantity : Number(formQuantity) || 1;
      const parsedTotal = typeof formTotalAmount === "number" ? formTotalAmount : Number(formTotalAmount) || 0;

      const updated: JsonSchemaOutput = {
        document_type: formDocType.trim() || "invoice",
        document_no: formDocNo.trim() || "-",
        document_date: formDocDate.trim() || "-",
        party_name: formPartyName.trim() || "-",
        source_file: formSourceFile.trim() || "document",
        quantity: parsedQty,
        total_amount: parsedTotal,
        other: otherObj,
      };

      onSaveJson(updated);
      setIsEditing(false);
    }
  }

  function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceKey || !targetKey) return;
    if (onMoveOtherToCore) {
      onMoveOtherToCore(sourceKey, targetKey, removeFromOther);
    }
    setShowMoveForm(false);
  }

  const lines = JSON.stringify(json, null, 2).split("\n");

  return (
    <Card
      title={isEditing ? "✏️ แก้ไข JSON Schema (Manual Edit Mode)" : "JSON Schema Output (7 ฟิลด์หลัก + Other)"}
      icon={<Braces className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-1.5">
          {!isEditing ? (
            <>
              {onSaveJson && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
                  title="แก้ไขค่าใน JSON Schema ด้วยตนเอง"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>แก้ไข JSON</span>
                </button>
              )}
              {onMoveOtherToCore && otherKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!sourceKey && otherKeys.length > 0) setSourceKey(otherKeys[0]);
                    setShowMoveForm(!showMoveForm);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                  title="ย้ายค่าจาก other ไปใส่ใน 7 ฟิลด์หลัก"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>ย้ายจาก other</span>
                </button>
              )}
              <button
                type="button"
                onClick={onCopy}
                className="rounded p-1.5 text-navy hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="คัดลอก JSON"
              >
                <Clipboard className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>ยกเลิก</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={editTab === "raw" && jsonError !== null}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-extrabold text-white transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>บันทึกทันที</span>
              </button>
            </div>
          )}
        </div>
      }
      className="h-full"
    >
      {/* Quick Move Form */}
      {showMoveForm && !isEditing && (
        <form
          onSubmit={handleMove}
          className="mb-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/75 space-y-2.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between text-xs font-bold text-navy">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              ย้ายข้อมูลจาก other เข้าสู่ 7 ฟิลด์หลัก
            </span>
            <button
              type="button"
              onClick={() => setShowMoveForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ฟิลด์ต้นทางใน other
              </label>
              <select
                value={sourceKey}
                onChange={(e) => setSourceKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                required
              >
                {otherKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}: {String(json.other?.[k]).slice(0, 25)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                7 ฟิลด์หลักเป้าหมาย
              </label>
              <select
                value={targetKey}
                onChange={(e) => setTargetKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                required
              >
                {CORE_FIELDS_DEF.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={removeFromOther}
                onChange={(e) => setRemoveFromOther(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>ลบออกจาก other หลังจากย้าย</span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <ArrowRight className="h-3 w-3" />
              <span>ยืนยันการย้าย</span>
            </button>
          </div>
        </form>
      )}

      {/* EDIT MODE */}
      {isEditing ? (
        <div className="space-y-3 animate-fadeIn">
          {/* Sub-tabs: Form View vs Raw Code View */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (editTab === "raw" && !jsonError) {
                    try {
                      const p = JSON.parse(rawText);
                      setFormDocType(p.document_type || "invoice");
                      setFormDocNo(p.document_no || "");
                      setFormDocDate(p.document_date || "");
                      setFormPartyName(p.party_name || "");
                      setFormSourceFile(p.source_file || "");
                      setFormQuantity(p.quantity ?? 1);
                      setFormTotalAmount(p.total_amount ?? 0);
                      const entries = p.other
                        ? Object.entries(p.other).map(([k, v]) => ({ key: k, value: String(v) }))
                        : [];
                      setOtherEntries(entries);
                    } catch {
                      // ignore
                    }
                  }
                  setEditTab("form");
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  editTab === "form"
                    ? "bg-navy text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ListPlus className="h-3.5 w-3.5" />
                <span>ฟอร์ม 7 ฟิลด์หลัก + Other</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editTab === "form") {
                    const otherObj: Record<string, any> = {};
                    otherEntries.forEach(({ key, value }) => {
                      if (key.trim()) {
                        const num = Number(value);
                        otherObj[key.trim()] = !isNaN(num) && value !== "" && !value.includes("-") ? num : value;
                      }
                    });
                    const current = {
                      document_type: formDocType.trim() || "invoice",
                      document_no: formDocNo.trim() || "-",
                      document_date: formDocDate.trim() || "-",
                      party_name: formPartyName.trim() || "-",
                      source_file: formSourceFile.trim() || "document",
                      quantity: Number(formQuantity) || 1,
                      total_amount: Number(formTotalAmount) || 0,
                      other: otherObj,
                    };
                    setRawText(JSON.stringify(current, null, 2));
                    setJsonError(null);
                  }
                  setEditTab("raw");
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  editTab === "raw"
                    ? "bg-navy text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>พิมพ์โค้ด JSON โดยตรง</span>
              </button>
            </div>

            {editTab === "raw" && (
              <button
                type="button"
                onClick={handleFormatRaw}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> จัดรูปแบบ (Beautify)
              </button>
            )}
          </div>

          {/* Form Mode Editor */}
          {editTab === "form" ? (
            <div className="max-h-[440px] overflow-y-auto space-y-4 pr-1">
              {/* 7 Core Fields */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
                <p className="text-xs font-extrabold text-navy flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded bg-primary text-[10px] text-white">7</span>
                  7 ฟิลด์หลัก (Core Schema Fields)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      1. document_type (ประเภทเอกสาร)
                    </label>
                    <input
                      type="text"
                      value={formDocType}
                      onChange={(e) => setFormDocType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-navy focus:border-primary focus:outline-none"
                      placeholder="invoice, bill_of_lading..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      2. document_no (เลขที่เอกสาร)
                    </label>
                    <input
                      type="text"
                      value={formDocNo}
                      onChange={(e) => setFormDocNo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-navy focus:border-primary focus:outline-none font-mono"
                      placeholder="INV-001..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      3. document_date (วันที่ YYYY-MM-DD)
                    </label>
                    <input
                      type="text"
                      value={formDocDate}
                      onChange={(e) => setFormDocDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-navy focus:border-primary focus:outline-none"
                      placeholder="2026-08-27..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      4. party_name (ชื่อคู่ค้า / ผู้ซื้อ / ผู้ขาย)
                    </label>
                    <input
                      type="text"
                      value={formPartyName}
                      onChange={(e) => setFormPartyName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-navy focus:border-primary focus:outline-none"
                      placeholder="ชื่อบริษัทคู่ค้า..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      5. source_file (ชื่อไฟล์)
                    </label>
                    <input
                      type="text"
                      value={formSourceFile}
                      onChange={(e) => setFormSourceFile(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-navy focus:border-primary focus:outline-none"
                      placeholder="document.pdf..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        6. quantity (จำนวน)
                      </label>
                      <input
                        type="number"
                        value={formQuantity}
                        onChange={(e) => setFormQuantity(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-navy focus:border-primary focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        7. total_amount (ยอดเงิน)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formTotalAmount}
                        onChange={(e) => setFormTotalAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700 focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Object Fields */}
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-navy flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded bg-cyan-700 text-[10px] text-white">O</span>
                    ข้อมูลส่วนขยาย (other object)
                  </p>
                  <span className="text-[11px] text-slate-500">{otherEntries.length} ฟิลด์</span>
                </div>

                {otherEntries.length > 0 ? (
                  <div className="space-y-2">
                    {otherEntries.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={entry.key}
                          onChange={(e) => {
                            const updated = [...otherEntries];
                            updated[idx].key = e.target.value;
                            setOtherEntries(updated);
                          }}
                          className="w-1/3 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-navy focus:border-primary focus:outline-none"
                          placeholder="ชื่อคีย์ (key)..."
                        />
                        <span className="text-slate-400 font-bold">:</span>
                        <input
                          type="text"
                          value={entry.value}
                          onChange={(e) => {
                            const updated = [...otherEntries];
                            updated[idx].value = e.target.value;
                            setOtherEntries(updated);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-primary focus:outline-none"
                          placeholder="ค่า (value)..."
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherField(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
                          title="ลบฟิลด์นี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">ยังไม่มีฟิลด์ใน other</p>
                )}

                {/* Add New Field to Other Form */}
                <div className="flex items-center gap-2 pt-2 border-t border-cyan-200/60">
                  <input
                    type="text"
                    value={newOtherKey}
                    onChange={(e) => setNewOtherKey(e.target.value)}
                    placeholder="+ คีย์ใหม่ (เช่น po_number, sender_name)"
                    className="w-1/3 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newOtherValue}
                    onChange={(e) => setNewOtherValue(e.target.value)}
                    placeholder="ค่าข้อมูล (value)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddOtherField}
                    disabled={!newOtherKey.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 px-3 py-1 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่ม</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Raw Code Mode Editor */
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={rawText}
                  onChange={(e) => handleRawChange(e.target.value)}
                  rows={16}
                  className="w-full rounded-xl bg-[#0F172A] p-4 font-mono text-xs leading-6 text-emerald-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  placeholder={'{\n  "document_type": "invoice",\n  ...\n}'}
                  spellCheck={false}
                />
              </div>

              {jsonError ? (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>ไวยากรณ์ JSON ไม่ถูกต้อง: {jsonError}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>โครงสร้าง JSON ถูกต้อง (Valid JSON)</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Footer in Edit Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              💡 เมื่อกด <b>"บันทึกทันที"</b> ข้อมูลที่แก้ไขจะถูกอัปเดตลงตารางและซิงค์เข้า Cloud Firestore ทันที
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={editTab === "raw" && jsonError !== null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>บันทึกการแก้ไข JSON</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* NORMAL READ-ONLY VIEW */
        <>
          <div className="min-h-[400px] h-[400px] min-w-0 overflow-auto rounded-xl bg-[#0F172A] p-4 font-mono text-xs leading-6 text-slate-100 shadow-inner">
            {lines.map((line, index) => (
              <div key={`${line}-${index}`} className="grid grid-cols-[38px_1fr] gap-2">
                <span className="select-none border-r border-slate-700/60 pr-2.5 text-right text-slate-500">
                  {index + 1}
                </span>
                <code>{highlightJsonLine(line)}</code>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-600">
                Schema: <b className="text-navy">7 Core + Other</b>
              </span>
              <span className="rounded bg-green-50 px-2 py-1 font-bold text-success border border-green-200">
                Valid JSON
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onSaveJson && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-extrabold text-indigo-800 hover:bg-indigo-100 transition shadow-sm"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>แก้ไขฟิลด์ / JSON</span>
                </button>
              )}
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex max-w-full items-center gap-2 truncate rounded-xl border border-cyan-600 bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 shadow-sm"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                ดาวน์โหลด JSON
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function highlightJsonLine(line: string) {
  const keyMatch = line.match(/^(\s*)"([^"]+)":\s?(.*)$/);
  if (!keyMatch) {
    return <span className={tokenColors.punctuation}>{line}</span>;
  }

  const [, space, key, value] = keyMatch;
  const valueClass = value.includes('"')
    ? tokenColors.string
    : /\d/.test(value)
    ? tokenColors.number
    : tokenColors.punctuation;
  return (
    <>
      <span>{space}</span>
      <span className={tokenColors.key}>"{key}"</span>
      <span className={tokenColors.punctuation}>: </span>
      <span className={valueClass}>{value}</span>
    </>
  );
}
