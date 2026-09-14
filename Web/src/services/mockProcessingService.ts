import type { JsonSchemaOutput, ProcessingStep } from "../types";

export function createJsonDownload(json: JsonSchemaOutput): void {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${json.document_no || "logiai-output"}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function nextStepState(steps: ProcessingStep[], nextId: number): ProcessingStep[] {
  return steps.map((step) => {
    if (step.id < nextId) return { ...step, status: "completed" };
    if (step.id === nextId) return { ...step, status: "active" };
    return { ...step, status: "pending" };
  });
}
