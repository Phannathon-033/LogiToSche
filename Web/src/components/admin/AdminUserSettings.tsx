import { Users } from "lucide-react";
import type { AdminDocumentRecord } from "../../types";

interface AdminUserSettingsProps {
  documents: AdminDocumentRecord[];
}

export function AdminUserSettings({ documents }: AdminUserSettingsProps) {
  const users = new Map<string, { name: string; email: string; role: string; docs: number }>();
  documents.forEach((document) => {
    const email = document.uploadedBy.email || (document.uploadedBy.name.includes("@") ? document.uploadedBy.name : "");
    const key = email || document.uploadedBy.name;
    const current = users.get(key) || { name: document.uploadedBy.name, email, role: document.uploadedBy.role, docs: 0 };
    current.docs += 1;
    users.set(key, current);
  });

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-slate-900">
          <Users className="h-4.5 w-4.5 text-blue-600" /> ผู้บันทึกเอกสารจากข้อมูลจริง
        </h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">รายชื่อนี้สร้างจาก user name ที่แนบมากับเอกสารใน Firebase ไม่ใช่ระบบจัดการบัญชีผู้ใช้</p>
      </div>
      {users.size === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">ยังไม่มีผู้ใช้ที่บันทึกเอกสาร</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-2">ชื่อผู้บันทึก</th>
                <th className="pb-3 px-2">อีเมล</th>
                <th className="pb-3 px-2">บทบาทจาก record</th>
                <th className="pb-3 pl-2 text-right">เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {[...users.values()].map((user) => (
                <tr key={`${user.name}-${user.email}`} className="border-b border-slate-100 last:border-0">
                  <td className="py-3.5 pr-2 font-bold text-slate-900">{user.name}</td>
                  <td className="px-2 py-3.5 font-semibold text-slate-500">{user.email || "ไม่มีอีเมลใน record"}</td>
                  <td className="px-2 py-3.5 text-slate-600">{user.role}</td>
                  <td className="py-3.5 pl-2 text-right font-black text-slate-800">{user.docs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
