import type { LucideIcon } from "lucide-react";

export type StepStatus = "pending" | "active" | "completed" | "error";
export type DocumentType = "Invoice" | "Bill of Lading" | "Packing List" | "Purchase Order";
export type FieldStatus = "success" | "review" | "error" | "processing";

export interface ProcessingStep {
  id: number;
  label: string;
  status: StepStatus;
}

export interface JsonSchemaOutput {
  document_type: string;
  invoice_no: string;
  document_date: string;
  receiver_name: string;
  truck_plate: string;
  gross_weight_kg: number;
  quantity: number;
  total_amount: number;
  other: Record<string, unknown>;
}

export interface ExtractedField {
  id: number;
  sourceText: string;
  field: keyof JsonSchemaOutput;
  value: string;
  confidence: number;
  status: FieldStatus;
}

export interface ConfidenceScore {
  label: string;
  value: number;
  tone: "blue" | "green";
}

export interface ReviewItem {
  id: string;
  field: keyof JsonSchemaOutput;
  ocrValue: string;
  slmValue: string;
  confidence: number;
  status: "review" | "resolved";
}

export interface DocumentJob {
  id: string;
  fileName: string;
  type: DocumentType;
  status: FieldStatus;
  statusLabel: string;
  startedAt: string;
  result: string;
}

export interface MenuItem {
  label: string;
  icon: LucideIcon;
}
