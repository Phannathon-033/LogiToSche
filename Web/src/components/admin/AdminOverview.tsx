import { Activity, BarChart3, BrainCircuit, FileImage, FileText, ShieldAlert } from "lucide-react";
import type { AdminAnalyticsPoint, AdminDocumentRecord } from "../../types";
import { StatusBadge } from "../StatusBadge";

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
  const totalDocs = documents.length + 112;
  const successDocs = documents.filter((document) => document.status === "success").length + 104;
  const reviewDocs = documents.filter((document) => document.status === "review" || document.status === "error").length + 5;
  const successRate = ((successDocs / totalDocs) * 100).toFixed(1);
  const promptSignalCount = documents.reduce((count, document) => count + document.promptSignals.length, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex min-h-[125px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">เอกสารทั้งหมด</span>
            <h3 className="mt-1 text-3xl font-black text-slate-900">
              {totalDocs} <span className="text-xs font-medium text-slate-400">เอกสาร</span>
            </h3>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600">รวม baseline และคิวตรวจล่าสุด</span>
            <svg className="h-6 w-16 text-emerald-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,25 Q15,5 30,20 T60,10 T90,5 T100,15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="flex min-h-[125px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">อัตราแปลงสำเร็จ</span>
            <h3 className="mt-1 text-3xl font-black text-emerald-600">{successRate}%</h3>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">เคสที่ admin แก้แล้วนับเป็น success</span>
            <svg className="h-6 w-16 text-emerald-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,15 Q20,5 40,25 T80,10 T100,5" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        <div className="flex min-h-[125px] flex-col justify-between rounded-2xl border border-slate-200/85 bg-white p-5 shadow-panel">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">รายการรอตรวจสอบ</span>
            <h3 className="mt-1 text-3xl font-black text-orange-600">
              {reviewDocs} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </h3>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-extrabold text-orange-600">
              ต้องใช้ workspace ตรวจ
            </span>
            <span className="text-[10px] font-bold text-slate-400">ค้างอยู่ในคิว</span>
          </div>
        </div>

        <div className="flex min-h-[125px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">สัญญาณปรับ prompt</span>
            <h3 className="mt-1 text-3xl font-black text-purple-600">{promptSignalCount}</h3>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">เคสที่ควรย้ายไป Prompt Configuration</span>
            <svg className="h-6 w-16 text-purple-500" viewBox="0 0 100 30" fill="none">
              <path d="M0,20 Q30,5 60,25 T100,10" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">สถิติตามเป้าหมายงาน admin</h4>
              <select className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-[10px] font-bold text-slate-600 focus:outline-none">
                <option>7 วันที่ผ่านมา</option>
                <option>30 วันที่ผ่านมา</option>
              </select>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#2563EB" strokeWidth="4.5" strokeDasharray="40 60" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10B981" strokeWidth="4.5" strokeDasharray="20 80" strokeDashoffset="-40" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="-60" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#8B5CF6" strokeWidth="4.5" strokeDasharray="15 85" strokeDashoffset="-85" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900">{analytics.reduce((sum, item) => sum + item.value, 0)}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">signals</span>
                </div>
              </div>

              <div className="mt-2 w-full space-y-2">
                {analytics.map((item, index) => (
                  <div key={item.label} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-blue-600" : index === 1 ? "bg-emerald-500" : index === 2 ? "bg-orange-500" : "bg-purple-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">แนวโน้มการปรับแก้</h4>
              <select className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-[10px] font-bold text-slate-600 focus:outline-none">
                <option>7 วันที่ผ่านมา</option>
              </select>
            </div>

            <div className="relative mt-4 flex h-32 w-full items-end justify-between px-2">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
              </div>

              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 120" preserveAspectRatio="none" fill="none">
                <path d="M0,88 L33,74 L66,62 L100,48 L133,38 L166,22 L200,18" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M0,48 L33,52 L66,34 L100,42 L133,28 L166,36 L200,24" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
              </svg>

              <div className="absolute -bottom-6 flex w-full justify-between px-1 text-[9px] font-bold text-slate-400">
                <span>20 ส.ค.</span>
                <span>22 ส.ค.</span>
                <span>24 ส.ค.</span>
                <span>26 ส.ค.</span>
              </div>
            </div>

            <div className="mt-9 flex justify-center gap-5 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-4 rounded bg-emerald-500" />
                แก้เอกสารสำเร็จ
              </span>
              <span className="flex items-center gap-1.5 text-orange-700">
                <span className="h-2 w-4 rounded border border-dashed bg-orange-500" />
                ส่งเป็น prompt signal
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <div>
            <h4 className="mb-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
              <Activity className="h-4 w-4 text-blue-600" /> สถานะทรัพยากรระบบ
            </h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">GPU Engine</span>
                  <span className="text-xs font-bold text-slate-900">NVIDIA CUDA 12.6</span>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">VRAM Usage</span>
                  <span className="text-slate-900">4.8 GB / 8.0 GB (60%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[60%] rounded-full bg-blue-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-semibold">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="block text-[9px] font-black uppercase text-slate-400">โมเดลที่ใช้งาน</span>
                  <span className="mt-0.5 block text-[11px] font-extrabold text-slate-900">Qwen2.5-1.5B (FP16)</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="block text-[9px] font-black uppercase text-slate-400">OCR Engine</span>
                  <span className="mt-0.5 block text-[11px] font-extrabold text-slate-900">PaddleOCR v4 (GPU)</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <div className="flex gap-2.5">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <p className="text-[10px] font-semibold leading-relaxed text-amber-800">
                    งานของ admin โหมดนี้เน้นตรวจข้อมูลตกหล่นและเก็บ feedback จากเคสผิดพลาดเพื่อส่งต่อไปยัง Prompt Lab
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <span className="font-semibold text-slate-500">System Uptime</span>
            <span className="font-extrabold text-slate-900">2 วัน 14 ชม. 32 นาที</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">เอกสารล่าสุด</h3>
            <button
              type="button"
              onClick={onOpenPromptLab}
              className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-blue-500"
            >
              ไป Prompt Lab
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-black uppercase tracking-wider text-slate-400">
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
                {documents.map((document) => (
                  <tr key={document.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/40">
                    <td className="py-3.5 pr-2">
                      <span className="flex items-center gap-2 font-bold text-slate-900">
                        {document.fileName.endsWith(".jpg") ? (
                          <FileImage className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                        ) : (
                          <FileText className="h-4.5 w-4.5 shrink-0 text-red-600" />
                        )}
                        <span className="max-w-[180px] truncate">{document.fileName}</span>
                      </span>
                    </td>
                    <td className="px-2 py-3.5">
                      <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{document.type}</span>
                    </td>
                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-black text-blue-600">
                          {document.uploadedBy.avatar}
                        </span>
                        <div>
                          <p className="leading-none font-bold text-slate-800">{document.uploadedBy.name}</p>
                          <p className="text-[9px] font-semibold text-slate-400">{document.uploadedBy.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 font-semibold text-slate-500">{document.date}</td>
                    <td className="px-2 py-3.5">
                      <StatusBadge status={document.status} label={document.statusLabel} />
                    </td>
                    <td className="px-2 py-3.5 text-right font-black text-slate-800">{document.result}</td>
                    <td className="py-3.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(document.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-700 transition hover:border-slate-400"
                      >
                        ตรวจทาน & แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <div className="mb-6 flex items-center gap-2">
            <BrainCircuit className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">Prompt Feedback ล่าสุด</h3>
          </div>

          <div className="space-y-3">
            {documents.flatMap((document) => document.promptSignals.slice(0, 1)).map((signal, index) => (
              <div key={`${signal.id}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black leading-relaxed text-slate-900">{signal.title}</p>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700">
                    {signal.severity}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500">{signal.detail}</p>
              </div>
            ))}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <p className="text-xs font-black text-slate-900">Field Watchlist</p>
              </div>
              <div className="mt-3 space-y-2">
                {["receiver_name", "total_amount", "document_date", "truck_plate"].map((field) => (
                  <div key={field} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-slate-700">{field}</span>
                    <span className="font-bold text-slate-400">monitor</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
