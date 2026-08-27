import {
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Code2,
  FileCode,
  Loader2,
  Scan,
  ScanText,
  UploadCloud,
  Zap,
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
      name: "1. Upload",
      thLabel: "อัปโหลดเอกสาร",
      desc: "นำเข้าไฟล์ PDF / JPG / PNG",
      icon: UploadCloud,
      state: step1State,
      activeColor: "border-blue-500 bg-blue-500 text-white",
      completedColor: "border-emerald-500 bg-emerald-500 text-white",
      badgeText: "เสร็จสิ้น",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      id: 2,
      name: "2. OCR",
      thLabel: "ดึงข้อความจากเอกสาร",
      desc: "PaddleOCR v5 (CUDA GPU)",
      icon: Scan,
      state: step2State,
      activeColor: "border-blue-600 bg-blue-600 text-white shadow-lg ring-4 ring-blue-100",
      completedColor: "border-emerald-500 bg-emerald-500 text-white",
      badgeText: step2State === "active" ? "กำลังสแกน GPU..." : step2State === "completed" ? "เสร็จสิ้น" : "รอดำเนินการ",
      badgeClass:
        step2State === "active"
          ? "bg-blue-100 text-blue-800 border-blue-300 animate-pulse font-extrabold"
          : step2State === "completed"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-slate-100 text-slate-500 border-slate-200",
    },
    {
      id: 3,
      name: "3. AI Reasoning",
      thLabel: "วิเคราะห์และจัดโครงสร้าง",
      desc: "Qwen2.5-1.5B Multimodal",
      icon: BrainCircuit,
      state: step3State,
      activeColor: "border-purple-600 bg-purple-600 text-white shadow-lg ring-4 ring-purple-100",
      completedColor: "border-purple-600 bg-purple-600 text-white",
      badgeText: step3State === "active" ? "กำลังประมวลผล SLM..." : step3State === "completed" ? "เสร็จสิ้น" : "รอดำเนินการ",
      badgeClass:
        step3State === "active"
          ? "bg-purple-100 text-purple-800 border-purple-300 animate-pulse font-extrabold"
          : step3State === "completed"
          ? "bg-purple-100 text-purple-800 border-purple-200"
          : "bg-slate-100 text-slate-500 border-slate-200",
    },
    {
      id: 4,
      name: "4. JSON Output",
      thLabel: "ส่งออกเป็น JSON Schema",
      desc: "7 Core Fields + Other",
      icon: Code2,
      state: step4State,
      activeColor: "border-emerald-600 bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-100",
      completedColor: "border-emerald-600 bg-emerald-600 text-white",
      badgeText: step4State === "completed" ? "พร้อมใช้งาน (Ready)" : "รอดำเนินการ",
      badgeClass:
        step4State === "completed"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold"
          : "bg-slate-100 text-slate-500 border-slate-200",
    },
  ];

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-panel"
      aria-label="แถบติดตามขั้นตอนการทำงาน (Workflow Step Tracker)"
    >
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            สถานะขั้นตอนการประมวลผล (Live Pipeline Step)
          </h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500">
          เอกสาร: <b className="text-slate-900">{activeDoc.fileName}</b>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = step.state === "completed";
          const isActive = step.state === "active";

          return (
            <div
              key={step.id}
              className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                isActive
                  ? "border-blue-400 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 shadow-md ring-2 ring-blue-500/20 scale-[1.02]"
                  : isDone
                  ? "border-emerald-200/90 bg-emerald-50/30"
                  : "border-slate-200 bg-slate-50/50 opacity-65"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold transition ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : isActive
                      ? "bg-blue-600 text-white shadow-md animate-pulse"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>

                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${step.badgeClass}`}
                >
                  {step.badgeText}
                </span>
              </div>

              <div className="mt-3 space-y-0.5">
                <p
                  className={`text-xs font-black ${
                    isActive
                      ? "text-blue-950"
                      : isDone
                      ? "text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  {step.name}
                </p>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  {step.thLabel}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
