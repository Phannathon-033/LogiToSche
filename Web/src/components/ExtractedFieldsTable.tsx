import { ArrowRight, ArrowUpRight, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CORE_FIELDS_DEF, CORE_FIELDS_SET, type DocumentType, type ExtractedField } from "../types";
import { Card } from "./Card";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { StatusBadge } from "./StatusBadge";

interface ExtractedFieldsTableProps {
  fields: ExtractedField[];
  selectedType: DocumentType;
  onTypeChange: (type: DocumentType) => void;
  onMoveOtherToCore?: (sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) => void;
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

export function ExtractedFieldsTable({
  fields,
  selectedType,
  onTypeChange,
  onMoveOtherToCore,
  onDeleteField,
}: ExtractedFieldsTableProps) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>("");
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>("party_name");
  const [removeFromOther, setRemoveFromOther] = useState(true);

  const otherFields = fields.filter((f) => !CORE_FIELDS_SET.has(f.field) || f.isOther);

  function openMoveModal(preselectedSourceKey?: string, preselectedTargetKey?: string) {
    if (preselectedSourceKey) {
      setSelectedSourceKey(preselectedSourceKey);
    } else if (otherFields.length > 0) {
      setSelectedSourceKey(otherFields[0].field);
    }

    if (preselectedTargetKey) {
      setSelectedTargetKey(preselectedTargetKey);
    }
    setShowMoveModal(true);
  }

  function handleConfirmMove(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSourceKey || !selectedTargetKey) return;

    if (onMoveOtherToCore) {
      onMoveOtherToCore(selectedSourceKey, selectedTargetKey, removeFromOther);
    }
    setShowMoveModal(false);
  }

  const selectedSourceField = otherFields.find((f) => f.field === selectedSourceKey);

  return (
    <Card
      title="ฟิลด์สำคัญที่สกัดได้ (7 ฟิลด์หลัก + Other)"
      actions={
        onMoveOtherToCore && otherFields.length > 0 ? (
          <button
            type="button"
            onClick={() => openMoveModal()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/30 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-sm"
          >
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
            <span>ย้ายจาก other เข้า 7 ฟิลด์หลัก</span>
          </button>
        ) : undefined
      }
      className="h-full"
    >
      <DocumentTypeSelector selected={selectedType} onChange={onTypeChange} />

      {/* Move Other to Core Modal */}
      {showMoveModal && (
        <div className="mt-3 p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-3 animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              ย้ายค่าจาก Other เข้าสู่ 7 ฟิลด์หลัก (Move Other to Core Field)
            </span>
            <button
              type="button"
              onClick={() => setShowMoveModal(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleConfirmMove} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  1. เลือกฟิลด์ต้นทางใน Other
                </label>
                <select
                  value={selectedSourceKey}
                  onChange={(e) => setSelectedSourceKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  required
                >
                  {otherFields.length === 0 && <option value="">ไม่มีฟิลด์ใน other</option>}
                  {otherFields.map((f) => (
                    <option key={f.field} value={f.field}>
                      {f.field} ({FIELD_LABELS[f.field] || "other"}): {f.value.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  2. เลือก 7 ฟิลด์หลักเป้าหมายที่ต้องการแทนที่
                </label>
                <select
                  value={selectedTargetKey}
                  onChange={(e) => setSelectedTargetKey(e.target.value)}
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

            {selectedSourceField && (
              <div className="rounded-lg border border-blue-100 bg-white p-2.5 text-xs">
                <span className="text-slate-500 block text-[11px]">ตัวอย่างค่าที่จะนำไปใส่ใน 7 ฟิลด์หลัก:</span>
                <span className="font-bold text-navy text-sm mt-0.5 block">{selectedSourceField.value}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeFromOther}
                  onChange={(e) => setRemoveFromOther(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>ลบฟิลด์ออกจาก other หลังจากย้ายเข้าฟิลด์หลักแล้ว</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>ยืนยันการย้ายเข้า 7 ฟิลด์หลัก</span>
                </button>
              </div>
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
              <th className="px-3 py-2 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {fields.length > 0 ? (
              fields.map((field) => {
                const isCore = CORE_FIELDS_SET.has(field.field) && !field.isOther;
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
                    <td className="px-3 py-2 text-center">
                      {!isCore ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openMoveModal(field.field)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            title="ย้ายค่านี้เข้าไปแทนที่ใน 7 ฟิลด์หลัก"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            <span>ย้ายเข้าฟิลด์หลัก</span>
                          </button>
                          {onDeleteField && (
                            <button
                              type="button"
                              onClick={() => onDeleteField(field.field, true)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="ลบฟิลด์ออกจาก other"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        otherFields.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openMoveModal(undefined, field.field)}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            title="เลือกค่าจาก other มาใส่ฟิลด์นี้"
                          >
                            <span>เลือกจาก other</span>
                          </button>
                        )
                      )}
                    </td>
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
