import { useState } from "react";
import { 
  Activity, 
  BarChart3, 
  Braces, 
  BrainCircuit, 
  FolderOpen, 
  LayoutDashboard, 
  Settings, 
  Terminal, 
  Users, 
  Bell, 
  CircleHelp, 
  ChevronDown,
  LogOut,
  X,
  ShieldAlert,
  Save,
  ArrowRight,
  ClipboardCheck
} from "lucide-react";
import type { DocumentJob, JsonSchemaOutput } from "../types";

// Import Admin Sub-components
import { AdminOverview } from "./admin/AdminOverview";
import { AdminReviewQueue } from "./admin/AdminReviewQueue";
import { AdminPromptConfig } from "./admin/AdminPromptConfig";
import { AdminUserSettings } from "./admin/AdminUserSettings";
import { mockAdminDocs } from "../data/mockData";

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

  // Parameter Configurations (State shared with Prompt configuration panel)
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [selectedModel, setSelectedModel] = useState("qwen-2.5-1.5b");
  const [systemPrompt, setSystemPrompt] = useState(
    `คุณคือผู้ช่วยดึงข้อมูลด้านโลจิสติกส์อัจฉริยะ ให้ประมวลผลข้อความจากการทำ OCR ต่อไปนี้และสกัดฟิลด์ต่างๆ ให้อยู่ในรูปแบบ JSON Schema ที่กำหนดอย่างเคร่งครัด`
  );

  // Mock edit JSON schema
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

  // Mock document datasets
  const [mockDocs, setMockDocs] = useState(mockAdminDocs);

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

  function handleSaveSettings() {
    showToast("บันทึกการตั้งค่าระบบเรียบร้อย");
  }

  // Switch content rendering based on menu selected
  function renderContent() {
    switch (activeMenu) {
      case "ภาพรวมระบบ":
        return (
          <AdminOverview 
            jobs={jobs} 
            mockDocs={mockDocs} 
            onStartEdit={handleStartEdit} 
            showToast={showToast} 
          />
        );
      case "ตรวจสอบ (Review)":
      case "จัดการเอกสาร":
        return (
          <AdminReviewQueue 
            mockDocs={mockDocs} 
            onStartEdit={handleStartEdit} 
          />
        );
      case "Prompt & SLM":
      case "ตั้งค่าระบบ":
        return (
          <AdminPromptConfig
            confidenceThreshold={confidenceThreshold}
            setConfidenceThreshold={setConfidenceThreshold}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            onSave={handleSaveSettings}
          />
        );
      case "User Management":
        return <AdminUserSettings />;
      default:
        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-panel text-center min-h-[400px] flex flex-col items-center justify-center">
            <span className="h-14 w-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Settings className="h-8 w-8" />
            </span>
            <h3 className="text-base font-black text-slate-900">กำลังเข้าสู่โหมด {activeMenu}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">หน้านี้อยู่ระหว่างพัฒนาเพื่อเชื่อมระบบ API เพิ่มเติม ในรุ่นจำลอง (Mockup) กรุณากลับไปที่ "ภาพรวมระบบ"</p>
            <button 
              onClick={() => setActiveMenu("ภาพรวมระบบ")} 
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition"
            >
              กลับหน้าหลักภาพรวม
            </button>
          </div>
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 w-full font-sans">
      {/* 1. Sidebar Navigation (Fixed left) */}
      <aside className="w-[280px] shrink-0 bg-slate-900 text-slate-300 flex flex-col justify-between h-screen sticky top-0 border-r border-slate-800">
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
                { name: "งาน & ประวัติ", icon: Activity },
                { name: "User Management", icon: Users },
                { name: "Prompt & SLM", icon: Terminal },
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
        {/* Header */}
        <header className="h-[76px] bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{activeMenu}</h2>
            <p className="text-xs text-slate-500 font-medium">แผงจัดการและประสิทธิภาพการทำงานระบบ AI เอกสาร</p>
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
              <Activity className="h-4 w-4 text-slate-400" />
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

        {/* Render Content Area */}
        <div className="p-8 max-w-[1440px] w-full mx-auto space-y-8 flex-1">
          {renderContent()}
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
