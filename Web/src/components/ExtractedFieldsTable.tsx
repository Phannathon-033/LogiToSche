import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { DocumentType, ExtractedField } from "../types";
import { Card } from "./Card";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { StatusBadge } from "./StatusBadge";

interface ExtractedFieldsTableProps {
  fields: ExtractedField[];
  selectedType: DocumentType;
  onTypeChange: (type: DocumentType) => void;
  onAddField?: (key: string, value: string, isOther: boolean) => void;
  onDeleteField?: (fieldKey: string, isOther?: boolean) => void;
}

const FIELD_LABELS: Record<string, string> = {
  document_type: "ประเภทเอกสาร (Type)",
  document_no: "เลขที่เอกสาร / ใบกำกับภาษี",
  document_date: "วันที่ในเอกสาร (Date)",
  party_name: "ชื่อคู่ค้า / ผู้ซื้อ / ผู้รับ / ผู้ขาย",
  source_file: "ไฟล์ต้นฉบับ (Source File)",
  quantity: "จำนวนรวม (Quantity)",
  total_amount: "ยอดเงินรวมสุทธิ (Total Amount)",
  sender_name: "ผู้ขาย / ผู้ออกเอกสาร",
  receiver_name: "ผู้ซื้อ / ผู้รับสินค้า",
  po_number: "เลขที่ใบสั่งซื้อ (PO No.)",
  tax_id: "เลขประจำตัวผู้เสียภาษี",
  truck_plate: "ทะเบียนรถขนส่ง",
  gross_weight_kg: "น้ำหนักรวม (กก.)",
  subtotal_amount: "ยอดก่อนภาษี",
  vat_amount: "ภาษีมูลค่าเพิ่ม 7%",
};

const CORE_FIELDS = new Set([
  "document_type",
  "document_no",
  "document_date",
  "party_name",
  "source_file",
  "quantity",
  "total_amount",
]);

export function ExtractedFieldsTable({
  fields,
  selectedType,
  onTypeChange,
  onAddField,
  onDeleteField,
}: ExtractedFieldsTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [targetGroup, setTargetGroup] = useState<"other" | "core">("other");

  function handleSaveField(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    if (onAddField) {
      onAddField(newKey.trim(), newValue.trim(), targetGroup === "other");
    }
    setNewKey("");
    setNewValue("");
    setShowAddModal(false);
  }

  return (
    <Card
      title="ฟิลด์สำคัญที่สกัดได้ (7 ฟิลด์หลัก + Other)"
      actions={
        onAddField ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-600/30 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 hover:bg-cyan-100/80 transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ เพิ่มฟิลด์ใน other</span>
          </button>
        ) : undefined
      }
      className="h-full"
    >
      <DocumentTypeSelector selected={selectedType} onChange={onTypeChange} />

      {/* Add Field Modal / Form */}
      {showAddModal && (
        <div className="mt-3 p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/50 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
              เพิ่มฟิลด์ข้อมูลลงในโครงสร้าง JSON
            </span>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSaveField} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ตำแหน่งจัดเก็บ
              </label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value as "other" | "core")}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="other">ใน json_schema.other</option>
                <option value="core">ใน 7 ฟิลด์หลัก (Root)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ชื่อฟิลด์ (Key)
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="เช่น driver_name, notes"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ค่าของข้อมูล (Value)
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="เช่น นายสมชาย, คลัง A1"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 py-1.5 text-xs font-bold text-white transition-colors"
              >
                บันทึกฟิลด์
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-slate-50 text-xs text-navy">
              <th className="px-3 py-2">ลำดับ</th>
              <th className="px-3 py-2">ข้อความจากเอกสาร (Source Text)</th>
              <th className="px-3 py-2">ฟิลด์ใน JSON</th>
              <th className="px-3 py-2">ค่าที่แปลงได้</th>
              <th className="px-3 py-2">ความมั่นใจ</th>
              <th className="px-3 py-2">กลุ่มฟิลด์</th>
              <th className="px-3 py-2">สถานะ</th>
              {onDeleteField && <th className="px-3 py-2 text-center">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {fields.length > 0 ? (
              fields.map((field) => {
                const isCore = CORE_FIELDS.has(field.field);
                return (
                  <tr key={`${field.field}-${field.id}`} className="border-b border-line hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center text-slate-700">{field.id}</td>
                    <td className="px-3 py-2 font-medium text-ink">{field.sourceText}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs font-bold text-navy block">{field.field}</span>
                      <span className="text-[11px] text-slate-500 block">{FIELD_LABELS[field.field] || ""}</span>
                    </td>
                    <td className="px-3 py-2 text-ink font-semibold">{field.value}</td>
                    <td className="px-3 py-2 font-bold text-ink">{field.confidence}%</td>
                    <td className="px-3 py-2">
                      {isCore ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          7 ฟิลด์หลัก (Root)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800 border border-cyan-200">
                          other (ส่วนขยาย)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={field.status} />
                    </td>
                    {onDeleteField && (
                      <td className="px-3 py-2 text-center">
                        {!isCore && (
                          <button
                            type="button"
                            onClick={() => onDeleteField(field.field, true)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="ลบฟิลด์ออกจาก other"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm font-bold text-slate-500">
                  รอข้อมูลฟิลด์จริงจาก SLM
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
