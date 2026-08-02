import { Check, Loader2, TriangleAlert, X } from "lucide-react";
import type { FieldStatus } from "../types";

interface StatusBadgeProps {
  status: FieldStatus;
  label?: string;
}

const styleByStatus: Record<FieldStatus, string> = {
  success: "bg-green-50 text-success",
  review: "bg-amber-50 text-warning",
  error: "bg-red-50 text-error",
  processing: "bg-blue-50 text-primary",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const Icon = status === "success" ? Check : status === "review" ? TriangleAlert : status === "error" ? X : Loader2;
  const text =
    label ?? (status === "success" ? "สำเร็จ" : status === "review" ? "ตรวจสอบ" : status === "error" ? "ผิดพลาด" : "กำลังประมวลผล");

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold ${styleByStatus[status]}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "processing" ? "animate-spin" : ""}`} aria-hidden="true" />
      {text}
    </span>
  );
}
