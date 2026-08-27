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

export const CORE_FIELDS_DEF = [
  { key: "party_name", label: "party_name (ชื่อคู่ค้า / ผู้ซื้อ / ผู้รับ / ผู้ขาย)" },
  { key: "document_no", label: "document_no (เลขที่เอกสาร / ใบกำกับภาษี)" },
  { key: "document_date", label: "document_date (วันที่ในเอกสาร)" },
  { key: "total_amount", label: "total_amount (ยอดเงินรวมสุทธิ)" },
  { key: "quantity", label: "quantity (จำนวนรวม)" },
  { key: "document_type", label: "document_type (ประเภทเอกสาร)" },
  { key: "source_file", label: "source_file (ชื่อไฟล์ต้นฉบับ)" },
] as const;

export const CORE_FIELDS_SET = new Set<string>(CORE_FIELDS_DEF.map((c) => c.key));

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
  id: string | number;
  fileName: string;
  type?: string | DocumentType;
  documentType?: DocumentType;
  startedAt?: string;
  uploadedAt?: string;
  status: "success" | "processing" | "review" | "error";
  statusLabel: string;
  result: string;
}

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

export type NavItem = MenuItem;

export interface SlmPromptPreset {
  id: string;
  category: "synonym" | "summary" | "validation" | "translation" | "custom";
  categoryLabel: string;
  title: string;
  description: string;
  prompt: string;
  badge: string;
}

export interface SlmPromptRequest {
  promptTemplateId: string;
  userInstruction: string;
  ocrText?: string;
  jsonSchema?: JsonSchemaOutput;
}

export interface SlmPromptResponse {
  resultText: string;
  reasoning?: string;
  category?: string;
  model?: string;
  device?: string;
}

export interface SlmFieldAccuracy {
  accuracy_pct: number;
  status: "perfect" | "high" | "review" | "missing";
  reasoning: string;
}

export interface SlmPerformanceMetrics {
  accuracy_pct: number;
  inference_time_sec: number;
  tokens_generated: number;
  token_speed_tps: number;
  core_fields_fill_rate_pct: number;
  schema_valid: boolean;
  math_integrity_status: "verified" | "discrepancy" | "no_subtotal";
  math_integrity_notes?: string;
  field_accuracies: Record<string, SlmFieldAccuracy>;
  model: string;
  device: string;
}

export type BatchFileStatus =
  | "queued"
  | "ocr_processing"
  | "ocr_completed"
  | "slm_processing"
  | "completed"
  | "error";

export interface BatchDocumentItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  previewUrl: string | null;
  status: BatchFileStatus;
  statusLabel: string;
  ocrProgress: number;
  ocrText: string;
  ocrLines: any[];
  jsonOutput: JsonSchemaOutput | null;
  fields: ExtractedField[];
  confidenceScores: ConfidenceScore[];
  overallConfidence: number;
  performance: SlmPerformanceMetrics | null;
  reviewItems: ReviewItem[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}
