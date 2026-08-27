import { Download, Eye, FileImage, FileJson, FileSpreadsheet, FileText, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminDocumentRecord, JsonSchemaOutput } from "../../types";
import { StatusBadge } from "../StatusBadge";

interface AdminJobsHistoryProps {
  documents: AdminDocumentRecord[];
  selectedDocumentId: string;
  onSelectDocument: (documentId: string) => void;
  onBack: () => void;
  onSaveDocument: (documentId: string, nextJson: JsonSchemaOutput, correctionReason: string) => void;
  showToast: (message: string) => void;
}

export function AdminJobsHistory({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onBack,
  onSaveDocument,
  showToast,
}: AdminJobsHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [draftJson, setDraftJson] = useState<JsonSchemaOutput | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch = document.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || document.type === selectedType;
    const matchesStatus = selectedStatus === "all" || document.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? filteredDocuments[0] ?? documents[0] ?? null;

  useEffect(() => {
    setDraftJson(selectedDocument?.jsonOutput ?? null);
    setCorrectionReason(selectedDocument?.reviewNotes[0] ?? "");
  }, [selectedDocument]);

  function handleSelectAll() {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
      return;
    }
    setSelectedDocs(filteredDocuments.map((document) => document.id));
  }

  function handleSelectRow(id: string) {
    if (selectedDocs.includes(id)) {
      setSelectedDocs((current) => current.filter((item) => item !== id));
      return;
    }
    setSelectedDocs((current) => [...current, id]);
  }

  function updateField(field: keyof JsonSchemaOutput, value: string) {
    setDraftJson((current) => {
      if (!current) return current;
      const nextValue =
        field === "gross_weight_kg" || field === "quantity" || field === "total_amount" ? Number(value || 0) : value;
      return { ...current, [field]: nextValue };
    });
  }

  if (!selectedDocument || !draftJson) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-panel">
        <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">← รายการเอกสาร</button><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Document Detail</p><h3 className="max-w-[420px] truncate text-sm font-black text-slate-900">{selectedDocument.fileName}</h3></div></div>
        <div className="flex items-center gap-3"><StatusBadge status={selectedDocument.status} label={selectedDocument.statusLabel} /><div className="rounded-xl bg-blue-50 px-4 py-2 text-right"><p className="text-[9px] font-bold text-blue-500">Confidence Score</p><p className="text-lg font-black text-blue-700">{selectedDocument.overallConfidence}%</p></div></div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-2xl flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="ค้นหาตามชื่อไฟล์..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-3 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold focus:border-blue-600 focus:outline-none"
          >
            <option value="all">ทุกประเภทเอกสาร</option>
            <option value="Invoice">Invoice</option>
            <option value="Bill of Lading">Bill of Lading</option>
            <option value="Packing List">Packing List</option>
            <option value="Purchase Order">Purchase Order</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold focus:border-blue-600 focus:outline-none"
          >
            <option value="all">ทุกสถานะประมวลผล</option>
            <option value="success">สำเร็จ (Success)</option>
            <option value="review">รอตรวจสอบ (Review)</option>
            <option value="error">ข้อผิดพลาด (Failed)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => showToast(`กำลังดาวน์โหลด JSON สำหรับ ${selectedDocs.length || 1} ไฟล์รวมเป็นชุด (ZIP)...`)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            <FileJson className="h-4 w-4 text-blue-600" />
            ดาวน์โหลด JSON
          </button>
          <button
            type="button"
            onClick={() => showToast(`ส่งออกประวัติ ${selectedDocs.length || 1} รายการเป็นไฟล์ Excel/CSV สำเร็จ`)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            ส่งออก CSV
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-black uppercase tracking-wider text-slate-400">
                  <th className="w-8 pb-3 pr-2">
                    <button type="button" onClick={handleSelectAll} className="text-slate-400 transition hover:text-slate-600">
                      {selectedDocs.length === filteredDocuments.length && filteredDocuments.length > 0 ? "☑" : "☐"}
                    </button>
                  </th>
                  <th className="pb-3 pr-2">ไฟล์เอกสาร</th>
                  <th className="pb-3 px-2">ประเภท</th>
                  <th className="pb-3 px-2">เวลาที่ประมวลผล</th>
                  <th className="pb-3 px-2 text-center">เวลารันรวม</th>
                  <th className="pb-3 px-2">สถานะ</th>
                  <th className="pb-3 px-2 text-right">ความมั่นใจ</th>
                  <th className="pb-3 pl-2 text-right">มอนิเตอร์</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className={`border-b border-slate-100 last:border-0 transition-colors ${
                      selectedDocument.id === document.id ? "bg-blue-50/30" : "hover:bg-slate-50/40"
                    }`}
                  >
                    <td className="py-3.5 pr-2">
                      <button type="button" onClick={() => handleSelectRow(document.id)} className="text-slate-400 transition hover:text-slate-600">
                        {selectedDocs.includes(document.id) ? "☑" : "☐"}
                      </button>
                    </td>
                    <td className="py-3.5 pr-2">
                      <span className="flex items-center gap-2 font-bold text-slate-900">
                        {document.fileName.endsWith(".jpg") ? (
                          <FileImage className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                        ) : (
                          <FileText className="h-4.5 w-4.5 shrink-0 text-red-600" />
                        )}
                        <span className="max-w-[140px] truncate">{document.fileName}</span>
                      </span>
                    </td>
                    <td className="px-2 py-3.5">
                      <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{document.type}</span>
                    </td>
                    <td className="px-2 py-3.5 font-semibold text-slate-500">{document.date}</td>
                    <td className="px-2 py-3.5 text-center font-bold text-slate-700">{document.metrics.totalTime}</td>
                    <td className="px-2 py-3.5">
                      <StatusBadge status={document.status} label={document.statusLabel} />
                    </td>
                    <td className="px-2 py-3.5 text-right font-black text-slate-800">{document.result}</td>
                    <td className="py-3.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectDocument(document.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 transition hover:border-slate-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ตรวจเอกสาร
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-h-[400px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">ประเภทเอกสาร</p><p className="mt-1 text-xs font-black text-slate-800">{selectedDocument.type}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">ผู้ใช้งาน</p><p className="mt-1 truncate text-xs font-black text-slate-800">{selectedDocument.uploadedBy.name}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">วันที่อัปโหลด</p><p className="mt-1 text-xs font-black text-slate-800">{selectedDocument.date}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">เวลาประมวลผล</p><p className="mt-1 text-xs font-black text-slate-800">{selectedDocument.metrics.totalTime}</p></div></div><div className="space-y-5 flex-1">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">พื้นที่ตรวจและแก้ข้อมูล</h3>
              <h4 className="mt-1 truncate text-sm font-black text-slate-900" title={selectedDocument.fileName}>
                {selectedDocument.fileName}
              </h4>
            </div>

            <div className="space-y-3 border-y border-slate-100 py-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">GPU / Device</span>
                <span className="text-slate-900">{selectedDocument.metrics.device}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">โมเดล AI OCR</span>
                <span className="text-slate-900">{selectedDocument.metrics.ocrEngine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">โมเดล AI SLM</span>
                <span className="text-slate-900">{selectedDocument.metrics.slmModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เวลาตรวจคำ (OCR)</span>
                <span className="font-bold text-emerald-600">{selectedDocument.metrics.ocrTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เวลาสกัดความหมาย (SLM)</span>
                <span className="font-bold text-blue-600">{selectedDocument.metrics.slmTime}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 font-black">
                <span className="text-slate-900">เวลารวมเครื่องรันจริง</span>
                <span className="text-sm text-slate-900">{selectedDocument.metrics.totalTime}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">เหตุผลที่เข้าคิว</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedDocument.queueReasons.map((reason) => (
                  <span key={reason} className="rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-200">
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">OCR Text</span>
              <pre className="mt-2 max-h-[160px] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-700">
                {selectedDocument.ocrText}
              </pre>
            </div>

            <div className="space-y-3">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">แก้ไขค่า JSON</span>
              {(
                [
                  "document_type",
                  "invoice_no",
                  "document_date",
                  "receiver_name",
                  "truck_plate",
                  "gross_weight_kg",
                  "quantity",
                  "total_amount",
                ] as Array<keyof JsonSchemaOutput>
              ).map((field) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{field}</span>
                  <input
                    type="text"
                    value={String(draftJson[field] ?? "")}
                    onChange={(event) => updateField(field, event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">เหตุผลที่แก้ไข</span>
              <textarea
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold leading-relaxed focus:border-blue-600 focus:outline-none"
                rows={3}
              />
            </label>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => onSaveDocument(selectedDocument.id, draftJson, correctionReason)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
            >
              <Save className="h-4 w-4" />
              บันทึก feedback
            </button>
            <button
              type="button"
              onClick={() => showToast(`ดาวน์โหลด JSON ของไฟล์ ${selectedDocument.fileName} สำเร็จ`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              ดู JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
