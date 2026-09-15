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
  other?: Record<string, unknown>;

  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  document_no?: string;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  party_name?: string;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  source_file?: string;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  invoice_no?: string;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  receiver_name?: string;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  truck_plate?: string;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  gross_weight_kg?: number;
  /** @deprecated Read legacy records only; new output uses canonical fields and other. */
  quantity?: number;
}

export const EMPTY_JSON_SCHEMA: JsonSchemaOutput = {
  document_type: "",
  document_number: "",
  document_date: "",
  sender: "",
  receiver: "",
  origin: "",
  destination: "",
  reference_number: "",
  unit_price: 0,
  total_amount: 0,
  currency: "",
  other: {},
};

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

export const CORE_FIELDS_SET = new Set<string>(CORE_FIELDS_DEF.map((field) => field.key));

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
  prompt?: string;
  badge: string;
}

export interface SlmPromptRequest {
  promptTemplateId: string;
  userInstruction?: string;
  ocrText?: string;
  jsonSchema?: JsonSchemaOutput;
}

export interface SlmPromptConfig {
  confidenceThreshold: number;
  selectedModel: string;
  systemPrompt: string;
  fallbackRules: string[];
  monitoredFields: Array<keyof JsonSchemaOutput>;
}

export interface SlmPromptPresetResponse extends SlmPromptPreset {
  prompt: string;
}

export type SlmPromptConfigResponse = SlmPromptConfig;

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

export type BatchFileStatus = "queued" | "ocr_processing" | "ocr_completed" | "slm_processing" | "completed" | "error";

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
  ocrLines: import("./services/ocrApi").OcrLine[];
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

export interface AdminActor {
  name: string;
  role: "Admin" | "User";
  avatar: string;
}

export interface AdminCorrectionEntry {
  id: string;
  field: keyof JsonSchemaOutput;
  previousValue: string;
  nextValue: string;
  reason: string;
  correctedBy: string;
  correctedAt: string;
}

export interface AdminPromptSignal {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface AdminDocumentMetrics {
  ocrTime: string;
  slmTime: string;
  totalTime: string;
  device: string;
  ocrEngine: string;
  slmModel: string;
}

export interface AdminOcrLine {
  id: string;
  text: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface AdminDocumentRecord {
  id: string;
  fileName: string;
  type: DocumentType;
  uploadedBy: AdminActor;
  date: string;
  status: FieldStatus;
  statusLabel: string;
  result: string;
  overallConfidence: number;
  queueReasons: string[];
  missingFields: Array<keyof JsonSchemaOutput>;
  conflictingFields: Array<keyof JsonSchemaOutput>;
  errorTags: string[];
  reviewNotes: string[];
  ocrText: string;
  jsonOutput: JsonSchemaOutput;
  extractedFields: ExtractedField[];
  reviewItems: ReviewItem[];
  correctionHistory: AdminCorrectionEntry[];
  promptSignals: AdminPromptSignal[];
  metrics: AdminDocumentMetrics;
  ocrLines: AdminOcrLine[];
}

export interface AdminAnalyticsPoint {
  label: string;
  value: number;
  hint: string;
}

export interface AdminErrorCluster {
  id: string;
  title: string;
  count: number;
  documents: number;
  recommendation: string;
}

export interface AdminPromptLabState {
  confidenceThreshold: number;
  selectedModel: string;
  systemPrompt: string;
  fallbackRules: string[];
  monitoredFields: Array<keyof JsonSchemaOutput>;
  fewShotExamples: AdminFewShotExample[];
}

export interface AdminFewShotExample {
  id: string;
  title: string;
  input: string;
  expectedOutput: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: "User" | "Admin";
  registeredAt: string;
}
