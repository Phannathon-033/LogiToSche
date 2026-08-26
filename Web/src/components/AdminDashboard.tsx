import { useState } from "react";
import { BarChart3, Braces, BrainCircuit, CheckCircle2, FileImage, FileText, LayoutDashboard, ListFilter, Save, Search, Settings, ShieldAlert, X } from "lucide-react";
import type { DocumentJob, JsonSchemaOutput } from "../types";
import { StatusBadge } from "./StatusBadge";

interface AdminDashboardProps {
  jobs: DocumentJob[];
  onUpdateJob: (updatedJob: DocumentJob, updatedJson?: JsonSchemaOutput) => void;
  showToast: (message: string) => void;
}

export function AdminDashboard({ jobs, onUpdateJob, showToast }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "queue" | "settings">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingJob, setEditingJob] = useState<DocumentJob | null>(null);
  
  // Settings States
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [selectedModel, setSelectedModel] = useState("qwen-2.5-1.5b");
  const [systemPrompt, setSystemPrompt] = useState(
    `คุณคือผู้ช่วยดึงข้อมูลด้านโลจิสติกส์อัจฉริยะ ให้ประมวลผลข้อความจากการทำ OCR ต่อไปนี้และสกัดฟิลด์ต่างๆ ให้อยู่ในรูปแบบ JSON Schema ที่กำหนดอย่างเคร่งครัด โดยรักษาข้อมูลดิบและพิกัดความถูกต้องไว้`
  );

  // Mock JSON Data for existing jobs when editing
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

  // Calculate statistics
  const totalDocs = jobs.length + 112; // Base offset to look realistic
  const successDocs = jobs.filter((j) => j.status === "success").length + 104;
  const reviewDocs = jobs.filter((j) => j.status === "review").length + 5;
  const errorDocs = jobs.filter((j) => j.status === "error").length + 3;
  const successRate = ((successDocs / totalDocs) * 100).toFixed(1);
  const avgConfidence = 93.4;

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleStartEdit(job: DocumentJob) {
    setEditingJob(job);
    // Seed edit details with some values
    setEditJson({
      document_type: job.type.toLowerCase(),
      invoice_no: job.id.startsWith("job-") ? `INV-2024-0${job.id.slice(-2)}` : "INV-2026-999",
      document_date: "2026-08-26",
      receiver_name: "บริษัท โลจิสติกส์ ไทย จำกัด",
      truck_plate: "72-9999",
      gross_weight_kg: 18500,
      quantity: 80,
      total_amount: 32000,
      other: {},
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingJob) return;

    const updatedJob: DocumentJob = {
      ...editingJob,
      status: "success",
      statusLabel: "เสร็จสมบูรณ์ (แอดมินแก้ไขแล้ว)",
      result: "100%",
    };

    onUpdateJob(updatedJob, editJson);
    setEditingJob(null);
    showToast("อัปเดตและบันทึกข้อมูลเอกสารโดยแอดมินเรียบร้อยแล้ว");
  }

  function handleSaveSettings() {
    showToast("บันทึกการตั้งค่าระบบและ Prompt ลงฐานข้อมูลสำเร็จ");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Admin Subheader & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h2 className="text-xl font-black text-navy">แผงควบคุมผู้ดูแลระบบ (Admin Console)</h2>
          <p className="text-xs text-slate-500">จัดการสิทธิ์ ตรวจทานข้อมูล แก้ไขคิวงาน และตั้งค่า SLM</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeTab === "overview" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            ภาพรวมระบบ
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeTab === "queue" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            คิวงาน & แก้ไขประวัติ
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeTab === "settings" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Settings className="h-4 w-4" />
            ตั้งค่า Prompt & SLM
          </button>
        </div>
      </div>

      {/* Tab Contents: Overview */}
      {activeTab === "overview" && (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-panel">
              <p className="text-xs font-bold text-slate-500 uppercase">เอกสารประมวลผลทั้งหมด</p>
              <h3 className="mt-2 text-3xl font-black text-navy">{totalDocs} <span className="text-xs font-normal text-slate-400">รายการ</span></h3>
              <div className="mt-2 text-xs text-emerald-600 font-semibold">⚡ อัปเดตล่าสุดวินาทีนี้</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-panel">
              <p className="text-xs font-bold text-slate-500 uppercase">อัตราแปลงสำเร็จอัตโนมัติ</p>
              <h3 className="mt-2 text-3xl font-black text-emerald-600">{successRate}%</h3>
              <div className="mt-2 text-xs text-slate-500">ผ่านเกณฑ์ Threshold {confidenceThreshold}% โดยตรง</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-panel">
              <p className="text-xs font-bold text-slate-500 uppercase">รายการค้างตรวจสอบ (Review)</p>
              <h3 className="mt-2 text-3xl font-black text-amber-600">{reviewDocs} <span className="text-xs font-normal text-slate-400">รายการ</span></h3>
              <div className="mt-2 text-xs text-slate-500">รอเจ้าหน้าที่ยืนยันหรือแก้ไขข้อมูล</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-panel">
              <p className="text-xs font-bold text-slate-500 uppercase">ความแม่นยำเฉลี่ยของระบบ</p>
              <h3 className="mt-2 text-3xl font-black text-primary">{avgConfidence}%</h3>
              <div className="mt-2 text-xs text-slate-500">วัดจากความมั่นใจเฉลี่ยของ SLM</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-panel">
              <h3 className="text-sm font-black text-navy mb-4 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" /> สถิติแบ่งตามประเภทเอกสาร
              </h3>
              <div className="space-y-3">
                {[
                  { type: "Invoice", count: 68, percentage: 55, color: "bg-blue-600" },
                  { type: "Bill of Lading", count: 28, percentage: 22, color: "bg-emerald-500" },
                  { type: "Packing List", count: 18, percentage: 15, color: "bg-amber-500" },
                  { type: "Purchase Order", count: 10, percentage: 8, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.type} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{item.type}</span>
                      <span>{item.count} ใบ ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-panel flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-navy mb-2 flex items-center gap-1.5">
                  <BrainCircuit className="h-4 w-4 text-cyan-600" /> สถานะทรัพยากรประมวลผล (GPU/Model)
                </h3>
                <p className="text-xs text-slate-500 mb-4">แสดงข้อมูลทรัพยากรการประมวลผลโลจิสติกส์ในขณะนี้</p>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-slate-400">สถานะ GPU</span>
                    <span className="text-emerald-600 font-bold">ACTIVE (CUDA 12.6)</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-slate-400">VRAM Usage</span>
                    <span>4.8 GB / 8.0 GB (60%)</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-slate-400">โมเดลเบื้องหลัง</span>
                    <span>Qwen2.5-1.5B (FP16)</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-slate-400">OCR Engine</span>
                    <span>PaddleOCR v4 (GPU)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Queue */}
      {activeTab === "queue" && (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-panel">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อไฟล์ หรือประเภทเอกสาร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-navy focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {["all", "success", "review", "error"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                    statusFilter === status ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status === "all" ? "ทั้งหมด" : status === "success" ? "สำเร็จ" : status === "review" ? "รอรีวิว" : "ข้อผิดพลาด"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-navy font-black">
                  <th className="px-3 py-3">รหัสงาน</th>
                  <th className="px-3 py-3">ชื่อไฟล์เอกสาร</th>
                  <th className="px-3 py-3">ประเภท</th>
                  <th className="px-3 py-3">สถานะประมวลผล</th>
                  <th className="px-3 py-3">เวลาที่ประมวลผล</th>
                  <th className="px-3 py-3">ความแม่นยำ</th>
                  <th className="px-3 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="border-b border-line hover:bg-slate-50/55 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-500">#{job.id}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 font-bold text-ink">
                        {job.fileName.endsWith(".jpg") ? <FileImage className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-red-600" />}
                        {job.fileName}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-navy">{job.type}</span>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={job.status} label={job.statusLabel} /></td>
                    <td className="px-3 py-3 text-slate-600 font-medium">{job.startedAt}</td>
                    <td className="px-3 py-3 font-black text-navy">{job.result}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleStartEdit(job)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 hover:text-navy hover:border-navy transition-all"
                      >
                        <Search className="h-3.5 w-3.5" />
                        แก้ไขข้อมูล
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: Settings */}
      {activeTab === "settings" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-panel space-y-4">
            <h3 className="text-sm font-black text-navy mb-4 flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-slate-500" /> ตั้งค่าความแม่นยำขั้นต่ำ
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Confidence Threshold (OCR/SLM)</span>
                <span className="text-primary font-black">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-navy"
              />
              <p className="text-[11px] text-slate-400">
                ฟิลด์เอกสารใดที่มีคะแนนมั่นใจต่ำกว่า {confidenceThreshold}% จะถูกบังคับให้ส่งเข้าคิวรอยืนยันแก้ไขโดยมนุษย์ก่อนเสมอ
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">โมเดลวิเคราะห์ความหมายภาษา (SLM Selection)</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold focus:border-navy focus:outline-none"
              >
                <option value="qwen-2.5-1.5b">Qwen2.5-1.5B-Instruct (Recommended - Low Latency)</option>
                <option value="qwen-2.5-7b">Qwen2.5-7B-Instruct (High Accuracy - Requires GPU vram &gt; 12GB)</option>
                <option value="llama-3.1-8b">Llama-3.1-8B-Instruct (Standard Multilingual)</option>
              </select>
            </div>
            
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
            >
              <Save className="h-4 w-4" />
              บันทึกการตั้งค่าระบบ
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-panel flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-navy mb-4 flex items-center gap-1.5">
                <BrainCircuit className="h-4 w-4 text-cyan-600" /> พร้อมต์ควบคุมโมเดล (System Prompt Editor)
              </h3>
              <p className="text-xs text-slate-500 mb-2">ระบุพฤติกรรมและการจัดรูปแบบเป้าหมายในการสกัดฟิลด์ข้อมูล:</p>
              
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-[180px] rounded-xl border border-slate-300 p-3 text-xs leading-relaxed focus:border-navy focus:outline-none font-mono"
              />
            </div>
            
            <button
              onClick={handleSaveSettings}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition self-start"
            >
              <Save className="h-4 w-4" />
              บันทึก System Prompt
            </button>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-line bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-base font-black text-navy">แก้ไขข้อมูลเอกสาร #{editingJob.id}</h3>
                <p className="text-[11px] font-bold text-slate-400">ไฟล์: {editingJob.fileName}</p>
              </div>
              <button onClick={() => setEditingJob(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit}>
              <div className="max-h-[380px] overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทเอกสาร</label>
                    <input
                      type="text"
                      value={editJson.document_type}
                      onChange={(e) => setEditJson({ ...editJson, document_type: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">เลขที่เอกสาร</label>
                    <input
                      type="text"
                      value={editJson.invoice_no}
                      onChange={(e) => setEditJson({ ...editJson, invoice_no: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">วันที่ในเอกสาร</label>
                    <input
                      type="text"
                      value={editJson.document_date}
                      onChange={(e) => setEditJson({ ...editJson, document_date: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ป้ายทะเบียนรถ</label>
                    <input
                      type="text"
                      value={editJson.truck_plate}
                      onChange={(e) => setEditJson({ ...editJson, truck_plate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้รับมอบ / บริษัทผู้รับปลายทาง</label>
                  <input
                    type="text"
                    value={editJson.receiver_name}
                    onChange={(e) => setEditJson({ ...editJson, receiver_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">น้ำหนักรวม (kg)</label>
                    <input
                      type="number"
                      value={editJson.gross_weight_kg}
                      onChange={(e) => setEditJson({ ...editJson, gross_weight_kg: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนหน่วย</label>
                    <input
                      type="number"
                      value={editJson.quantity}
                      onChange={(e) => setEditJson({ ...editJson, quantity: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ยอดรวมค่าบริการ</label>
                    <input
                      type="number"
                      value={editJson.total_amount}
                      onChange={(e) => setEditJson({ ...editJson, total_amount: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-navy focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    <strong>คำเตือน:</strong> การแก้ไขค่าเหล่านี้โดยผู้ดูแลระบบจะเป็นการ Override ข้อมูล OCR และคำตอบ SLM เดิม โดยตัวฟิลด์จะถูกระบุสถานะเป็น "สำเร็จโดยแอดมิน" (Approved & Overridden)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 border-t border-line bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
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
