import { FileText } from "lucide-react";
import type { AdminDocumentRecord } from "../../types";

interface AdminActivityLogsProps {
  documents: AdminDocumentRecord[];
}

export function AdminActivityLogs({ documents }: AdminActivityLogsProps) {
  const logs = documents
    .filter((document) => document.date !== "-")
    .map((document) => ({
      id: document.id,
      timestamp: document.date,
      user: document.uploadedBy.name,
      action: document.status === "review" ? "บันทึกเอกสารเข้าคิวตรวจสอบ" : "บันทึกผลสกัดเอกสาร",
      target: document.fileName,
      category: document.status === "review" ? "Review" : "Document",
    }));

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-slate-900">
          <FileText className="h-4.5 w-4.5 text-blue-600" /> กิจกรรมจากเอกสารที่บันทึกจริง
        </h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">ระบบยังไม่ได้เก็บ IP หรือ audit event แยกต่างหาก จึงแสดงเฉพาะกิจกรรมที่มีใน document record</p>
      </div>
      {logs.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">ยังไม่มี activity จากเอกสารจริง</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-2">เวลา</th>
                <th className="pb-3 px-2">ผู้บันทึก</th>
                <th className="pb-3 px-2">กิจกรรม</th>
                <th className="pb-3 px-2">เอกสาร</th>
                <th className="pb-3 pl-2 text-right">ประเภท</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3.5 pr-2 font-semibold text-slate-500">{log.timestamp}</td>
                  <td className="px-2 py-3.5 font-bold text-slate-900">{log.user}</td>
                  <td className="px-2 py-3.5 font-semibold text-slate-700">{log.action}</td>
                  <td className="px-2 py-3.5 font-mono text-[10px] text-slate-600">{log.target}</td>
                  <td className="py-3.5 pl-2 text-right font-bold text-slate-500">{log.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
