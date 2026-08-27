import { BarChart3, Download } from "lucide-react";
import type { AdminDocumentRecord, AdminErrorCluster } from "../../types";

interface AdminReportsProps {
  documents: AdminDocumentRecord[];
  errorClusters: AdminErrorCluster[];
  onOpenDocument: (documentId: string) => void;
}

export function AdminReports({ documents, errorClusters, onOpenDocument }: AdminReportsProps) {
  const fieldCounts = documents.reduce<Record<string, number>>((accumulator, document) => {
    document.missingFields.forEach((field) => {
      accumulator[field] = (accumulator[field] ?? 0) + 1;
    });
    document.conflictingFields.forEach((field) => {
      accumulator[field] = (accumulator[field] ?? 0) + 1;
    });
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">รายงาน & สถิติการประมวลผล</h3>
          <p className="mt-1 text-sm font-black text-slate-900">วิเคราะห์ความผิดพลาดเพื่อนำไปปรับ prompt และ rule</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
        >
          <Download className="h-4 w-4" />
          ดาวน์โหลดรายงาน PDF
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-center gap-2 text-blue-600">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">เอกสารในคิวตรวจ</span>
          </div>
          <h4 className="text-3xl font-black text-slate-900">{documents.filter((document) => document.status !== "success").length}</h4>
          <p className="text-[10px] font-semibold text-slate-400">คิวที่ admin ต้องเปิดตรวจและเก็บ feedback ต่อ</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-center gap-2 text-emerald-600">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">error clusters</span>
          </div>
          <h4 className="text-3xl font-black text-slate-900">{errorClusters.length}</h4>
          <p className="text-[10px] font-semibold text-slate-400">pattern ที่ควรยกไปจัดการใน Prompt Lab</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-panel">
          <div className="flex items-center gap-2 text-purple-600">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">field เสี่ยง</span>
          </div>
          <h4 className="text-3xl font-black text-slate-900">{Object.keys(fieldCounts).length}</h4>
          <p className="text-[10px] font-semibold text-slate-400">field ที่มี missing หรือ conflicting values</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <h4 className="mb-6 text-xs font-black uppercase tracking-wider text-slate-900">field ที่พลาดบ่อย</h4>
          <div className="space-y-4">
            {Object.entries(fieldCounts).map(([field, count]) => (
              <div key={field} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{field}</span>
                  <span className="font-black text-slate-900">{count} ครั้ง</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, count * 18)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">cluster ที่ควรเปิดดูต่อ</h4>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">พร้อมเป็น feedback</span>
          </div>
          <div className="space-y-3">
            {errorClusters.map((cluster, index) => {
              const document = documents[index % documents.length];
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => onOpenDocument(document.id)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-900">{cluster.title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">{cluster.recommendation}</p>
                    </div>
                    <span className="rounded bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">{cluster.documents} docs</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
