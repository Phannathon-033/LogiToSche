import type { OcrLine } from "./ocrApi";
import type {
  ConfidenceScore,
  ExtractedField,
  JsonSchemaOutput,
  ReviewItem,
  SlmPerformanceMetrics,
} from "../types";

export interface NormalizedDocumentPayload {
  document_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: string;
  file_hash: string;
  file_path: string;
  storage_url: string;
  processing_status: string;
  created_at: unknown;
  processed_at: unknown;
  page_count: number | null;
  updated_at: unknown;
}

export interface NormalizedOcrPayload {
  ocr_id: string;
  document_id: string;
  page_number: number;
  page_count: number | null;
  raw_text: string;
  spatial_text: string;
  lines: OcrLine[];
  engine: string;
  language: string;
  processed_at: unknown;
}

export interface NormalizedExtractedDataPayload {
  extracted_data_id: string;
  document_id: string;
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
  other: Record<string, unknown>;
  fields: ExtractedField[];
  confidence_scores: ConfidenceScore[];
  overall_confidence: number;
  performance: SlmPerformanceMetrics | null;
  review_items: ReviewItem[];
  extracted_at: unknown;
  updated_at: unknown;
}

export interface NormalizedCorrectionPayload {
  correction_id: string;
  document_id: string;
  user_id: string;
  field: string;
  previous_value: string;
  next_value: string;
  reason: string;
  corrected_by: string;
  corrected_at: unknown;
}

export interface CorrectionDiff {
  field: string;
  previousValue: string;
  nextValue: string;
}

const CORE_FIELDS: Array<keyof JsonSchemaOutput> = [
  "document_type",
  "document_number",
  "document_date",
  "sender",
  "receiver",
  "origin",
  "destination",
  "reference_number",
  "unit_price",
  "total_amount",
  "currency",
];

export function normalizedOcrId(documentId: string): string {
  return `${documentId}_ocr`;
}

export function schemaFieldValue(schema: JsonSchemaOutput, field: string): unknown {
  if (field in schema) return schema[field as keyof JsonSchemaOutput];
  return schema.other?.[field];
}

export function diffJsonSchema(previous: JsonSchemaOutput, next: JsonSchemaOutput): CorrectionDiff[] {
  const fields = new Set<string>([
    ...CORE_FIELDS,
    ...Object.keys(previous.other || {}),
    ...Object.keys(next.other || {}),
  ]);

  return [...fields]
    .map((field) => ({
      field,
      previousValue: String(schemaFieldValue(previous, field) ?? ""),
      nextValue: String(schemaFieldValue(next, field) ?? ""),
    }))
    .filter((diff) => diff.previousValue !== diff.nextValue);
}

export function buildNormalizedDocumentPayload(input: {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileHash?: string;
  storagePath?: string;
  storageUrl?: string;
  processingStatus?: string;
  createdAt: unknown;
  processedAt?: unknown;
  pageCount?: number | null;
  updatedAt: unknown;
}): NormalizedDocumentPayload {
  return {
    document_id: input.id,
    user_id: input.userId,
    file_name: input.fileName,
    file_type: input.fileType,
    file_size: input.fileSize,
    file_hash: input.fileHash || "",
    file_path: input.storagePath || "",
    storage_url: input.storageUrl || "",
    processing_status: input.processingStatus || "completed",
    created_at: input.createdAt,
    processed_at: input.processedAt || input.updatedAt,
    page_count: input.pageCount ?? null,
    updated_at: input.updatedAt,
  };
}

export function buildNormalizedOcrPayload(input: {
  documentId: string;
  rawText?: string;
  spatialText?: string;
  lines?: OcrLine[];
  pageCount?: number | null;
  engine?: string;
  language?: string;
  processedAt: unknown;
}): NormalizedOcrPayload {
  return {
    ocr_id: normalizedOcrId(input.documentId),
    document_id: input.documentId,
    page_number: 1,
    page_count: input.pageCount ?? null,
    raw_text: input.rawText || "",
    spatial_text: input.spatialText || "",
    lines: input.lines || [],
    engine: input.engine || "PaddleOCR",
    language: input.language || "unknown",
    processed_at: input.processedAt,
  };
}

export function buildNormalizedExtractedDataPayload(input: {
  documentId: string;
  schema: JsonSchemaOutput;
  fields: ExtractedField[];
  confidenceScores: ConfidenceScore[];
  overallConfidence: number;
  performance?: SlmPerformanceMetrics | null;
  reviewItems?: ReviewItem[];
  extractedAt: unknown;
  updatedAt: unknown;
}): NormalizedExtractedDataPayload {
  return {
    extracted_data_id: input.documentId,
    document_id: input.documentId,
    document_type: input.schema.document_type || "",
    document_number: input.schema.document_number || "",
    document_date: input.schema.document_date || "",
    sender: input.schema.sender || "",
    receiver: input.schema.receiver || "",
    origin: input.schema.origin || "",
    destination: input.schema.destination || "",
    reference_number: input.schema.reference_number || "",
    unit_price: Number(input.schema.unit_price) || 0,
    total_amount: Number(input.schema.total_amount) || 0,
    currency: input.schema.currency || "",
    other: input.schema.other || {},
    fields: input.fields,
    confidence_scores: input.confidenceScores,
    overall_confidence: input.overallConfidence,
    performance: input.performance || null,
    review_items: input.reviewItems || [],
    extracted_at: input.extractedAt,
    updated_at: input.updatedAt,
  };
}

export function buildNormalizedCorrectionPayload(input: {
  correctionId?: string;
  documentId: string;
  userId: string;
  field: string;
  previousValue: string;
  nextValue: string;
  reason: string;
  correctedBy: string;
  correctedAt: unknown;
}): NormalizedCorrectionPayload {
  return {
    correction_id: input.correctionId || `${input.documentId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    document_id: input.documentId,
    user_id: input.userId,
    field: input.field,
    previous_value: input.previousValue,
    next_value: input.nextValue,
    reason: input.reason,
    corrected_by: input.correctedBy,
    corrected_at: input.correctedAt,
  };
}
