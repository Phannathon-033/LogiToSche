import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  Cpu,
  Flame,
  Loader2,
  Sparkles,
  Terminal,
  Zap,
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
    title: "1. อ่านพิกัด 2D Spatial OCR และรูปภาพต้นฉบับ",
    detail: "ตรวจสอบตำแหน่งข้อความ [y, x] และคุณลักษณะภาพ (Header / Stamps)",
    icon: "🔍",
  },
  {
    id: 2,
    title: "2. Qwen2.5-1.5B SLM Multimodal Reasoning",
    detail: "วิเคราะห์จับคู่ 7 ฟิลด์หลัก (Document No, Date, Party, Total, Qty)",
    icon: "🧠",
  },
  {
    id: 3,
    title: "3. ตรวจสอบความสอดคล้องทางคณิตศาสตร์ (Math Integrity)",
    detail: "Cross-check: Subtotal + VAT = Grand Total Amount",
    icon: "⚡",
  },
  {
    id: 4,
    title: "4. สร้างโครงสร้าง JSON Schema และวิเคราะห์ 'other'",
    detail: "แปลงฟิลด์ทั้งหมดเป็น JSON Schema มาตรฐานพร้อมบันทึก Cloud",
    icon: "✨",
  },
];

const CODE_SNIPPETS = [
  '{\n  "document_type": "invoice",',
  '{\n  "document_type": "invoice",\n  "document_no": "INV-2026-088",',
  '{\n  "document_type": "invoice",\n  "document_no": "INV-2026-088",\n  "party_name": "PHILIP MORRIS COMPANIES, INC.",',
  '{\n  "document_type": "invoice",\n  "document_no": "INV-2026-088",\n  "party_name": "PHILIP MORRIS COMPANIES, INC.",\n  "total_amount": 1973.40,\n  "quantity": 1,\n  "other": { "sender_name": "BAKER & CALDWELL" }\n}',
];

export function SlmReasoningAnimation({
  title = "กำลังวิเคราะห์โครงสร้างข้อมูลด้วย Qwen SLM",
  fileName = "document",
}: SlmReasoningAnimationProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0.0);
  const [tokensCount, setTokensCount] = useState(38);
  const [snippetIndex, setSnippetIndex] = useState(0);
  

  // Live timer and step progression simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => Number((prev + 0.1).toFixed(1)));
    }, 100);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < 4 ? prev + 1 : 1));
      setSnippetIndex((prev) => (prev + 1) % CODE_SNIPPETS.length);
      setTokensCount((prev) => Math.min(prev + 35, 240));
    }, 1800);

    return () => {
      clearInterval(timer);
      clearInterval(stepInterval);
    };
  }, []);



  return (
    <div className="flex h-full min-h-[460px] flex-col overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-[#0B0F19] via-[#0F172A] to-[#0B0F19] p-5 font-sans text-white shadow-panel relative">
      {/* Background Animated Cyber Matrix Particles */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, #3b82f6 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Header with Live GPU Specs */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <BrainCircuit className="h-4 w-4 animate-pulse" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
            </span>
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wide text-cyan-300">
              QWEN2.5-1.5B INSTRUCT (CUDA ACCELERATED)
            </h3>
            <p className="text-[11px] text-slate-400">
              กำลังประมวลผลไฟล์: <b className="text-white font-mono">{fileName}</b>
            </p>
          </div>
        </div>

        {/* Live Performance Pill Badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-800/80 bg-indigo-950/60 px-2.5 py-1 text-[11px] font-bold text-indigo-300 font-mono">
            <Cpu className="h-3 w-3 text-cyan-400" />
            <span>CUDA:0 (RTX 3050)</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-800/80 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-300 font-mono">
            <Activity className="h-3 w-3 text-emerald-400 animate-spin" style={{ animationDuration: "3s" }} />
            <span>~930 TPS</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-800/80 bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 font-mono">
            <Flame className="h-3 w-3 text-amber-400 animate-bounce" />
            <span>{elapsedSeconds}s</span>
          </span>
        </div>
      </div>

      {/* Main Dual-Section: Left Neural Wave + Right Live Code Stream */}
      <div className="relative z-10 my-auto grid gap-5 py-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Step-by-Step AI Thinking Progression */}
        <div className="space-y-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-cyan-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              กระบวนการวิเคราะห์เชิงเหตุผล (AI Reasoning):
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              เฟส 2 / 2
            </span>
          </div>

          <div className="space-y-2">
            {REASONING_STEPS.map((step) => {
              const isDone = step.id < activeStep;
              const isCurrent = step.id === activeStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 rounded-xl border p-2.5 transition-all duration-300 ${
                    isCurrent
                      ? "border-cyan-500/60 bg-cyan-950/40 shadow-md shadow-cyan-900/20 ring-1 ring-cyan-500/30"
                      : isDone
                      ? "border-emerald-800/40 bg-emerald-950/20"
                      : "border-slate-800/60 bg-slate-900/30 opacity-40"
                  }`}
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-mono text-xs">
                    {isDone ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400 font-black" />
                    ) : isCurrent ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <span className="text-slate-500">{step.id}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-snug ${isCurrent ? "text-cyan-200" : isDone ? "text-emerald-300" : "text-slate-400"}`}>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400 leading-tight">
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Simulated Token Streaming Terminal */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#060913] p-3.5 font-mono text-xs shadow-inner">
          <div className="mb-2 flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-300">Live JSON Token Stream</span>
            </div>
            <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/50">
              {tokensCount} tokens
            </span>
          </div>

          {/* Typing code snippet */}
          <div className="relative min-h-[140px] overflow-hidden rounded-lg bg-slate-950/80 p-2.5 font-mono text-[11px] leading-relaxed text-emerald-400 border border-slate-900">
            <pre className="whitespace-pre font-medium">{CODE_SNIPPETS[snippetIndex]}</pre>
            <span className="inline-block h-3.5 w-2 animate-pulse bg-cyan-400 align-middle ml-1" />
          </div>

          {/* Hardware & Inference Status */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              กำลังรันโมเดล Qwen2.5 บน GPU
            </span>
            <span className="font-mono text-cyan-400 font-bold">FP16 CUDA:0</span>
          </div>
        </div>
      </div>

      {/* Bottom Tip Bar */}
      <div className="relative z-10 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-black text-blue-300">
            MULTIMODAL SLM
          </span>
          <span className="truncate">ผสานข้อความ OCR 2D Spatial + คุณลักษณะภาพจริง เพื่อผลลัพธ์ที่แม่นยำสูงสุด</span>
        </div>
        <span className="font-mono text-cyan-400 font-bold shrink-0">98.4% Confidence Rate</span>
      </div>
    </div>
  );
}
