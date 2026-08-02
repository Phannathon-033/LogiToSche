import { CheckCircle2, ChevronDown, TriangleAlert } from "lucide-react";
import type { ReviewItem } from "../types";

interface ManualReviewCardProps {
  items: ReviewItem[];
  onReview: (item: ReviewItem) => void;
}

export function ManualReviewCard({ items, onReview }: ManualReviewCardProps) {
  const pending = items.filter((item) => item.status === "review");

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="mb-3 flex items-center justify-between gap-2 text-base font-extrabold text-amber-900">
        <span className="flex items-center gap-2">
          <TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
          ต้องตรวจสอบโดยมนุษย์ (Review Required)
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
          {pending.length} รายการ
        </span>
      </h2>

      {pending.length === 0 ? (
        <div className="flex items-center justify-center gap-2.5 rounded-lg bg-white p-4 text-center text-sm font-bold text-success border border-green-200">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ตรวจสอบครบทุกฟิลด์เรียบร้อยแล้ว ไม่พบข้อสงสัยเพิ่มเติม
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-white p-3 text-xs shadow-xs"
            >
              <div className="flex min-w-[140px] items-center gap-2 font-extrabold text-navy">
                <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                <span className="truncate font-mono">{item.field}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span>OCR: <b className="text-navy">{item.ocrValue}</b></span>
                <span className="text-slate-300">|</span>
                <span>SLM: <b className="text-primary">{item.slmValue}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 font-bold text-amber-800">
                  {item.confidence}%
                </span>
                <button
                  type="button"
                  onClick={() => onReview(item)}
                  className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 font-extrabold text-primary hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition"
                >
                  ตรวจสอบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 ? (
        <button type="button" className="mx-auto mt-3 flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">
          ดูรายการตรวจสอบทั้งหมด
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

