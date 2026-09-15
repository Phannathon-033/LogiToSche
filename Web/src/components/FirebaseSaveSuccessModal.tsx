import { ArrowRight, Check, Cloud, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface FirebaseSaveSuccessModalProps {
  isOpen: boolean;
  fileName: string;
  remainingCount: number;
  isLast: boolean;
  onAdvance: () => void;
}

export function FirebaseSaveSuccessModal({
  isOpen,
  fileName,
  remainingCount,
  isLast,
  onAdvance,
}: FirebaseSaveSuccessModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    // Start progress bar animation
    const progressTimer = setTimeout(() => {
      setProgress(100);
    }, 50);

    // Auto advance after 1.4 seconds
    const advanceTimer = setTimeout(() => {
      onAdvance();
    }, 1400);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(advanceTimer);
    };
  }, [isOpen, onAdvance]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fadeIn">
      {/* Success Card Modal */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-200/80 bg-white p-7 text-center shadow-2xl shadow-emerald-950/20 dark:border-emerald-900/50 dark:bg-slate-900 animate-scaleUp">
        
        {/* Soft Ambient Radial Glow */}
        <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl dark:bg-emerald-500/15" />

        {/* Animated Smooth Checkmark Ring */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 p-3 ring-8 ring-emerald-100/60 dark:ring-emerald-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 scale-100">
            <Check className="h-8 w-8 stroke-[3.2] animate-bounce-slight" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Cloud className="h-3 w-3 text-emerald-600" />
            <span>Firebase Cloud Storage & Firestore</span>
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            บันทึกข้อมูลสำเร็จ!
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
            บันทึกเอกสาร <b className="text-slate-800 dark:text-slate-200">"{fileName}"</b> และโครงสร้าง JSON Schema เรียบร้อยแล้ว
          </p>
        </div>

        {/* Next Step Transition Banner */}
        <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
          {!isLast ? (
            <div className="flex items-center justify-center gap-2">
              <ArrowRight className="h-4 w-4 animate-bounce-slight text-emerald-600 shrink-0" />
              <span>กำลังเปิดเอกสารชุดถัดไป (เหลือ {remainingCount} ฉบับ)...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>บันทึกครบทุกชุดแล้ว กำลังกลับหน้าแทรกเอกสาร...</span>
            </div>
          )}
        </div>

        {/* Smooth Auto-Advance Progress Bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-[1400ms] ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Manual Instant Advance Button */}
        <button
          type="button"
          onClick={onAdvance}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition"
        >
          {!isLast ? "ไปยังเอกสารชุดถัดไปทันที →" : "กลับสู่หน้าแทรกเอกสารทันที"}
        </button>
      </div>
    </div>
  );
}
