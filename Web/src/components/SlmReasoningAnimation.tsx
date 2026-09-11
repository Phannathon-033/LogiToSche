import {
  BrainCircuit,
  Check,
  Cpu,
  FileCode,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SlmReasoningAnimationProps {
  title?: string;
  fileName?: string;
  isProcessing?: boolean;
}

const REASONING_STEPS = [
  {
    id: 1,
    title: "กำลังอ่านพิกัด 2D Spatial OCR & รูปภาพต้นฉบับ...",
    short: "2D Spatial OCR",
  },
  {
    id: 2,
    title: "โมเดล Qwen2.5-1.5B กำลังสกัด 11 ฟิลด์หลัก...",
    short: "11 ฟิลด์หลัก (Core)",
  },
  {
    id: 3,
    title: "ตรวจสอบความถูกต้องทางคณิตศาสตร์ (Math Integrity)...",
    short: "Math Check",
  },
  {
    id: 4,
    title: "กำลังจัดโครงสร้าง JSON Schema และวิเคราะห์ Other...",
    short: "JSON Schema & Other",
  },
];

export function SlmReasoningAnimation({
  title = "กำลังวิเคราะห์และจัดโครงสร้าง JSON ด้วย Qwen SLM",
  fileName = "document.png",
  isProcessing = true,
}: SlmReasoningAnimationProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(timer);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % REASONING_STEPS.length);
    }, 1600);
    return () => clearInterval(stepInterval);
  }, [isProcessing]);

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="flex h-full min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/80 p-8 shadow-inner text-center">
      {/* Outer Glowing Pulsing Circle with Dual Guaranteed Rotating Rings & Center Badge */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Soft Ambient Glow */}
        <div className="absolute h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl animate-pulse" />

        {/* Outer Dotted Counter-Rotating Ring */}
        <div className="absolute h-28 w-28 rounded-full border-2 border-dashed border-indigo-300 dark:border-indigo-700 animate-spin-reverse-custom pointer-events-none" />

        {/* Middle Vibrant Smooth Spinning Ring */}
        <div className="absolute h-22 w-22 rounded-full border-4 border-slate-100 border-t-indigo-600 border-r-purple-500 animate-spin-fast shadow-md shadow-indigo-500/10 pointer-events-none" />

        {/* Center Solid Icon Badge with Orbiting Indicator */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
          <BrainCircuit className="h-7 w-7 animate-pulse" />
          {/* Orbiting glowing dot */}
          <div className="absolute -inset-1 rounded-2xl border border-cyan-400/40 animate-spin-fast pointer-events-none">
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </div>
        </div>

        {/* Small floating sparkles icon */}
        <div
          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-900 shadow-md animate-bounce"
          style={{ animationDuration: "2.4s" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-950" />
        </div>
      </div>

      {/* Main Status Text */}
      <h3 className="text-base font-black text-slate-900 dark:text-white">
        {title}
      </h3>

      {/* File Name Pill */}
      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50/90 px-3.5 py-1 border border-indigo-200/80 text-xs font-semibold text-indigo-700 max-w-[340px] truncate shadow-xs">
        <FileCode className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
        <span className="truncate">{fileName}</span>
        <span className="rounded-full bg-indigo-200/70 px-1.5 py-0.2 text-[10px] font-bold text-indigo-800 shrink-0">
          11 Core Fields
        </span>
      </div>

      {/* Live Spinning Indicator & Elapsed Time */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 font-medium">
        <Loader2 className="h-4 w-4 animate-spin-fast text-indigo-600 shrink-0" />
        <span className="font-semibold text-slate-700">
          {REASONING_STEPS[stepIndex].title}
        </span>
        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
          {seconds}s
        </span>
      </div>

      {/* Smooth Shimmer Progress Bar */}
      <div className="mt-3.5 w-64 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-400 animate-shimmer" />
      </div>

      {/* 4 Steps Progression Chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-lg">
        {REASONING_STEPS.map((step, idx) => {
          const isActive = idx === stepIndex;
          const isPassed = idx < stepIndex;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 border ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-xs shadow-indigo-500/20 scale-105"
                  : isPassed
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-slate-50 text-slate-400 border-slate-200/80"
              }`}
            >
              {isPassed ? (
                <Check className="h-3 w-3 text-indigo-600" />
              ) : isActive ? (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-ping" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              )}
              <span>{step.short}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom Subtitle / Technology Pill */}
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100/80 px-3.5 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-200/60 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        <Cpu className="h-3.5 w-3.5 text-indigo-600" />
        <span>Qwen2.5-1.5B Instruct · NVIDIA CUDA GPU Accelerated (Port 8001)</span>
      </div>
    </div>
  );
}
