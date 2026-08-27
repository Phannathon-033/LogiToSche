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
