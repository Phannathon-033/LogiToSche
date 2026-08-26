import { 
  Activity, 
  BarChart3, 
  BrainCircuit, 
  CheckCircle2, 
  FileImage, 
  FileText, 
  ShieldAlert,
  Settings
} from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface AdminOverviewProps {
  jobs: any[];
  mockDocs: any[];
  onStartEdit: (doc: any) => void;
  showToast: (message: string) => void;
}

export function AdminOverview({ jobs, mockDocs, onStartEdit, showToast }: AdminOverviewProps) {
  // Statistics
  const totalDocs = mockDocs.length + 112; 
  const successDocs = mockDocs.filter((d) => d.status === "success").length + 104;
  const reviewDocs = mockDocs.filter((d) => d.status === "review").length + 5;
  const successRate = ((successDocs / totalDocs) * 100).toFixed(1);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: เอกสารทั้งหมด */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel flex flex-col justify-between min-h-[125px]">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เอกสารทั้งหมด</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">117 <span className="text-xs font-medium text-slate-400">เอกสาร</span></h3>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] font-bold text-emerald-600">+1.2% เทียบกับเมื่อวาน</span>
            <svg className="w-16 h-6 text-emerald-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,25 Q15,5 30,20 T60,10 T90,5 T100,15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 2: อัตราแปลงสำเร็จ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel flex flex-col justify-between min-h-[125px]">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">อัตราแปลงสำเร็จ</span>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">92.3%</h3>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] font-bold text-slate-500">เกณฑ์รีวิว: &lt;85%</span>
            <svg className="w-16 h-6 text-emerald-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,15 Q20,5 40,25 T80,10 T100,5" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        {/* KPI 3: รายการรอตรวจสอบ */}
        <div className="bg-white rounded-2xl border border-slate-200/85 p-5 shadow-panel flex flex-col justify-between min-h-[125px]">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">รายการรอตรวจสอบ</span>
            <h3 className="text-3xl font-black text-orange-600 mt-1">5 <span className="text-xs font-normal text-slate-400">รายการ</span></h3>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">ต้องการการจัดการด่วน</span>
            <span className="text-[10px] font-bold text-slate-400">ค้างอยู่ในคิว</span>
          </div>
        </div>

        {/* KPI 4: ความแม่นยำโดยรวม */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel flex flex-col justify-between min-h-[125px]">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ความแม่นยำโดยรวม</span>
            <h3 className="text-3xl font-black text-purple-600 mt-1">93.4%</h3>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] font-semibold text-slate-500">ค่าเฉลี่ย Confidence ของ SLM</span>
            <svg className="w-16 h-6 text-purple-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,20 Q30,5 60,25 T100,10" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Analytics & System Resource */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Donut Chart: สถิติตามประเภทเอกสาร */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">สถิติตามประเภทเอกสาร</h4>
              <select className="border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 focus:outline-none">
                <option>7 วันที่ผ่านมา</option>
                <option>30 วันที่ผ่านมา</option>
              </select>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#2563EB" strokeWidth="4.5" strokeDasharray="55 45" strokeDashoffset="0" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10B981" strokeWidth="4.5" strokeDasharray="22 78" strokeDashoffset="-55" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="15 85" strokeDashoffset="-77" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#EF4444" strokeWidth="4.5" strokeDasharray="8 92" strokeDashoffset="-92" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900">117</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ทั้งหมด</span>
                </div>
              </div>

              <div className="w-full space-y-2 mt-2">
                {[
                  { name: "Invoice", count: 68, percentage: 55, color: "bg-blue-600" },
                  { name: "Bill of Lading", count: 28, percentage: 22, color: "bg-emerald-500" },
                  { name: "Packing List", count: 18, percentage: 15, color: "bg-orange-500" },
                  { name: "Purchase Order", count: 10, percentage: 8, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-bold">{item.count} ใบ ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Line Chart: แนวโน้มการประมวลผล */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">แนวโน้มการประมวลผล</h4>
              <select className="border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 focus:outline-none">
                <option>7 วันที่ผ่านมา</option>
              </select>
            </div>

            <div className="h-32 w-full flex items-end justify-between relative mt-4 px-2">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
              </div>

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none" fill="none">
                <path d="M0,90 L33,70 L66,50 L100,45 L133,30 L166,20 L200,15" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M0,30 L33,40 L66,35 L100,50 L133,45 L166,55 L200,40" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
              </svg>

              <div className="absolute -bottom-6 w-full flex justify-between text-[9px] font-bold text-slate-400 px-1">
                <span>20 ส.ค.</span>
                <span>22 ส.ค.</span>
                <span>24 ส.ค.</span>
                <span>26 ส.ค.</span>
              </div>
            </div>

            <div className="flex justify-center gap-5 mt-9 text-xs font-bold font-sans">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-4 rounded bg-emerald-500" />
                ประมวลผลสำเร็จ
              </span>
              <span className="flex items-center gap-1.5 text-orange-700">
                <span className="h-2 w-4 rounded bg-orange-500 border-dashed border" />
                รอตรวจสอบ
              </span>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-600" /> สถานะทรัพยากรระบบ
            </h4>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">GPU Engine</span>
                  <span className="text-xs font-bold text-slate-900">NVIDIA CUDA 12.6</span>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">VRAM Usage</span>
                  <span className="text-slate-900">4.8 GB / 8.0 GB (60%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: "60%" }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-2">
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase">โมเดลที่ใช้งาน</span>
                  <span className="text-slate-900 font-extrabold text-[11px] block mt-0.5">Qwen2.5-1.5B (FP16)</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase">OCR Engine</span>
                  <span className="text-slate-900 font-extrabold text-[11px] block mt-0.5">PaddleOCR v4 (GPU)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-500">System Uptime</span>
            <span className="font-extrabold text-slate-900">2 วัน 14 ชม. 32 นาที</span>
          </div>
        </div>
      </div>

      {/* Latest Documents & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        {/* Latest Documents Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-900">เอกสารล่าสุด</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                  <th className="pb-3 pr-2">เอกสาร</th>
                  <th className="pb-3 px-2">ประเภท</th>
                  <th className="pb-3 px-2">อัปโหลดโดย</th>
                  <th className="pb-3 px-2">วันที่อัปโหลด</th>
                  <th className="pb-3 px-2">สถานะ</th>
                  <th className="pb-3 px-2 text-right">ความมั่นใจ</th>
                  <th className="pb-3 pl-2 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {mockDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors">
                    <td className="py-3.5 pr-2">
                      <span className="flex items-center gap-2 font-bold text-slate-900">
                        {doc.fileName.endsWith(".jpg") ? <FileImage className="h-4.5 w-4.5 text-emerald-600 shrink-0" /> : <FileText className="h-4.5 w-4.5 text-red-600 shrink-0" />}
                        <span className="truncate max-w-[140px]">{doc.fileName}</span>
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
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-extrabold hover:border-slate-400 transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-blue-600" /> กิจกรรมล่าสุด
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3 text-xs">
                <span className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </span>
                <div>
                  <p className="font-semibold text-slate-700 leading-tight">
                    <strong className="text-slate-900">User: Nattapong P.</strong> อัปโหลดเอกสาร{" "}
                    <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">INV_20250825_001.pdf</span>
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">14:30 น.</span>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="h-6 w-6 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-3.5 w-3.5 text-orange-600" />
                </span>
                <div>
                  <p className="font-semibold text-slate-700 leading-tight">
                    เอกสาร <span className="font-mono text-[11px] text-orange-600 bg-orange-50 px-1 py-0.5 rounded">BL_20250825_018.pdf</span>{" "}
                    รอตรวจสอบโดย <strong className="text-slate-900">Sirilak K.</strong>
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">14:28 น.</span>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </span>
                <div>
                  <p className="font-semibold text-slate-700 leading-tight">
                    เอกสาร <span className="font-mono text-[11px] text-slate-900">PL_20250825_017.pdf</span> ผ่านการตรวจสอบ
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">14:25 น.</span>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="h-6 w-6 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                  <BrainCircuit className="h-3.5 w-3.5 text-purple-600" />
                </span>
                <div>
                  <p className="font-semibold text-slate-700 leading-tight">
                    <strong className="text-purple-700">เปลี่ยนโมเดล SLM:</strong> Qwen2.5-1.5B (FP16)
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">14:20 น.</span>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="h-6 w-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <Settings className="h-3.5 w-3.5 text-blue-600" />
                </span>
                <div>
                  <p className="font-semibold text-slate-700 leading-tight">
                    ตั้งค่าพร้อมต์ใหม่: <span className="font-medium text-slate-900">Invoice_Extract_v2</span>
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">14:15 น.</span>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => showToast("เปิดดูประวัติกิจกรรมทั้งหมด")}
            className="mt-6 w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
          >
            ดู log กิจกรรมทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
