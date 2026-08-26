import { useState } from "react";
import { Search, Download, Calendar, FileJson, CheckSquare, Square, FileSpreadsheet, Eye, FileImage, FileText } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface AdminJobsHistoryProps {
  jobs: any[];
  mockDocs: any[];
  showToast: (message: string) => void;
}

export function AdminJobsHistory({ jobs, mockDocs, showToast }: AdminJobsHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [inspectingDoc, setInspectingDoc] = useState<any | null>(null);

  // Combine jobs and mockDocs for history simulation
  const allHistory = [
    ...mockDocs,
    ...jobs.map(j => ({
      id: j.id,
      fileName: j.fileName,
      type: j.type,
      uploadedBy: { name: "Somchai W. (You)", role: "Admin", avatar: "A" },
      date: j.startedAt.includes(":") ? `26 ส.ค. 2025 ${j.startedAt}` : j.startedAt,
      status: j.status,
      statusLabel: j.statusLabel,
      result: j.result,
      ocrTime: "0.8s",
      slmTime: "1.4s",
      vram: "4.5 GB"
    }))
  ].map((item, idx) => ({
    ...item,
    // Ensure all items have simulated performance metrics
    ocrTime: item.ocrTime || `${(0.5 + (idx % 5) * 0.1).toFixed(1)}s`,
    slmTime: item.slmTime || `${(1.2 + (idx % 3) * 0.2).toFixed(1)}s`,
    vram: item.vram || "4.8 GB",
    totalTime: `${(parseFloat(item.ocrTime || "0.6") + parseFloat(item.slmTime || "1.3")).toFixed(1)}s`
  }));

  const filteredHistory = allHistory.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  function handleSelectAll() {
    if (selectedDocs.length === filteredHistory.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredHistory.map(d => d.id));
    }
  }

  function handleSelectRow(id: string) {
    if (selectedDocs.includes(id)) {
      setSelectedDocs(current => current.filter(item => item !== id));
    } else {
      setSelectedDocs(current => [...current, id]);
    }
  }

  function handleBatchDownload() {
    if (selectedDocs.length === 0) {
      showToast("กรุณาเลือกเอกสารที่ต้องการดาวน์โหลด");
      return;
    }
    showToast(`กำลังดาวน์โหลด JSON สำหรับ ${selectedDocs.length} ไฟล์รวมเป็นชุด (ZIP)...`);
  }

  function handleBatchExportCsv() {
    if (selectedDocs.length === 0) {
      showToast("กรุณาเลือกเอกสารที่ต้องการส่งออก");
      return;
    }
    showToast(`ส่งออกประวัติ ${selectedDocs.length} รายการเป็นไฟล์ Excel/CSV สำเร็จ`);
  }

  return (
    <div className="space-y-6">
      {/* Search & Selection Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1 max-w-2xl">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อไฟล์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Doc Type Selector */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-200 p-2 text-xs font-semibold focus:border-blue-600 focus:outline-none bg-slate-50"
          >
            <option value="all">ทุกประเภทเอกสาร</option>
            <option value="Invoice">Invoice</option>
            <option value="Bill of Lading">Bill of Lading</option>
            <option value="Packing List">Packing List</option>
            <option value="Purchase Order">Purchase Order</option>
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 p-2 text-xs font-semibold focus:border-blue-600 focus:outline-none bg-slate-50"
          >
            <option value="all">ทุกสถานะประมวลผล</option>
            <option value="success">สำเร็จ (Success)</option>
            <option value="review">รอตรวจสอบ (Review)</option>
            <option value="error">ข้อผิดพลาด (Failed)</option>
          </select>
        </div>

        {/* Batch Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleBatchDownload}
            disabled={selectedDocs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 transition disabled:opacity-50"
          >
            <FileJson className="h-4 w-4 text-blue-600" />
            ดาวน์โหลด JSON ({selectedDocs.length})
          </button>
          <button
            onClick={handleBatchExportCsv}
            disabled={selectedDocs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            ส่งออก CSV
          </button>
        </div>
      </div>

      {/* Main Grid: Table & Inspector Panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        {/* Jobs History Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                  <th className="pb-3 pr-2 w-8">
                    <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600 transition">
                      {selectedDocs.length === filteredHistory.length && filteredHistory.length > 0 ? (
                        <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
                      ) : (
                        <Square className="h-4.5 w-4.5" />
                      )}
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
                {filteredHistory.map((doc) => (
                  <tr 
                    key={doc.id} 
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors ${
                      inspectingDoc?.id === doc.id ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 pr-2">
                      <button onClick={() => handleSelectRow(doc.id)} className="text-slate-400 hover:text-slate-600 transition">
                        {selectedDocs.includes(doc.id) ? (
                          <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
                        ) : (
                          <Square className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </td>
                    {/* File Name */}
                    <td className="py-3.5 pr-2">
                      <span className="flex items-center gap-2 font-bold text-slate-900">
                        {doc.fileName.endsWith(".jpg") ? <FileImage className="h-4.5 w-4.5 text-emerald-600 shrink-0" /> : <FileText className="h-4.5 w-4.5 text-red-600 shrink-0" />}
                        <span className="truncate max-w-[140px]">{doc.fileName}</span>
                      </span>
                    </td>
                    {/* Type */}
                    <td className="py-3.5 px-2">
                      <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                        {doc.type}
                      </span>
                    </td>
                    {/* Upload date */}
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{doc.date}</td>
                    {/* Total runtime */}
                    <td className="py-3.5 px-2 text-center text-slate-700 font-bold">{doc.totalTime}</td>
                    {/* Status */}
                    <td className="py-3.5 px-2">
                      <StatusBadge status={doc.status} label={doc.statusLabel} />
                    </td>
                    {/* Confidence */}
                    <td className="py-3.5 px-2 text-right font-black text-slate-800">{doc.result}</td>
                    {/* Actions */}
                    <td className="py-3.5 pl-2 text-right">
                      <button
                        onClick={() => setInspectingDoc(doc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:border-slate-400 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ตรวจสอบบิล
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Inspector Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel flex flex-col justify-between min-h-[400px]">
          {inspectingDoc ? (
            <div className="space-y-5 flex-1">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">ข้อมูลจำลองเอกสารเชิงลึก</h3>
                <h4 className="text-sm font-black text-slate-900 mt-1 truncate" title={inspectingDoc.fileName}>
                  {inspectingDoc.fileName}
                </h4>
              </div>

              {/* Performance Metrics list */}
              <div className="space-y-3 border-y border-slate-100 py-4 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-400">ขนาดความกว้าง VRAM</span>
                  <span className="text-slate-900">{inspectingDoc.vram}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">โมเดล AI OCR</span>
                  <span className="text-slate-900">PaddleOCR v4 (GPU)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">โมเดล AI SLM</span>
                  <span className="text-slate-900">Qwen2.5-1.5B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">เวลาตรวจคำ (OCR)</span>
                  <span className="text-emerald-600 font-bold">{inspectingDoc.ocrTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">เวลาสกัดความหมาย (SLM)</span>
                  <span className="text-blue-600 font-bold">{inspectingDoc.slmTime}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 font-black">
                  <span className="text-slate-900">เวลารวมเครื่องรันจริง</span>
                  <span className="text-slate-900 text-sm">{inspectingDoc.totalTime}</span>
                </div>
              </div>

              {/* Uploader profile inside details */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">อัปโหลดโดย</span>
                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <span className="h-8 w-8 rounded-full bg-blue-50 border border-blue-200 font-black text-xs text-blue-600 flex items-center justify-center">
                    {inspectingDoc.uploadedBy.avatar}
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 leading-none">{inspectingDoc.uploadedBy.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{inspectingDoc.uploadedBy.role}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => showToast(`ดาวน์โหลด JSON ของไฟล์ ${inspectingDoc.fileName} สำเร็จ`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <Download className="h-4 w-4" />
                  โหลด JSON
                </button>
                <button
                  onClick={() => setInspectingDoc(null)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                >
                  ปิดหน้านี้
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <span className="h-12 w-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                <Eye className="h-6 w-6" />
              </span>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">แผงมอนิเตอร์บิลรายตัว</h4>
              <p className="text-slate-500 text-[11px] font-semibold mt-1.5 max-w-[240px]">
                คลิกปุ่ม **"ตรวจสอบบิล"** บนตารางประวัติ เพื่อดึงสถิติเวลาประมวลผลและการใช้ VRAM ของเอกสารใบนั้นขึ้นมาวิเคราะห์
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
