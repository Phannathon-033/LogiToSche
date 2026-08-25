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
  document_no: string;
  document_date: string;
  party_name: string;
  source_file: string;
  quantity: number;
  total_amount: number;
  other: Record<string, unknown>;
}

export interface ExtractedField {
  id: number;
  sourceText: string;
  field: string;
  value: string;
  confidence: number;
  status: FieldStatus;
  isOther?: boolean;
}

export interface ConfidenceScore {
  label: string;
  value: number;
  tone: "blue" | "green";
}

export interface ReviewItem {
  id: string;
  field: string;
  ocrValue: string;
  slmValue: string;
  confidence: number;
  status: "review" | "resolved";
  isOther?: boolean;
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
