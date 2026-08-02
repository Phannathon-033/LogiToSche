import { FileImage, FileText } from "lucide-react";
import type { DocumentJob } from "../types";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";

interface RecentJobsTableProps {
  jobs: DocumentJob[];
}

export function RecentJobsTable({ jobs }: RecentJobsTableProps) {
  return (
    <Card
      title="ประวัติงานล่าสุด"
      actions={<button type="button" className="text-xs font-extrabold text-primary hover:underline">ดูทั้งหมด</button>}
      className="h-full"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-navy">
              <th className="px-2 py-2">ไฟล์เอกสาร</th>
              <th className="px-2 py-2">ประเภท</th>
              <th className="px-2 py-2">สถานะ</th>
              <th className="px-2 py-2">เริ่มต้น</th>
              <th className="px-2 py-2">ผลลัพธ์</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      {job.fileName.endsWith(".jpg") ? <FileImage className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-red-600" />}
                      {job.fileName}
                    </span>
                  </td>
                  <td className="px-2 py-2"><span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-navy">{job.type}</span></td>
                  <td className="px-2 py-2"><StatusBadge status={job.status} label={job.statusLabel} /></td>
                  <td className="px-2 py-2 text-ink">{job.startedAt}</td>
                  <td className="px-2 py-2 font-bold text-ink">{job.result}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-2 py-10 text-center text-sm font-bold text-slate-500">
                  ยังไม่มีประวัติงานจริง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
