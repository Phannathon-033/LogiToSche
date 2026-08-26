import { useState } from "react";
import { Search, FileText, FileImage, ShieldAlert, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface AdminReviewQueueProps {
  mockDocs: any[];
  onStartEdit: (doc: any) => void;
}

export function AdminReviewQueue({ mockDocs, onStartEdit }: AdminReviewQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDocs = mockDocs.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อไฟล์ หรือประเภทเอกสาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {["all", "success", "review", "error"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                statusFilter === status ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "all" ? "ทั้งหมด" : status === "success" ? "สำเร็จ" : status === "review" ? "รอตรวจสอบ" : "ข้อผิดพลาด"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
              <th className="pb-3 pr-2">ชื่อไฟล์เอกสาร</th>
              <th className="pb-3 px-2">ประเภท</th>
              <th className="pb-3 px-2">อัปโหลดโดย</th>
              <th className="pb-3 px-2">เวลาที่ประมวลผล</th>
              <th className="pb-3 px-2">สถานะประมวลผล</th>
              <th className="pb-3 px-2 text-right">ความแม่นยำ</th>
              <th className="pb-3 pl-2 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors">
                <td className="py-3.5 pr-2">
                  <span className="flex items-center gap-2 font-bold text-slate-900">
                    {doc.fileName.endsWith(".jpg") ? <FileImage className="h-4.5 w-4.5 text-emerald-600 shrink-0" /> : <FileText className="h-4.5 w-4.5 text-red-600 shrink-0" />}
                    <span className="truncate max-w-[200px]" title={doc.fileName}>{doc.fileName}</span>
                  </span>
                </td>
                <td className="py-3.5 px-2">
                  <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                    {doc.type}
                  </span>
                </td>
                <td className="py-3.5 px-2">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 font-black text-[11px] text-blue-600 flex items-center justify-center">
                      {doc.uploadedBy.avatar}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 leading-none">{doc.uploadedBy.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{doc.uploadedBy.role}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-2 text-slate-500 font-semibold">{doc.date}</td>
                <td className="py-3.5 px-2">
                  <StatusBadge status={doc.status} label={doc.statusLabel} />
                </td>
                <td className={`py-3.5 px-2 text-right font-black ${
                  doc.status === "error" ? "text-red-600" : doc.status === "review" ? "text-orange-600" : "text-slate-800"
                }`}>
                  {doc.result}
                </td>
                <td className="py-3.5 pl-2 text-right">
                  <button
                    onClick={() => onStartEdit(doc)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-700 hover:border-slate-400 transition"
                  >
                    ตรวจทาน & แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
