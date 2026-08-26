import { useState } from "react";
import { BarChart3, TrendingUp, Calendar, Clock, Award, ShieldCheck, Download } from "lucide-react";

export function AdminReports() {
  const [reportRange, setReportRange] = useState("7 วันที่ผ่านมา");

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">รายงาน & สถิติการประมวลผล</h3>
          <p className="text-sm font-black text-slate-900 mt-1">วิเคราะห์ประสิทธิภาพและความแม่นยำของ AI</p>
        </div>
        <div className="flex gap-2">
          <select
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
            className="rounded-xl border border-slate-200 p-2.5 text-xs font-semibold focus:border-blue-600 focus:outline-none bg-slate-50"
          >
            <option>7 วันที่ผ่านมา</option>
            <option>30 วันที่ผ่านมา</option>
            <option>90 วันที่ผ่านมา</option>
          </select>
          <button 
            onClick={() => alert("ระบบกำลังส่งออกรายงานวิเคราะห์ในรูปแบบ PDF...")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            ดาวน์โหลดรายงาน PDF
          </button>
        </div>
      </div>

      {/* Accuracy and Speed Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: SLA Speed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <Clock className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">ความเร็วเฉลี่ย (SLA)</span>
          </div>
          <h4 className="text-3xl font-black text-slate-900">2.1 วินาที</h4>
          <p className="text-[10px] text-slate-400 font-semibold">เวลาประมวลผลรวมต่อเอกสาร (PaddleOCR + Qwen SLM)</p>
        </div>

        {/* Card 2: Accuracy Level */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <Award className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">ความแม่นยำเฉลี่ย</span>
          </div>
          <h4 className="text-3xl font-black text-slate-900">93.4%</h4>
          <p className="text-[10px] text-slate-400 font-semibold">อ้างอิงจากคะแนน Confidence Score ของฟิลด์สกัดข้อมูล</p>
        </div>

        {/* Card 3: Auto Pass Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel space-y-3">
          <div className="flex items-center gap-2 text-purple-600">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">อัตราผ่านอัตโนมัติ</span>
          </div>
          <h4 className="text-3xl font-black text-slate-900">92.3%</h4>
          <p className="text-[10px] text-slate-400 font-semibold">เอกสารที่ไม่ต้องผ่านการแก้ไขด้วยมือของพนักงาน</p>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Latency Breakdown Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6">เวลาการประมวลผลแยกตามชนิดบิล (Latency by Document Type)</h4>
          <div className="space-y-4">
            {[
              { type: "Invoice", time: "1.8 วินาที", percent: 65, color: "bg-blue-600" },
              { type: "Bill of Lading", time: "2.4 วินาที", percent: 85, color: "bg-emerald-500" },
              { type: "Packing List", time: "2.1 วินาที", percent: 75, color: "bg-orange-500" },
              { type: "Purchase Order", time: "1.9 วินาที", percent: 68, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{item.type}</span>
                  <span className="text-slate-900 font-black">{item.time}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accuracy Level Trend Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">เทรนด์ความแม่นยำรายวัน (Accuracy Level Trend)</h4>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">+0.8% สัปดาห์นี้</span>
          </div>

          <div className="h-36 w-full flex items-end justify-between relative mt-4 px-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
            </div>

            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none" fill="none">
              <path d="M0,45 L40,38 L80,25 L120,28 L160,18 L200,10" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
            </svg>

            <div className="absolute -bottom-6 w-full flex justify-between text-[9px] font-bold text-slate-400 px-1">
              <span>จันทร์</span>
              <span>อังคาร</span>
              <span>พุธ</span>
              <span>พฤหัสฯ</span>
              <span>ศุกร์</span>
              <span>เสาร์</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
