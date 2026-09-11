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
      {/* Outer Glowing Pulsing Circle with Dual Guaranteed Rotating Rings & Icon */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Soft Ambient Glow */}
        <div className="absolute h-36 w-36 rounded-full bg-blue-500/15 blur-2xl animate-pulse" />

        {/* Outer Dotted Counter-Rotating Ring */}
        <div
          className="absolute h-28 w-28 rounded-full border-2 border-dashed border-blue-300 dark:border-blue-700 animate-spin-reverse-custom pointer-events-none"
        />

        {/* Middle Vibrant Smooth Spinning Ring */}
        <div
          className="absolute h-22 w-22 rounded-full border-4 border-slate-100 border-t-blue-600 border-r-cyan-500 animate-spin-fast shadow-md shadow-blue-500/10 pointer-events-none"
        />

        {/* Center Solid Icon Badge with Orbiting Indicator */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
          <Scan className="h-7 w-7 animate-pulse" />
          {/* Orbiting glowing dot */}
          <div className="absolute -inset-1 rounded-2xl border border-cyan-400/40 animate-spin-fast pointer-events-none">
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </div>
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

      {/* Live Spinning Indicator & Elapsed Time */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 font-medium">
        <Loader2 className="h-4 w-4 animate-spin-fast text-blue-600 shrink-0" />
        <span>ระบบกำลังประมวลผล OCR (PaddleOCR)...</span>
        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
          {seconds}s
        </span>
      </div>

      {/* Smooth Shimmer Progress Bar */}
      <div className="mt-3.5 w-56 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-shimmer" />
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
