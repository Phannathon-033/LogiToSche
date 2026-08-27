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

  // Form editor state for 11 core fields
  const [formDocType, setFormDocType] = useState(json.document_type || "invoice");
  const [formDocNumber, setFormDocNumber] = useState((json as any).document_number || (json as any).document_no || "");
  const [formDocDate, setFormDocDate] = useState(json.document_date || "");
  const [formSender, setFormSender] = useState((json as any).sender || (json as any).party_name || "");
  const [formReceiver, setFormReceiver] = useState((json as any).receiver || "");
  const [formOrigin, setFormOrigin] = useState((json as any).origin || "");
  const [formDestination, setFormDestination] = useState((json as any).destination || "");
  const [formRefNumber, setFormRefNumber] = useState((json as any).reference_number || "");
  const [formUnitPrice, setFormUnitPrice] = useState<string | number>((json as any).unit_price ?? 0);
  const [formTotalAmount, setFormTotalAmount] = useState<string | number>(json.total_amount ?? 0);
  const [formCurrency, setFormCurrency] = useState((json as any).currency || "THB");
  const [otherEntries, setOtherEntries] = useState<Array<{ key: string; value: string }>>([]);

  // New Other field input
  const [newOtherKey, setNewOtherKey] = useState("");
  const [newOtherValue, setNewOtherValue] = useState("");

  // Sync state when props change
  useEffect(() => {
    setRawText(JSON.stringify(json, null, 2));
    setFormDocType(json.document_type || "invoice");
    setFormDocNumber((json as any).document_number || (json as any).document_no || "");
    setFormDocDate(json.document_date || "");
    setFormSender((json as any).sender || (json as any).party_name || "");
    setFormReceiver((json as any).receiver || "");
    setFormOrigin((json as any).origin || "");
    setFormDestination((json as any).destination || "");
    setFormRefNumber((json as any).reference_number || "");
    setFormUnitPrice((json as any).unit_price ?? 0);
    setFormTotalAmount(json.total_amount ?? 0);
    setFormCurrency((json as any).currency || "THB");

    const entries = json.other
      ? Object.entries(json.other).map(([k, v]) => ({ key: k, value: String(v) }))
      : [];
    setOtherEntries(entries);
  }, [json]);

  const otherKeys = json.other
    ? Object.keys(json.other).filter((k) => json.other && json.other[k] !== undefined && json.other[k] !== "")
    : [];
  const [sourceKey, setSourceKey] = useState<string>(otherKeys[0] || "");
  const [targetKey, setTargetKey] = useState<string>("sender");
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
    setRawText(JSON.stringify(json, null, 2));
    setFormDocType(json.document_type || "invoice");
    setFormDocNumber((json as any).document_number || (json as any).document_no || "");
    setFormDocDate(json.document_date || "");
    setFormSender((json as any).sender || (json as any).party_name || "");
    setFormReceiver((json as any).receiver || "");
    setFormOrigin((json as any).origin || "");
    setFormDestination((json as any).destination || "");
    setFormRefNumber((json as any).reference_number || "");
    setFormUnitPrice((json as any).unit_price ?? 0);
    setFormTotalAmount(json.total_amount ?? 0);
    setFormCurrency((json as any).currency || "THB");

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

      const parsedPrice = typeof formUnitPrice === "number" ? formUnitPrice : Number(formUnitPrice) || 0;
      const parsedTotal = typeof formTotalAmount === "number" ? formTotalAmount : Number(formTotalAmount) || 0;

      const updated: JsonSchemaOutput = {
        document_type: formDocType.trim() || "invoice",
        document_number: formDocNumber.trim() || "-",
        document_date: formDocDate.trim() || "-",
        sender: formSender.trim() || "-",
        receiver: formReceiver.trim() || "-",
        origin: formOrigin.trim() || "-",
        destination: formDestination.trim() || "-",
        reference_number: formRefNumber.trim() || "-",
        unit_price: parsedPrice,
        total_amount: parsedTotal,
        currency: formCurrency.trim() || "THB",
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
      title={isEditing ? "✏️ แก้ไข JSON Schema (Manual Edit Mode)" : "JSON Schema Output (11 ฟิลด์มาตรฐาน + Other)"}
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
                  title="ย้ายค่าจาก other ไปใส่ใน 11 ฟิลด์หลัก"
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
              ย้ายข้อมูลจาก other เข้าสู่ 11 ฟิลด์มาตรฐาน
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
                11 ฟิลด์หลักเป้าหมาย
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
                onClick={() => setEditTab("form")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  editTab === "form"
                    ? "bg-navy text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ListPlus className="h-3.5 w-3.5" />
                <span>ฟอร์ม 11 ฟิลด์หลัก + Other</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab("raw")}
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
            <div className="flex-1 min-h-[440px] max-h-[600px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {/* Core 11 Fields Grid */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <h4 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  <span>11 ฟิลด์มาตรฐาน (Core Required Fields)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 1. document_type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      1. document_type (ประเภทเอกสาร)
                    </label>
                    <input
                      type="text"
                      value={formDocType}
                      onChange={(e) => setFormDocType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น invoice, bill_of_lading, packing_list"
                    />
                  </div>

                  {/* 2. document_number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      2. document_number (เลขที่เอกสาร)
                    </label>
                    <input
                      type="text"
                      value={formDocNumber}
                      onChange={(e) => setFormDocNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-blue-700 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น INV-2024-001, BL-88910"
                    />
                  </div>

                  {/* 3. document_date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      3. document_date (วันที่เอกสาร)
                    </label>
                    <input
                      type="text"
                      value={formDocDate}
                      onChange={(e) => setFormDocDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="YYYY-MM-DD เช่น 2024-08-25"
                    />
                  </div>

                  {/* 4. sender */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      4. sender (ผู้ส่ง / ผู้ขาย)
                    </label>
                    <input
                      type="text"
                      value={formSender}
                      onChange={(e) => setFormSender(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-sans font-bold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น ABC Logistics Co., Ltd."
                    />
                  </div>

                  {/* 5. receiver */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      5. receiver (ผู้รับ / ผู้ซื้อ)
                    </label>
                    <input
                      type="text"
                      value={formReceiver}
                      onChange={(e) => setFormReceiver(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-sans font-bold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น XYZ Importer Co., Ltd."
                    />
                  </div>

                  {/* 6. origin */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      6. origin (ต้นทาง)
                    </label>
                    <input
                      type="text"
                      value={formOrigin}
                      onChange={(e) => setFormOrigin(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-sans text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น Bangkok Port, Thailand"
                    />
                  </div>

                  {/* 7. destination */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      7. destination (ปลายทาง)
                    </label>
                    <input
                      type="text"
                      value={formDestination}
                      onChange={(e) => setFormDestination(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-sans text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น Tokyo Port, Japan"
                    />
                  </div>

                  {/* 8. reference_number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      8. reference_number (เลขที่อ้างอิง)
                    </label>
                    <input
                      type="text"
                      value={formRefNumber}
                      onChange={(e) => setFormRefNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น PO-2024-9988, AWB-12345"
                    />
                  </div>

                  {/* 9. unit_price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      9. unit_price (ราคาต่อหน่วย)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formUnitPrice}
                      onChange={(e) => setFormUnitPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>

                  {/* 10. total_amount */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      10. total_amount (มูลค่ารวม)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formTotalAmount}
                      onChange={(e) => setFormTotalAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-extrabold text-emerald-700 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>

                  {/* 11. currency */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      11. currency (สกุลเงิน)
                    </label>
                    <input
                      type="text"
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-700 focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="เช่น THB, USD, EUR, JPY"
                    />
                  </div>
                </div>
              </div>

              {/* Other Fields Section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-800">
                    ข้อมูลส่วนขยาย (other object)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {otherEntries.length} ฟิลด์
                  </span>
                </div>

                {/* List Existing Other Fields */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {otherEntries.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.key}
                        onChange={(e) => {
                          const updated = [...otherEntries];
                          updated[idx].key = e.target.value;
                          setOtherEntries(updated);
                        }}
                        className="w-1/3 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-700"
                        placeholder="ชื่อฟิลด์ (key)"
                      />
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                          const updated = [...otherEntries];
                          updated[idx].value = e.target.value;
                          setOtherEntries(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900"
                        placeholder="ค่า (value)"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherField(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="ลบฟิลด์นี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Other Field Row */}
                <form onSubmit={handleAddOtherField} className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    value={newOtherKey}
                    onChange={(e) => setNewOtherKey(e.target.value)}
                    placeholder="เพิ่มฟิลด์ใหม่ เช่น tracking_no"
                    className="w-1/3 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    value={newOtherValue}
                    onChange={(e) => setNewOtherValue(e.target.value)}
                    placeholder="ค่าข้อมูล"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                    <span>เพิ่ม</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Raw Code Editor */
            <div className="space-y-2">
              <textarea
                value={rawText}
                onChange={(e) => handleRawChange(e.target.value)}
                className="w-full flex-1 min-h-[440px] max-h-[600px] rounded-xl border border-slate-300 bg-[#0F172A] p-3 font-mono text-xs text-emerald-400 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary shadow-inner resize-none scrollbar-thin"
                spellCheck={false}
              />
              {jsonError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* READ-ONLY SYNTAX HIGHLIGHTED VIEW */
        <>
          <div className="flex-1 min-h-[440px] max-h-[600px] min-w-0 overflow-auto rounded-xl bg-[#0F172A] p-4 font-mono text-xs leading-6 text-slate-100 shadow-inner scrollbar-thin">
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
              <span className="text-slate-600 font-medium">
                Schema: <b className="text-navy font-bold">11 ฟิลด์มาตรฐาน + Other</b>
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