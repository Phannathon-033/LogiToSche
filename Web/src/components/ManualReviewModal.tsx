import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReviewItem } from "../types";

interface ManualReviewModalProps {
  item: ReviewItem | null;
  onCancel: () => void;
  onConfirm: (item: ReviewItem, value: string) => void;
}

export function ManualReviewModal({ item, onCancel, onConfirm }: ManualReviewModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!item) return;
    setValue(item.slmValue);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onCancel]);

  if (!item) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="review-title" className="text-lg font-extrabold text-navy">ตรวจสอบฟิลด์ {item.field}</h2>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-muted hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="ปิดหน้าตรวจสอบ">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ValueBox label="ค่า OCR" value={item.ocrValue} />
          <ValueBox label="ค่า SLM" value={item.slmValue} />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-extrabold text-ink">ค่าที่ถูกต้อง</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2.5 text-sm font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            ยกเลิก
          </button>
          <button type="button" onClick={() => onConfirm(item, value)} className="rounded-lg bg-primary px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            ยืนยันค่า
          </button>
        </div>
      </div>
    </div>
  );
}

function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
