import { useState } from "react";
import { 
  BarChart3, 
  Braces, 
  BrainCircuit, 
  CheckCircle2, 
  FileImage, 
  FileText, 
  LayoutDashboard, 
  ListFilter, 
  Save, 
  Search, 
  Settings, 
  ShieldAlert, 
  X,
  Bell,
  CircleHelp,
  Users,
  Terminal,
  Activity,
  Calendar,
  RefreshCw,
  FolderOpen,
  ClipboardCheck,
  FileCode2,
  BookOpen,
  ArrowRight,
  LogOut,
  ChevronDown
} from "lucide-react";
import type { DocumentJob, JsonSchemaOutput } from "../types";
import { StatusBadge } from "./StatusBadge";

interface AdminDashboardProps {
  jobs: DocumentJob[];
  onUpdateJob: (updatedJob: DocumentJob, updatedJson?: JsonSchemaOutput) => void;
  showToast: (message: string) => void;
  setViewMode: (mode: "user" | "admin") => void;
}

export function AdminDashboard({ jobs, onUpdateJob, showToast, setViewMode }: AdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState("ภาพรวมระบบ");
  const [dateRange, setDateRange] = useState("25 ส.ค. 2025 - 26 ส.ค. 2025");
  const [editingJob, setEditingJob] = useState<DocumentJob | null>(null);

  // Settings States
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [selectedModel, setSelectedModel] = useState("qwen-2.5-1.5b");
  const [systemPrompt, setSystemPrompt] = useState(
    `คุณคือผู้ช่วยดึงข้อมูลด้านโลจิสติกส์อัจฉริยะ ให้ประมวลผลข้อความจากการทำ OCR ต่อไปนี้และสกัดฟิลด์ต่างๆ ให้อยู่ในรูปแบบ JSON Schema ที่กำหนดอย่างเคร่งครัด`
  );

  // Mock edit JSON
  const [editJson, setEditJson] = useState<JsonSchemaOutput>({
    document_type: "invoice",
    invoice_no: "INV-2024-001",
    document_date: "2024-05-15",
    receiver_name: "ABC Logistics Co., Ltd.",
    truck_plate: "70-1234",
    gross_weight_kg: 25000,
    quantity: 120,
    total_amount: 48750,
    other: {},
  });

  const [mockDocs, setMockDocs] = useState([
    {
      id: "INV_20250825_001.pdf",
      fileName: "INV_20250825_001.pdf",
      type: "Invoice",
      uploadedBy: { name: "Nattapong P.", role: "User", avatar: "N" },
      date: "25 ส.ค. 2025 14:30",
      status: "success",
      statusLabel: "Success",
      result: "95.6%",
    },
    {
      id: "BL_20250825_018.pdf",
      fileName: "BL_20250825_018.pdf",
      type: "Bill of Lading",
      uploadedBy: { name: "Sirilak K.", role: "Operator", avatar: "S" },
      date: "25 ส.ค. 2025 14:28",
      status: "review",
      statusLabel: "รอตรวจสอบ",
      result: "88.2%",
    },
    {
      id: "PL_20250825_017.pdf",
      fileName: "PL_20250825_017.pdf",
      type: "Packing List",
      uploadedBy: { name: "Wichai T.", role: "User", avatar: "W" },
      date: "25 ส.ค. 2025 14:25",
      status: "success",
      statusLabel: "สำเร็จ",
      result: "94.1%",
    },
    {
      id: "PO_20250825_016.pdf",
      fileName: "PO_20250825_016.pdf",
      type: "Purchase Order",
      uploadedBy: { name: "Nattapong P.", role: "User", avatar: "N" },
      date: "25 ส.ค. 2025 14:20",
      status: "success",
      statusLabel: "สำเร็จ",
      result: "91.3%",
    },
    {
      id: "INV_20250825_015.pdf",
      fileName: "INV_20250825_015.pdf",
      type: "Invoice",
      uploadedBy: { name: "Sirilak K.", role: "Operator", avatar: "S" },
      date: "25 ส.ค. 2025 14:15",
      status: "error",
      statusLabel: "ไม่ผ่านเกณฑ์",
      result: "62.7%",
    },
  ]);

  function handleStartEdit(doc: any) {
    setEditingJob({
      id: doc.id,
      fileName: doc.fileName,
      type: doc.type as any,
      status: doc.status as any,
      statusLabel: doc.statusLabel,
      startedAt: doc.date,
      result: doc.result,
    });
    setEditJson({
      document_type: doc.type.toLowerCase(),
      invoice_no: doc.id.includes("INV") ? "INV-2025-001" : "DOC-2025-018",
      document_date: "2025-08-25",
      receiver_name: "บริษัท แอลจีที เอเชีย จำกัด",
      truck_plate: "71-4432",
      gross_weight_kg: 12500,
      quantity: 50,
      total_amount: 19800,
      other: {},
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingJob) return;

    setMockDocs(current => 
      current.map(doc => 
        doc.id === editingJob.id 
          ? { ...doc, status: "success", statusLabel: "Success (แก้ไขแล้ว)", result: "100%" } 
          : doc
      )
    );

    onUpdateJob({
      id: editingJob.id,
      fileName: editingJob.fileName,
      type: editingJob.type,
      status: "success",
      statusLabel: "สำเร็จ (แอดมินแก้ไขแล้ว)",
      startedAt: editingJob.startedAt,
      result: "100%",
    }, editJson);

    setEditingJob(null);
    showToast("แอดมินแก้ไขฟิลด์เอกสารและบันทึกสำเร็จ");
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 w-full">
      {/* 1. Sidebar Navigation (Fixed left) */}
      <aside className="w-[280px] shrink-0 bg-slate-900 text-slate-300 flex flex-col justify-between min-h-screen sticky top-0 border-r border-slate-800">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo Area */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight uppercase tracking-wider">AI DocProcessor</h1>
              <p className="text-[10px] font-semibold text-blue-400">Admin Console</p>
            </div>
          </div>

          {/* Main Menus */}
          <div className="px-4 py-6 space-y-7">
            <div className="space-y-1.5">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">เมนูหลัก</p>
              {[
                { name: "ภาพรวมระบบ", icon: LayoutDashboard },
                { name: "จัดการเอกสาร", icon: FolderOpen },
                { name: "ตรวจสอบ (Review)", icon: ClipboardCheck },
                { name: "งาน & ประวัติ", icon: Activity },
                { name: "User Management", icon: Users },
                { name: "Prompt & SLM", icon: Terminal },
                { name: "ตั้งค่าระบบ", icon: Settings },
                { name: "รายงาน & สถิติ", icon: BarChart3 },
                { name: "กิจกรรมระบบ", icon: Braces },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveMenu(item.name);
                    showToast(`สลับหน้า: ${item.name}`);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeMenu === item.name 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" 
                      : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${activeMenu === item.name ? "text-white" : "text-slate-400"}`} />
                  {item.name}
                </button>
              ))}
            </div>

            {/* Shortcuts */}
            <div className="space-y-1.5">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">ส่วน Shortcut</p>
              {[
                { name: "อัปโหลดเอกสาร", action: () => setViewMode("user") },
                { name: "ตรวจสอบเอกสาร", action: () => setActiveMenu("ตรวจสอบ (Review)") },
                { name: "Template Prompt", action: () => setActiveMenu("Prompt & SLM") },
                { name: "API Documentation", action: () => showToast("เปิดดู API Documentation (Mock)") },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-left"
                >
                  <span>{item.name}</span>
                  <ArrowRight className="h-3 w-3 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Account info bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between rounded-xl p-2 bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-blue-600 font-black text-white text-xs flex items-center justify-center shrink-0">
                AD
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-extrabold text-white truncate">Super Admin</p>
                <p className="text-[10px] font-medium text-slate-500">admin@logiai.com</p>
              </div>
            </div>
            <button 
              onClick={() => setViewMode("user")} 
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
              title="สลับไปยังมุมมองผู้ใช้"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-50 min-h-screen">
        {/* 2. Header */}
        <header className="h-[76px] bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{activeMenu}</h2>
            <p className="text-xs text-slate-500">ภาพรวมการทำงานและประสิทธิภาพของระบบแปลงเอกสารด้วย AI</p>
          </div>

          <div className="flex items-center gap-4">
            {/* User View Switch Button */}
            <button
              onClick={() => setViewMode("user")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 transition"
            >
              สลับมุมมองผู้ใช้
            </button>

            {/* Date range selection */}
            <div className="hidden sm:flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-white text-xs font-semibold text-slate-700 shadow-sm">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{dateRange}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>

            <span className="hidden lg:inline text-[11px] font-bold text-slate-400">อัปเดตล่าสุด: 1 นาทีที่ผ่านมา</span>

            {/* Notifications and Help */}
            <div className="flex items-center gap-1">
              <button className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500" />
              </button>
              <button className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition">
                <CircleHelp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area based on Menu */}
        <div className="p-8 max-w-[1440px] w-full mx-auto space-y-8 flex-1">
          {activeMenu === "ภาพรวมระบบ" ? (
            <>
              {/* 3. KPI Cards */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* KPI 1: เอกสารทั้งหมด */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-panel flex flex-col justify-between min-h-[125px]">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เอกสารทั้งหมด</span>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">117 <span className="text-xs font-medium text-slate-400">เอกสาร</span></h3>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] font-bold text-emerald-600">+1.2% เทียบกับเมื่อวาน</span>
                    {/* SVG Sparkline */}
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
                    <span className="text-[11px] font-bold text-slate-500">เกณฑ์รีวิว: &lt;{confidenceThreshold}%</span>
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

              {/* 4. Document Analytics & 5. System Resource Status */}
              <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                {/* Left Column: Charts */}
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
                      {/* SVG Donut representation */}
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4" />
                          {/* Invoice: 55% */}
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#2563EB" strokeWidth="4.5" strokeDasharray="55 45" strokeDashoffset="0" />
                          {/* BOL: 22% */}
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10B981" strokeWidth="4.5" strokeDasharray="22 78" strokeDashoffset="-55" />
                          {/* PL: 15% */}
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="15 85" strokeDashoffset="-77" />
                          {/* PO: 8% */}
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

                  {/* Line Chart representation: แนวโน้มการประมวลผล */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">แนวโน้มการประมวลผล</h4>
                      <select className="border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 focus:outline-none">
                        <option>7 วันที่ผ่านมา</option>
                        <option>30 วันที่ผ่านมา</option>
                      </select>
                    </div>

                    <div className="h-32 w-full flex items-end justify-between relative mt-4 px-2">
                      {/* Chart Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="w-full border-t border-slate-100" />
                        <div className="w-full border-t border-slate-100" />
                        <div className="w-full border-t border-slate-100" />
                      </div>

                      {/* SVG graph lines */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none" fill="none">
                        {/* Success line (Green) */}
                        <path d="M0,90 L33,70 L66,50 L100,45 L133,30 L166,20 L200,15" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Review line (Orange) */}
                        <path d="M0,30 L33,40 L66,35 L100,50 L133,45 L166,55 L200,40" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
                      </svg>

                      {/* Labels */}
                      <div className="absolute -bottom-6 w-full flex justify-between text-[9px] font-bold text-slate-400 px-1">
                        <span>20 ส.ค.</span>
                        <span>22 ส.ค.</span>
                        <span>24 ส.ค.</span>
                        <span>26 ส.ค.</span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-5 mt-9 text-xs font-bold">
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

                {/* Right Column: System Resource Status */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-blue-600" /> สถานะทรัพยากรระบบ
                    </h4>

                    <div className="space-y-4">
                      {/* GPU Status */}
                      <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">GPU Engine</span>
                          <span className="text-xs font-bold text-slate-900">NVIDIA CUDA 12.6</span>
                        </div>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                          ACTIVE
                        </span>
                      </div>

                      {/* VRAM Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">VRAM Usage</span>
                          <span className="text-slate-900">4.8 GB / 8.0 GB (60%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: "60%" }}></div>
                        </div>
                      </div>

                      {/* Model details */}
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

              {/* 6. Latest Documents & 8. Recent Activity */}
              <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
                {/* Latest Documents Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-slate-900">เอกสารล่าสุด</h3>
                    <button onClick={() => showToast("เปิดดูประวัติทั้งหมด")} className="text-xs font-extrabold text-blue-600 hover:underline">ดูทั้งหมด</button>
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
                            {/* File Name */}
                            <td className="py-3.5 pr-2">
                              <span className="flex items-center gap-2 font-bold text-slate-900">
                                {doc.fileName.endsWith(".jpg") ? <FileImage className="h-4.5 w-4.5 text-emerald-600 shrink-0" /> : <FileText className="h-4.5 w-4.5 text-red-600 shrink-0" />}
                                <span className="truncate max-w-[140px]" title={doc.fileName}>{doc.fileName}</span>
                              </span>
                            </td>
                            {/* Document Type */}
                            <td className="py-3.5 px-2">
                              <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                                {doc.type}
                              </span>
                            </td>
                            {/* 7. Uploaded By User Info */}
                            <td className="py-3.5 px-2">
                              <button 
                                onClick={() => showToast(`เปิดโปรไฟล์: ${doc.uploadedBy.name}`)}
                                className="flex items-center gap-2 text-left hover:opacity-80 transition group shrink-0"
                              >
                                <span className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 font-black text-[11px] text-blue-600 flex items-center justify-center">
                                  {doc.uploadedBy.avatar}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-800 leading-none group-hover:underline">{doc.uploadedBy.name}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold">{doc.uploadedBy.role}</p>
                                </div>
                              </button>
                            </td>
                            {/* Date */}
                            <td className="py-3.5 px-2 text-slate-500 font-semibold">{doc.date}</td>
                            {/* Status */}
                            <td className="py-3.5 px-2">
                              <StatusBadge status={doc.status as any} label={doc.statusLabel} />
                            </td>
                            {/* Confidence */}
                            <td className={`py-3.5 px-2 text-right font-black ${
                              doc.status === "error" ? "text-red-600" : doc.status === "review" ? "text-orange-600" : "text-slate-800"
                            }`}>
                              {doc.result}
                            </td>
                            {/* Actions */}
                            <td className="py-3.5 pl-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => handleStartEdit(doc)}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-extrabold hover:border-slate-400 transition"
                                >
                                  View
                                </button>
                                <button 
                                  onClick={() => showToast("เปิดเมนูช่วยเหลือสำหรับแอดมิน")}
                                  className="px-1.5 py-1 text-slate-400 hover:text-slate-900 rounded transition"
                                >
                                  •••
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 8. Recent Activity Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-1.5">
                      <Activity className="h-4.5 w-4.5 text-blue-600" /> กิจกรรมล่าสุด
                    </h3>

                    <div className="space-y-4">
                      {/* Act 1 */}
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

                      {/* Act 2 */}
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

                      {/* Act 3 */}
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

                      {/* Act 4 */}
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

                      {/* Act 5 */}
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
                    onClick={() => showToast("เปิดดู log กิจกรรมทั้งหมด")} 
                    className="mt-6 w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    ดู log กิจกรรมทั้งหมด
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-panel text-center min-h-[400px] flex flex-col items-center justify-center">
              <span className="h-14 w-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8" />
              </span>
              <h3 className="text-base font-black text-slate-900">กำลังเข้าสู่โหมด {activeMenu}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">หน้านี้อยู่ระหว่างพัฒนาเพื่อเชื่อมระบบ API เพิ่มเติม ในรุ่นจำลอง (Mockup) กรุณากลับไปที่ "ภาพรวมระบบ" หรือกดสลับมุมมองเพื่อจำลองระบบ</p>
              <button 
                onClick={() => setActiveMenu("ภาพรวมระบบ")} 
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition"
              >
                กลับหน้าหลักภาพรวม
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal (Admin Override JSON) */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-base font-black text-slate-900">แก้ไขและอนุมัติข้อมูลเอกสาร #{editingJob.id}</h3>
                <p className="text-[11px] font-bold text-slate-400">ไฟล์: {editingJob.fileName}</p>
              </div>
              <button onClick={() => setEditingJob(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit}>
              <div className="max-h-[380px] overflow-y-auto p-6 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">ประเภทเอกสาร</label>
                    <input
                      type="text"
                      value={editJson.document_type}
                      onChange={(e) => setEditJson({ ...editJson, document_type: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">เลขที่เอกสาร</label>
                    <input
                      type="text"
                      value={editJson.invoice_no}
                      onChange={(e) => setEditJson({ ...editJson, invoice_no: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">วันที่ในเอกสาร</label>
                    <input
                      type="text"
                      value={editJson.document_date}
                      onChange={(e) => setEditJson({ ...editJson, document_date: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">ป้ายทะเบียนรถ</label>
                    <input
                      type="text"
                      value={editJson.truck_plate}
                      onChange={(e) => setEditJson({ ...editJson, truck_plate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">ชื่อผู้รับมอบ / บริษัทผู้รับปลายทาง</label>
                  <input
                    type="text"
                    value={editJson.receiver_name}
                    onChange={(e) => setEditJson({ ...editJson, receiver_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">น้ำหนักรวม (kg)</label>
                    <input
                      type="number"
                      value={editJson.gross_weight_kg}
                      onChange={(e) => setEditJson({ ...editJson, gross_weight_kg: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">จำนวนหน่วย</label>
                    <input
                      type="number"
                      value={editJson.quantity}
                      onChange={(e) => setEditJson({ ...editJson, quantity: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">ยอดรวมค่าบริการ</label>
                    <input
                      type="number"
                      value={editJson.total_amount}
                      onChange={(e) => setEditJson({ ...editJson, total_amount: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-amber-800">
                    <strong>คำเตือน:</strong> การแก้ไขค่าเหล่านี้นี้จะเป็นการ Override ข้อมูล OCR และคำตอบ SLM เดิม โดยตัวฟิลด์จะถูกระบุสถานะเป็น "อนุมัติโดยผู้ดูแลระบบ" ย้อนหลัง
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-500 transition"
                >
                  <Save className="h-4.5 w-4.5" />
                  บันทึกข้อมูลแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
