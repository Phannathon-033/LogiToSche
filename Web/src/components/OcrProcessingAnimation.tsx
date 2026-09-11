import { Cpu, FileSearch, Loader2, Scan, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface OcrProcessingAnimationProps {
  fileName?: string;
  isProcessing?: boolean;
}

export function OcrProcessingAnimation({
  fileName = "document.png",
  isProcessing = true,
}: OcrProcessingAnimationProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="flex h-full min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/80 p-8 shadow-inner text-center">
      {/* Outer Glowing Pulsing Circle with Dual Rotating Rings & Icon */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Soft Ambient Glow */}
        <div className="absolute h-32 w-32 rounded-full bg-blue-500/15 blur-2xl animate-pulse" />

        {/* Outer Dotted Rotating Ring */}
        <div
          className="absolute h-24 w-24 rounded-full border-2 border-dashed border-blue-300 dark:border-blue-700 animate-spin"
          style={{ animationDuration: "12s" }}
        />

        {/* Middle Smooth Spinning Gradient Ring */}
        <div
          className="absolute h-20 w-20 rounded-full border-3 border-transparent border-t-blue-600 border-r-cyan-400 animate-spin"
          style={{ animationDuration: "1.8s" }}
        />

        {/* Center Solid Icon Badge */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
          <Scan className="h-7 w-7 animate-pulse" />
        </div>

        {/* Small floating sparkles icon */}
        <div
          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-md animate-bounce"
          style={{ animationDuration: "2.4s" }}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Main Status Text */}
      <h3 className="text-base font-black text-slate-900 dark:text-white">
        กำลังสแกนข้อความในเอกสาร
      </h3>

      {/* File Name Pill */}
      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50/90 px-3.5 py-1 border border-blue-200/80 text-xs font-semibold text-blue-700 max-w-[300px] truncate shadow-xs">
        <FileSearch className="h-3.5 w-3.5 shrink-0 text-blue-600" />
        <span className="truncate">{fileName}</span>
      </div>

      {/* Clean Loading Spinner & Elapsed Time */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>ระบบกำลังประมวลผล OCR...</span>
        <span className="font-mono text-slate-400">({seconds}s)</span>
      </div>

      {/* Bottom Subtitle / Technology Pill */}
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100/80 px-3.5 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-200/60 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        <Cpu className="h-3.5 w-3.5 text-indigo-600" />
        <span>PaddleOCR v5 · NVIDIA CUDA GPU Accelerated</span>
      </div>
    </div>
  );
}
