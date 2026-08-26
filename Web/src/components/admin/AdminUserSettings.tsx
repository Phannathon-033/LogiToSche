import { useState } from "react";
import { Users, Plus, ShieldAlert } from "lucide-react";

export function AdminUserSettings() {
  const [users, setUsers] = useState([
    { name: "สมชาย วงศ์สวัสดิ์", role: "Admin", email: "somchai.w@logiai.co.th", status: "Active", docs: 142 },
    { name: "อนันต์ สุขใจ", role: "User", email: "anan.s@logiai.co.th", status: "Active", docs: 87 },
    { name: "พิมลพรรณ สายชล", role: "User", email: "pimonpan.p@logiai.co.th", status: "Active", docs: 54 },
    { name: "Nattapong P.", role: "User", email: "nattapong.p@logiai.co.th", status: "Active", docs: 31 },
    { name: "Sirilak K.", role: "User", email: "sirilak.k@logiai.co.th", status: "Active", docs: 68 },
    { name: "Wichai T.", role: "User", email: "wichai.t@logiai.co.th", status: "Inactive", docs: 12 },
  ]);

  function handleToggleStatus(index: number) {
    setUsers(current => 
      current.map((u, i) => 
        i === index 
          ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" } 
          : u
      )
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <Users className="h-4.5 w-4.5 text-blue-600" /> จัดการรายชื่อผู้ใช้งานและสิทธิ์เข้าถึง
        </h3>
        <button 
          onClick={() => alert("ระบบกำลังเชื่อมต่อ SSO ของหน่วยงาน")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow transition"
        >
          <Plus className="h-4 w-4" />
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
              <th className="pb-3 pr-2">ชื่อผู้ใช้</th>
              <th className="pb-3 px-2">อีเมล</th>
              <th className="pb-3 px-2">สิทธิ์การเข้าถึง (Role)</th>
              <th className="pb-3 px-2">จำนวนเอกสารที่อัปโหลด</th>
              <th className="pb-3 px-2">สถานะการใช้งาน</th>
              <th className="pb-3 pl-2 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <tr key={u.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors">
                <td className="py-3.5 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 font-bold text-xs flex items-center justify-center text-slate-600">
                      {u.name.charAt(0)}
                    </span>
                    <span className="font-bold text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-2 text-slate-500 font-semibold">{u.email}</td>
                <td className="py-3.5 px-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.role === "Admin" 
                      ? "bg-purple-50 text-purple-700 border border-purple-200" 
                      : "bg-slate-50 text-slate-600 border border-slate-200"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3.5 px-2 text-slate-700 font-bold">{u.docs} ใบ</td>
                <td className="py-3.5 px-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    u.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-3.5 pl-2 text-right">
                  <button
                    onClick={() => handleToggleStatus(index)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:border-slate-400 hover:text-red-500 transition"
                  >
                    {u.status === "Active" ? "ระงับใช้งาน" : "เปิดใช้งาน"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex gap-2.5 items-center">
        <ShieldAlert className="h-5 w-5 shrink-0 text-slate-500" />
        <p className="text-[10px] leading-relaxed text-slate-600 font-semibold">
          การแก้ไขบทบาท (Role) ของพนักงานจะเชื่อมโยงเข้ากับระบบ Active Directory / Single Sign-On (SSO) โดยอัตโนมัติ สำหรับการถอนรหัสเข้าคลาวด์ประมวลผลโลจิสติกส์
        </p>
      </div>
    </div>
  );
}
