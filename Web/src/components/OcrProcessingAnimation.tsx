import {
  BrainCircuit,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  Flame,
  Layers,
  Loader2,
  Scan,
  ScanText,
  Sparkles,
  Target,
  Terminal,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OcrProcessingAnimationProps {
  fileName?: string;
  isProcessing?: boolean;
}

export function OcrProcessingAnimation({
  fileName = "document.png",
  isProcessing = true,
}: OcrProcessingAnimationProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  
  const [streamLog, setStreamLog] = useState<string[]>([
    "[GPU:0] Initializing PaddleOCR v5 inference engine...",
    "[GPU:0] Loading PP-OCRv5_server_det model weights (CUDA Device 0)...",
    "[GPU:0] Image normalized: 1684 x 2381 px (300 DPI)",
  ]);

  const simulatedDetections = [
    '[GPU:0] DetBox [[120,80], [480,80], [480,120], [120,120]] -> "BILL OF LADING / INVOICE" (Conf: 0.99)',
    '[GPU:0] DetBox [[120,135], [360,135], [360,165], [120,165]] -> "Document No: BL240528-002" (Conf: 0.98)',
    '[GPU:0] DetBox [[120,175], [320,175], [320,200], [120,200]] -> "Date: 28 MAY 2024" (Conf: 0.97)',
    '[GPU:0] DetBox [[120,220], [490,220], [490,255], [120,255]] -> "Shipper: ABC Logistics Co., Ltd." (Conf: 0.96)',
    '[GPU:0] DetBox [[120,265], [480,265], [480,295], [120,295]] -> "Consignee: Global Trade Corp." (Conf: 0.98)',
    '[GPU:0] DetBox [[120,380], [520,380], [520,410], [120,410]] -> "Total Amount (USD): 12,500.00" (Conf: 0.99)',
    '[GPU:0] Spatial 2D Sorting: 24 text boxes mapped into Top/Middle/Bottom grid',
  ];

  // Timer simulation
  useEffect(() => {
    if (!isProcessing) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Progression of OCR stages
  useEffect(() => {
    if (!isProcessing) return;
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);
    return () => clearInterval(stepInterval);
  }, [isProcessing]);

  // Progressive streaming of OCR log
  useEffect(() => {
    if (!isProcessing) return;
    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < simulatedDetections.length) {
        const nextLine = simulatedDetections[logIdx];
        setStreamLog((prev) => [...prev.slice(-6), nextLine]);
        logIdx++;
      }
    }, 450);
    return () => clearInterval(logInterval);
  }, [isProcessing]);

  const steps = [
    {
      title: "1. Pre-processing & Normalization",
      desc: "ปรับคอนทราสต์ ลบสัญญาณรบกวน และปรับมุมเอียงอัตโนมัติ (Denoise & Deskew)",
      icon: Layers,
    },
    {
      title: "2. PP-OCRv5 Text Detection",
      desc: "สแกนหาตำแหน่ง Bounding Box ทุกจุดบน NVIDIA CUDA GPU",
      icon: Scan,
    },
    {
      title: "3. Dual-Language Recognition",
      desc: "อ่านตัวอักษรภาษาไทยและอังกฤษ พร้อมคำนวณค่า Confidence รายบรรทัด",
      icon: ScanText,
    },
    {
      title: "4. 2D Spatial Coordinate Mapping",
      desc: "จัดระเบียบโครงสร้าง 2 มิติ แยก Header, Body และ Footer อย่างแม่นยำ",
      icon: Target,
    },
  ];

  const seconds = (elapsedMs / 1000).toFixed(2);

  return (
    <div className="flex h-full min-h-[440px] flex-col justify-between overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/50 via-white to-slate-50 p-5 shadow-inner">
      {/* Top Banner: Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <Scan className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              กำลังสแกนข้อความด้วย PaddleOCR GPU
            </h3>
            <p className="text-xs font-semibold text-blue-600 truncate max-w-[240px]">
              {fileName} · เวลา: <span className="font-mono">{seconds}s</span>
            </p>
          </div>
        </div>

        
      </div>

      {/* Center Grid: Left Live Radar Scan Visual | Right 4 Pipeline Steps */}
      <div className="my-4 grid gap-4 md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr]">
        {/* Left: Laser Scanning Animation Surface */}
        <div className="relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-blue-300 bg-slate-900/95 p-3 shadow-inner">
          {/* Laser Sweeper Beam */}
          <div
            className="pointer-events-none absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce"
            style={{ animationDuration: "2s" }}
          />

          {/* Floating Bounding Box Boxes Simulation */}
          <div className="w-full space-y-2 opacity-80">
            <div className="h-4 w-3/4 rounded border border-cyan-400/80 bg-cyan-500/20 px-1 text-[9px] font-mono text-cyan-300 animate-pulse">
              [Header: 0.99]
            </div>
            <div className="h-4 w-5/6 rounded border border-blue-400/80 bg-blue-500/20 px-1 text-[9px] font-mono text-blue-300 animate-pulse" style={{ animationDelay: "200ms" }}>
              [DocNo: 0.98]
            </div>
            <div className="h-7 w-full rounded border border-purple-400/80 bg-purple-500/20 px-1 text-[9px] font-mono text-purple-300 animate-pulse" style={{ animationDelay: "400ms" }}>
              [Table Grid: 24 items]
            </div>
            <div className="h-4 w-2/3 rounded border border-emerald-400/80 bg-emerald-500/20 px-1 text-[9px] font-mono text-emerald-300 animate-pulse" style={{ animationDelay: "600ms" }}>
              [Total USD: 0.99]
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400">
            <ScanText className="h-3 w-3 animate-spin" />
            <span>PP-OCRv5 CUDA:0</span>
          </div>
        </div>

        {/* Right: 4-Step Checklist Progression */}
        <div className="flex flex-col justify-between space-y-2.5">
          {steps.map((step, idx) => {
            const isDone = activeStep > idx;
            const isCurrent = activeStep === idx;
            const StepIcon = step.icon;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-xl border p-2.5 transition-all ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50/60"
                    : isCurrent
                    ? "border-blue-300 bg-white shadow-sm ring-2 ring-blue-500/20 scale-[1.01]"
                    : "border-slate-200/70 bg-slate-50/50 opacity-60"
                }`}
              >
                <div
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : isCurrent
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs font-black ${
                        isDone
                          ? "text-emerald-900"
                          : isCurrent
                          ? "text-blue-900 font-extrabold"
                          : "text-slate-600"
                      }`}
                    >
                      {step.title}
                    </p>
                    {isDone && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-800">
                        เสร็จแล้ว
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-black text-blue-800 animate-pulse">
                        กำลังสแกน...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-tight text-slate-500">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Live Streaming OCR Terminal Log */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-2.5 font-mono text-[11px] text-emerald-400 shadow-inner">
        <div className="mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Terminal className="h-3 w-3 text-cyan-400" />
            <span>PaddleOCR GPU Detection Stream</span>
          </span>
          <span className="flex items-center gap-1 font-bold text-cyan-300">
            <Cpu className="h-3 w-3" />
            NVIDIA CUDA 8.6 · ~65 lines/s
          </span>
        </div>
        <div className="h-16 overflow-y-auto space-y-0.5 leading-snug">
          {streamLog.map((line, i) => (
            <div key={i} className="truncate text-emerald-300/90">
              {line}
            </div>
          ))}
          <div className="flex items-center gap-1 text-cyan-400">
            <span>&gt; Scanning bounding box coordinates</span>
            <span className="inline-block h-3 w-1.5 bg-cyan-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
