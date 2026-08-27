import { FileImage, FileText, Search } from "lucide-react";
import { useState } from "react";
import type { AdminDocumentRecord } from "../../types";
import { StatusBadge } from "../StatusBadge";

interface AdminReviewQueueProps {
  documents: AdminDocumentRecord[];
  onOpenDocument: (documentId: string) => void;
}

export function AdminReviewQueue({ documents, onOpenDocument }: AdminReviewQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch =
      document.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.uploadedBy.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || document.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อไฟล์หรือผู้ใช้งาน..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "success", "processing", "error"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                  statusFilter === status ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status === "all" ? "ทั้งหมด" : status === "success" ? "สำเร็จ" : status === "processing" ? "กำลังประมวลผล" : "ไม่สำเร็จ"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-2">ชื่อไฟล์เอกสาร</th>
                <th className="pb-3 px-2">อัปโหลดโดย</th>
                <th className="pb-3 px-2">วันที่อัปโหลด</th>
                <th className="pb-3 px-2">สถานะประมวลผล</th>
                <th className="pb-3 px-2 text-right">ผลลัพธ์</th>
                <th className="pb-3 pl-2 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/40">
                  <td className="py-3.5 pr-2">
                    <span className="flex items-center gap-2 font-bold text-slate-900">
                      {document.fileName.endsWith(".jpg") ? (
                        <FileImage className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                      ) : (
                        <FileText className="h-4.5 w-4.5 shrink-0 text-red-600" />
                      )}
                      <span className="max-w-[200px] truncate" title={document.fileName}>
                        {document.fileName}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-black text-blue-600">
                        {document.uploadedBy.avatar}
                      </span>
                      <div>
                        <p className="leading-none font-bold text-slate-800">{document.uploadedBy.name}</p>
                        <p className="text-[9px] font-semibold text-slate-400">{document.uploadedBy.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 font-semibold text-slate-500">{document.date}</td>
                  <td className="px-2 py-3.5">
                    <StatusBadge status={document.status} label={document.statusLabel} />
                  </td>
                  <td
                    className={`px-2 py-3.5 text-right font-black ${
                      document.status === "error" ? "text-red-600" : document.status === "review" ? "text-orange-600" : "text-slate-800"
                    }`}
                  >
                    {document.result}
                  </td>
                  <td className="py-3.5 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(document.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-700 transition hover:border-slate-400"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
