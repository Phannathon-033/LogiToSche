import {
  Check,
  Loader2,
} from "lucide-react";
import type { BatchDocumentItem } from "../types";

interface DynamicStepTrackerProps {
  activeDoc: BatchDocumentItem | null;
  isProcessing?: boolean;
}

export function DynamicStepTracker({ activeDoc }: DynamicStepTrackerProps) {
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
      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 sm:px-6 sm:py-3 shadow-panel"
      aria-label="ขั้นตอนการประมวลผล (Live Pipeline Step Tracker)"
    >
      <div className="relative flex items-center justify-between">
        {/* Connected Line Background */}
        <div className="pointer-events-none absolute left-6 right-6 top-4 -translate-y-1/2 sm:left-10 sm:right-10">
          <div className="h-0.5 w-full bg-slate-200" />
        </div>

        {/* Dynamic Connected Progress Line */}
        <div className="pointer-events-none absolute left-6 right-6 top-4 -translate-y-1/2 sm:left-10 sm:right-10">
          <div
            className="h-0.5 bg-blue-600 transition-all duration-500 ease-out"
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
        {steps.map((step) => {
          const isDone = step.state === "completed";
          const isActive = step.state === "active";

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center text-center group cursor-default"
            >
              {/* Circular Number Node */}
              <div
                className={`grid h-8 w-8 sm:h-8.5 sm:w-8.5 place-items-center rounded-full font-semibold text-xs transition-all duration-200 ${
                  isDone
                    ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-100"
                    : isActive
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-100 scale-105"
                    : "border border-slate-300 bg-white text-slate-400"
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4 stroke-[2.5]" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{step.num}</span>
                )}
              </div>

              {/* Step Labels Below */}
              <div className="mt-1 flex flex-col items-center space-y-0.5">
                <p
                  className={`text-xs font-semibold ${
                    isActive
                      ? "text-blue-600"
                      : isDone
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[11px] font-normal text-slate-500 hidden sm:block">
                  {step.subtitle}
                </p>

                {/* Status Pill */}
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium border transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-blue-200"
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
