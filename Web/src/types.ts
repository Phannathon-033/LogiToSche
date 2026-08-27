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
  document_number: string;
  document_date: string;
  sender: string;
  receiver: string;
  origin: string;
  destination: string;
  reference_number: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  // Legacy aliases
  document_no?: string;
  party_name?: string;
  source_file?: string;
  quantity?: number;
  other?: Record<string, any>;
}

export const CORE_FIELDS_DEF = [
  { key: "document_type", label: "document_type (ประเภทเอกสาร)" },
  { key: "document_number", label: "document_number (เลขที่เอกสาร)" },
  { key: "document_date", label: "document_date (วันที่เอกสาร)" },
  { key: "sender", label: "sender (ผู้ส่ง / ผู้ขาย)" },
  { key: "receiver", label: "receiver (ผู้รับ / ผู้ซื้อ)" },
  { key: "origin", label: "origin (ต้นทาง)" },
  { key: "destination", label: "destination (ปลายทาง)" },
  { key: "reference_number", label: "reference_number (เลขที่อ้างอิง)" },
  { key: "unit_price", label: "unit_price (ราคาต่อหน่วย)" },
  { key: "total_amount", label: "total_amount (มูลค่ารวม)" },
  { key: "currency", label: "currency (สกุลเงิน)" },
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
  spatialText?: string;
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
  cloudRecordId?: string;
  cloudSyncStatus?: "synced" | "uploading" | "failed" | "local_only";
  storageUrl?: string;
}
