import type { DocumentType, ExtractedField } from "../types";
import { Card } from "./Card";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { StatusBadge } from "./StatusBadge";

interface ExtractedFieldsTableProps {
  fields: ExtractedField[];
  selectedType: DocumentType;
  onTypeChange: (type: DocumentType) => void;
}

export function ExtractedFieldsTable({ fields, selectedType, onTypeChange }: ExtractedFieldsTableProps) {
  return (
    <Card title="ฟิลด์สำคัญที่สกัดได้" className="h-full">
      <DocumentTypeSelector selected={selectedType} onChange={onTypeChange} />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-slate-50 text-xs text-navy">
              <th className="px-3 py-2">ลำดับ</th>
              <th className="px-3 py-2">ข้อความจากเอกสาร (Source Text)</th>
              <th className="px-3 py-2">ฟิลด์ใน JSON</th>
              <th className="px-3 py-2">ค่าที่แปลงได้</th>
              <th className="px-3 py-2">ความมั่นใจ</th>
              <th className="px-3 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {fields.length > 0 ? (
              fields.map((field) => (
                <tr key={field.id} className="border-b border-line">
                  <td className="px-3 py-2 text-center text-slate-700">{field.id}</td>
                  <td className="px-3 py-2 font-medium text-ink">{field.sourceText}</td>
                  <td className="px-3 py-2 font-mono text-xs text-navy">{field.field}</td>
                  <td className="px-3 py-2 text-ink">{field.value}</td>
                  <td className="px-3 py-2 font-bold text-ink">{field.confidence}%</td>
                  <td className="px-3 py-2"><StatusBadge status={field.status} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm font-bold text-slate-500">
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
