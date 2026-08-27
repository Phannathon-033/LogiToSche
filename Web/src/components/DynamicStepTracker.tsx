import {
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { BatchDocumentItem } from "../types";

interface DynamicStepTrackerProps {
  activeDoc: BatchDocumentItem | null;
  isProcessing?: boolean;
}

export function DynamicStepTracker({ activeDoc, isProcessing = false }: DynamicStepTrackerProps) {
  if (!activeDoc) return null;

  const status = activeDoc.status;
  const ocrLines = activeDoc.ocrLines || [];
  const hasJson = Boolean(activeDoc.jsonOutput);

  // Derive step lifecycle states
  const step1State = "completed"; // Upload is always done once doc is in workspace

  let step2State: "completed" | "active" | "upcoming" = "upcoming";
  if (status === "ocr_processing") {
    step2State = "active";
  } else if (ocrLines.length > 0 || status === "ocr_completed" || status === "slm_processing" || status === "completed") {
    step2State = "completed";
  }

  let step3State: "completed" | "active" | "upcoming" = "upcoming";
  if (status === "slm_processing") {
    step3State = "active";
  } else if (hasJson && status === "completed") {
    step3State = "completed";
  }

  let step4State: "completed" | "active" | "upcoming" = "upcoming";
  if (hasJson && status === "completed") {
    step4State = "completed";
  } else if (step3State === "active") {
    step4State = "upcoming";
  }

  const steps = [
    {
      id: 1,
      num: "1",
      title: "Upload",
      subtitle: "อัปโหลดเอกสาร",
      state: step1State,
      statusLabel: "เสร็จสิ้น",
    },
    {
      id: 2,
      num: "2",
      title: "OCR",
      subtitle: "ดึงข้อความ (GPU)",
      state: step2State,
      statusLabel: step2State === "active" ? "กำลังสแกน..." : step2State === "completed" ? "เสร็จสิ้น" : "รอคิว",
    },
    {
      id: 3,
      num: "3",
      title: "AI Reasoning",
      subtitle: "วิเคราะห์ Qwen SLM",
      state: step3State,
      statusLabel: step3State === "active" ? "กำลังวิเคราะห์..." : step3State === "completed" ? "เสร็จสิ้น" : "รอคิว",
    },
    {
      id: 4,
      num: "4",
      title: "JSON Output",
      subtitle: "ส่งออก JSON Schema",
      state: step4State,
      statusLabel: step4State === "completed" ? "พร้อมใช้งาน" : "รอคิว",
    },
  ];

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:px-8 sm:py-5 shadow-panel"
      aria-label="ขั้นตอนการประมวลผล (Live Pipeline Step Tracker)"
    >
      <div className="relative flex items-center justify-between">
        {/* Connected Line Background */}
        <div className="pointer-events-none absolute left-6 right-6 top-5 -translate-y-1/2 sm:left-10 sm:right-10">
          <div className="h-0.5 w-full bg-slate-200" />
        </div>

        {/* Dynamic Connected Progress Line */}
        <div className="pointer-events-none absolute left-6 right-6 top-5 -translate-y-1/2 sm:left-10 sm:right-10">
          <div
            className="h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{
              width:
                step4State === "completed"
                  ? "100%"
                  : step3State === "active" || step3State === "completed"
                  ? "66%"
                  : step2State === "active" || step2State === "completed"
                  ? "33%"
                  : "0%",
            }}
          />
        </div>

        {/* 4 Step Circular Nodes */}
        {steps.map((step, idx) => {
          const isDone = step.state === "completed";
          const isActive = step.state === "active";

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center text-center group cursor-default"
            >
              {/* Circular Number Node */}
              <div
                className={`grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full font-black text-sm transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100"
                    : isActive
                    ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-100 scale-110 animate-pulse"
                    : "border-2 border-slate-300 bg-white text-slate-400"
                }`}
              >
                {isDone ? (
                  <Check className="h-5 w-5 stroke-[3]" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span>{step.num}</span>
                )}
              </div>

              {/* Step Labels Below */}
              <div className="mt-2.5 flex flex-col items-center space-y-0.5">
                <p
                  className={`text-xs font-black tracking-tight ${
                    isActive
                      ? "text-blue-600 font-extrabold"
                      : isDone
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                  {step.subtitle}
                </p>

                {/* Status Pill */}
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-black border transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                      : isDone
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  {step.statusLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
