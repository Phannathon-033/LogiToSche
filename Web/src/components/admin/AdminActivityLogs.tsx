import { useState } from "react";
import { Search, ShieldAlert, Cpu, Terminal, RefreshCw, Key, FileEdit } from "lucide-react";

export function AdminActivityLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [logs, setLogs] = useState([
    {
      id: "log-1",
      timestamp: "26 ส.ค. 2025 14:30",
      user: "Nattapong P.",
      role: "User",
      action: "อัปโหลดและสแกนเอกสาร",
      target: "INV_20250825_001.pdf",
      category: "Document",
      ip: "192.168.1.42"
    },
    {
      id: "log-2",
      timestamp: "26 ส.ค. 2025 14:28",
      user: "Sirilak K.",
      role: "User",
      action: "ส่งเคสเข้าคิวตรวจสอบย้อนหลัง",
      target: "BL_20250825_018.pdf",
      category: "Audit",
      ip: "192.168.1.18"
    },
    {
      id: "log-3",
      timestamp: "26 ส.ค. 2025 14:20",
      user: "สมชาย วงศ์สวัสดิ์",
      role: "Admin",
      action: "เปลี่ยนการใช้งานโมเดล SLM",
      target: "Qwen2.5-1.5B (FP16)",
      category: "System",
      ip: "192.168.1.1"
    },
    {
      id: "log-4",
      timestamp: "26 ส.ค. 2025 14:15",
      user: "สมชาย วงศ์สวัสดิ์",
      role: "Admin",
      action: "อัปเดต System Prompt ตัวสกัดบิล",
      target: "Invoice_Extract_v2",
      category: "Config",
      ip: "192.168.1.1"
    },
    {
      id: "log-5",
      timestamp: "26 ส.ค. 2025 14:02",
      user: "อนันต์ สุขใจ",
      role: "User",
      action: "ล็อกอินเข้าใช้งานระบบ",
      target: "SSO Gateway (Data Operator)",
      category: "Auth",
      ip: "192.168.1.112"
    },
    {
      id: "log-6",
      timestamp: "26 ส.ค. 2025 13:48",
      user: "สมชาย วงศ์สวัสดิ์",
      role: "Admin",
      action: "แก้ไขและบันทึกฟิลด์เอกสารย้อนหลัง",
      target: "INV_20250825_015.pdf",
      category: "Override",
      ip: "192.168.1.1"
    }
  ]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || log.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้งาน กิจกรรม หรือเอกสาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-200 p-2.5 text-xs font-semibold focus:border-blue-600 focus:outline-none bg-slate-50"
        >
          <option value="all">ทุกหมวดหมู่ระบบ</option>
          <option value="Document">อัปโหลดเอกสาร (Document)</option>
          <option value="Override">เขียนทับบันทึก (Override)</option>
          <option value="System">ปรับแต่งระบบ (System)</option>
          <option value="Config">พร้อมต์ (Config)</option>
          <option value="Auth">สิทธิ์และความปลอดภัย (Auth)</option>
        </select>
      </div>

      {/* Table Logs */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
              <th className="pb-3 pr-2">เวลาบันทึก</th>
              <th className="pb-3 px-2">ผู้ปฏิบัติการ</th>
              <th className="pb-3 px-2">บทบาท</th>
              <th className="pb-3 px-2">กิจกรรมที่ปฏิบัติ</th>
              <th className="pb-3 px-2">เป้าหมาย/ทรัพยากร</th>
              <th className="pb-3 px-2">ประเภทล็อก</th>
              <th className="pb-3 pl-2 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors">
                <td className="py-3.5 pr-2 text-slate-500 font-semibold">{log.timestamp}</td>
                <td className="py-3.5 px-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 font-bold text-[10px] flex items-center justify-center text-slate-600">
                      {log.user.charAt(0)}
                    </span>
                    <span className="font-bold text-slate-900">{log.user}</span>
                  </div>
                </td>
                <td className="py-3.5 px-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    log.role === "Admin" ? "text-purple-700 bg-purple-50" : "text-slate-600 bg-slate-50"
                  }`}>
                    {log.role}
                  </span>
                </td>
                <td className="py-3.5 px-2 font-bold text-slate-800">{log.action}</td>
                <td className="py-3.5 px-2">
                  <span className="font-mono text-[10px] bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded text-slate-700 max-w-[180px] truncate block" title={log.target}>
                    {log.target}
                  </span>
                </td>
                <td className="py-3.5 px-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                    log.category === "System" 
                      ? "text-blue-700 bg-blue-50" 
                      : log.category === "Override"
                        ? "text-orange-700 bg-orange-50"
                        : log.category === "Auth"
                          ? "text-red-700 bg-red-50"
                          : "text-slate-600 bg-slate-100"
                  }`}>
                    {log.category}
                  </span>
                </td>
                <td className="py-3.5 pl-2 text-right font-semibold text-slate-500">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
