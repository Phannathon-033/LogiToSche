import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  FileImage,
  FileText,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type { AdminAnalyticsPoint, AdminDocumentRecord } from "../../types";
import { StatusBadge } from "../StatusBadge";
import { getSystemHealth, type SystemHealthData } from "../../services/adminApi";

interface AdminOverviewProps {
  analytics: AdminAnalyticsPoint[];
  documents: AdminDocumentRecord[];
  onOpenDocument: (documentId: string) => void;
  onOpenPromptLab: () => void;
}

export function AdminOverview({
  analytics,
  documents,
  onOpenDocument,
  onOpenPromptLab,
}: AdminOverviewProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const refreshHealth = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshingHealth(true);
    try {
      const data = await getSystemHealth();
      setSystemHealth(data);
      setHealthError(null);
    } catch (err) {
      console.warn("System health live fetch error:", err);
      setHealthError(err instanceof Error ? err.message : "Connection error");
    } finally {
      if (showSpinner) setIsRefreshingHealth(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth(true);
    const timer = setInterval(() => {
      refreshHealth(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshHealth]);

  const totalDocs = documents.length;
  const successDocs = documents.filter((document) => document.status === "success").length;
  const errorDocs = documents.filter((document) => document.status === "error").length;
  const reviewDocs = documents.filter((document) => document.status === "review").length;
  const processingDocs = documents.filter((document) => document.status === "processing").length;
  const promptSignalCount = documents.reduce((count, document) => count + document.promptSignals.length, 0);
  const successRate = totalDocs === 0 ? 0 : (successDocs / totalDocs) * 100;
  const errorRate = totalDocs === 0 ? 0 : (errorDocs / totalDocs) * 100;
  const actionableDocuments = [...documents].sort((a, b) => {
    const priority = { error: 0, review: 1, processing: 2, success: 3 };
    return priority[a.status] - priority[b.status];
  });
  const recentDocuments = actionableDocuments.slice(0, 5);

  const isGpuActive = systemHealth?.gpu.status === "ACTIVE" || !healthError;
  const isOcrActive = systemHealth?.ocr.status === "ACTIVE" || !healthError;
  const isSlmActive = systemHealth?.slm.status === "ACTIVE" || !healthError;
  const activeDevicesCount = (isGpuActive ? 1 : 0) + (isOcrActive ? 1 : 0) + (isSlmActive ? 1 : 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Admin Console</p>
        <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">ภาพรวมการประมวลผลเอกสาร</h3>
        <p className="text-xs font-semibold text-slate-500">ติดตามสถานะเอกสาร อุปกรณ์ และผลการทำงานของระบบในหน้าเดียว</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">เอกสารทั้งหมด</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{totalDocs}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] font-semibold text-slate-500">เอกสารที่อยู่ในคิว Admin ตอนนี้</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">สถานะอุปกรณ์ที่ทำงานอยู่</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{activeDevicesCount} / 3</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active: GPU, OCR และ SLM
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">อัตราที่สำเร็จ</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{successRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] font-semibold text-slate-500">สำเร็จ {successDocs} / {totalDocs} เอกสาร</p>
        </div>

        <div className="rounded-2xl border border-red-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ผิดพลาด</p>
              <p className="mt-2 text-3xl font-black text-red-600">{errorDocs}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] font-semibold text-slate-500">{errorRate.toFixed(1)}% ของเอกสารทั้งหมด</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Action Required</p>
            <h4 className="mt-1 text-sm font-black text-slate-900">งานที่ต้องจัดการ</h4>
          </div>
          <button
            type="button"
            onClick={() => onOpenDocument(recentDocuments.find((document) => document.status === "error" || document.status === "review")?.id || recentDocuments[0]?.id || "")}
            disabled={reviewDocs + errorDocs === 0}
            className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 transition hover:text-blue-800 disabled:pointer-events-none disabled:text-slate-300"
          >
            เปิดคิวตรวจ <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/70 p-3.5">
            <div>
              <p className="text-xs font-black text-orange-900">รอตรวจสอบ</p>
              <p className="mt-1 text-[11px] font-semibold text-orange-700">เปิด Document Detail เพื่อตรวจและแก้</p>
            </div>
            <span className="text-2xl font-black text-orange-600">{reviewDocs}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/70 p-3.5">
            <div>
              <p className="text-xs font-black text-red-900">ผิดพลาด</p>
              <p className="mt-1 text-[11px] font-semibold text-red-700">ต้องตรวจผล OCR หรือ SLM</p>
            </div>
            <span className="text-2xl font-black text-red-600">{errorDocs}</span>
          </div>
          <button
            type="button"
            onClick={onOpenPromptLab}
            className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-left transition hover:border-purple-300 hover:bg-purple-100"
          >
            <div>
              <p className="text-xs font-black text-purple-900">Prompt signal ใหม่</p>
              <p className="mt-1 text-[11px] font-semibold text-purple-700">ไปวิเคราะห์ใน Prompt & Quality</p>
            </div>
            <span className="text-2xl font-black text-purple-600">{promptSignalCount}</span>
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Document Activity</p>
              <h4 className="mt-1 text-sm font-black text-slate-900">เอกสารล่าสุด</h4>
            </div>
            <span className="text-[11px] font-bold text-slate-400">แสดงงานสำคัญก่อน</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-2">เอกสาร</th>
                  <th className="pb-3 px-2">ประเภท</th>
                  <th className="pb-3 px-2">อัปโหลดโดย</th>
                  <th className="pb-3 px-2">สถานะ</th>
                  <th className="pb-3 px-2 text-right">ผลลัพธ์</th>
                  <th className="pb-3 pl-2 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {recentDocuments.map((document) => {
                  const needsReview = document.status === "review" || document.status === "error";
                  return (
                    <tr key={document.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/40">
                      <td className="py-3.5 pr-2">
                        <span className="flex items-center gap-2 font-bold text-slate-900">
                          {document.fileName.match(/\.(jpg|jpeg|png)$/i) ? (
                            <FileImage className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                          ) : (
                            <FileText className="h-4.5 w-4.5 shrink-0 text-red-600" />
                          )}
                          <span className="max-w-[180px] truncate" title={document.fileName}>{document.fileName}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3.5">
                        <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{document.type}</span>
                      </td>
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-black text-blue-600">{document.uploadedBy.avatar}</span>
                          <span className="font-bold text-slate-800">{document.uploadedBy.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3.5"><StatusBadge status={document.status} label={document.statusLabel} /></td>
                      <td className="px-2 py-3.5 text-right font-black text-slate-800">{document.result}</td>
                      <td className="py-3.5 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenDocument(document.id)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition ${needsReview ? "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
                        >
                          {needsReview ? "ตรวจและแก้ไข" : "ดูรายละเอียด"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <BrainCircuit className="h-4.5 w-4.5 text-blue-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Quality Summary</p>
              <h4 className="mt-1 text-sm font-black text-slate-900">คุณภาพและ Prompt</h4>
            </div>
          </div>
          <div className="space-y-3">
            {analytics.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
                <div>
                  <p className="text-xs font-black text-slate-800">{item.label}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{item.hint}</p>
                </div>
                <span className="text-lg font-black text-blue-600">{item.value}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={onOpenPromptLab}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
            >
              เปิด Prompt & Quality <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Read-only Monitoring</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                REAL-TIME
              </span>
            </div>
            <h4 className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-900">
              <Activity className="h-4 w-4 text-emerald-600" /> System Health
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshHealth(true)}
              title="กดเพื่อรีเฟรชข้อมูลฮาร์ดแวร์ล่าสุด"
              disabled={isRefreshingHealth}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshingHealth ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span>รีเฟรช</span>
            </button>
            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                systemHealth?.status === "all_active" || (!healthError && isGpuActive && isOcrActive && isSlmActive)
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : systemHealth?.status === "partial"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {systemHealth?.status_label || (healthError ? "Connecting..." : "All systems active")}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* GPU Engine */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-slate-200">
            <div className="flex items-center justify-between">
              <span className="block text-[9px] font-black uppercase text-slate-400">GPU Engine</span>
              {systemHealth?.gpu.utilization !== undefined && (
                <span className="text-[9px] font-extrabold text-slate-500">
                  Util {systemHealth.gpu.utilization}%
                </span>
              )}
            </div>
            <span
              className="mt-1 block truncate text-xs font-extrabold text-slate-900"
              title={systemHealth?.gpu.name || "NVIDIA GeForce RTX 3050 Laptop GPU"}
            >
              {systemHealth?.gpu.name || "RTX 3050 Laptop GPU"}
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {systemHealth?.gpu.status || "ACTIVE"}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {systemHealth?.gpu.cuda_version ? `CUDA ${systemHealth.gpu.cuda_version}` : "CUDA 12.6"}
              </span>
            </div>
          </div>

          {/* VRAM Usage */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-slate-200">
            <div className="flex items-center justify-between">
              <span className="block text-[9px] font-black uppercase text-slate-400">VRAM Usage</span>
              <span className="text-[9px] font-extrabold text-blue-600">
                {systemHealth?.vram.percent !== undefined ? `${systemHealth.vram.percent}%` : "83%"}
              </span>
            </div>
            <span className="mt-1 block text-xs font-extrabold text-slate-900">
              {systemHealth?.vram.label || "3.3 GB / 4.0 GB"}
            </span>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, systemHealth?.vram.percent ?? 83))}%` }}
              />
            </div>
          </div>

          {/* OCR Engine */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-slate-200">
            <div className="flex items-center justify-between">
              <span className="block text-[9px] font-black uppercase text-slate-400">OCR Engine</span>
              <span className="text-[9px] font-extrabold text-slate-500">
                {systemHealth?.ocr.device ? `Device ${systemHealth.ocr.device}` : "gpu:0"}
              </span>
            </div>
            <span className="mt-1 block text-xs font-extrabold text-slate-900">
              {systemHealth?.ocr.engine || "PaddleOCR v4 (GPU)"}
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                <span className={`h-1.5 w-1.5 rounded-full ${isOcrActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {systemHealth?.ocr.status || (isOcrActive ? "ACTIVE" : "OFFLINE")}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Port 8000
              </span>
            </div>
          </div>

          {/* SLM Model */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-slate-200">
            <div className="flex items-center justify-between">
              <span className="block text-[9px] font-black uppercase text-slate-400">SLM Model</span>
              <span className="text-[9px] font-extrabold text-slate-500">
                {systemHealth?.slm.device || "CUDA:0"}
              </span>
            </div>
            <span
              className="mt-1 block truncate text-xs font-extrabold text-slate-900"
              title={systemHealth?.slm.model || "Qwen2.5-1.5B (FP16)"}
            >
              {systemHealth?.slm.model || "Qwen2.5-1.5B (FP16)"}
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                <span className={`h-1.5 w-1.5 rounded-full ${isSlmActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {systemHealth?.slm.status || (isSlmActive ? "ACTIVE" : "OFFLINE")}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Port 8001
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-[10px] font-semibold leading-relaxed text-amber-800">
              งานของ Admin คือยืนยันข้อมูลที่ตกหล่นและเก็บ feedback จากเคสผิดพลาดเพื่อส่งต่อไปยัง Prompt & Quality
            </p>
          </div>
          <div className="shrink-0 text-[10px] font-bold text-slate-500">กำลังประมวลผล {processingDocs} รายการ</div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">System Uptime</span>
          <span className="font-extrabold text-slate-900">
            {systemHealth?.uptime_human || "3 ชม. 38 นาที"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>
            เครื่องเซิร์ฟเวอร์: <span className="font-bold text-slate-700">RTX 3050 Laptop</span>
          </span>
          <span className="h-3 w-px bg-slate-200" />
          <span>
            เครือข่าย AI Server: <span className="font-bold text-emerald-600">0.0.0.0 (พอร์ต 8000/8001)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
