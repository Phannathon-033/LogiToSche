import { Check } from "lucide-react";
import type { ProcessingStep } from "../types";

interface WorkflowStepperProps {
  steps: ProcessingStep[];
  onStepClick: (id: number) => void;
}

export function WorkflowStepper({ steps, onStepClick }: WorkflowStepperProps) {
  return (
    <section className="overflow-x-auto rounded-lg bg-white px-8 py-3 shadow-panel" aria-label="ขั้นตอนประมวลผล">
      <ol className="flex min-w-[1040px] items-start justify-between">
        {steps.map((step, index) => {
          const completed = step.status === "completed";
          const active = step.status === "active";
          const error = step.status === "error";
          return (
            <li key={step.id} className="relative flex min-w-[150px] flex-1 flex-col items-center gap-2">
              {index < steps.length - 1 ? (
                <span className={`absolute left-1/2 top-5 h-px w-full ${completed ? "bg-primary" : "bg-slate-300"}`} />
              ) : null}
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 text-base font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  completed
                    ? "border-primary bg-primary text-white"
                    : active
                      ? "border-primary bg-primary text-white shadow-[0_0_0_5px_rgba(37,99,235,0.12)]"
                      : error
                        ? "border-error bg-error text-white"
                        : "border-slate-300 bg-white text-navy"
                }`}
                aria-label={`ขั้นตอน ${step.id}: ${step.label}`}
              >
                {completed ? <Check className="h-6 w-6" aria-hidden="true" /> : step.id}
              </button>
              <span className={`relative z-10 text-center text-sm font-bold ${active || completed ? "text-primary" : "text-navy"}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
