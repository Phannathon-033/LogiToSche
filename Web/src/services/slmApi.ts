import type { ConfidenceScore, ExtractedField, FieldStatus, JsonSchemaOutput, ReviewItem } from "../types";
import type { OcrLine } from "./ocrApi";

interface SlmExtractRequest {
  documentTypeHint: string;
  ocrText: string;
  ocrLines: OcrLine[];
}

interface SlmApiField {
  sourceText: string;
  field: string;
  value: string;
  confidence: number;
  status: FieldStatus;
}

interface SlmApiConfidence {
  overall: number;
  ocr: number;
  slm: number;
  mapping: number;
  completeness: number;
}

interface SlmApiReviewItem {
  field: string;
  ocrValue: string;
  slmValue: string;
  confidence: number;
  status: "review" | "resolved";
}

interface SlmApiResponse {
  json_schema: JsonSchemaOutput;
  fields: SlmApiField[];
  confidence: SlmApiConfidence;
  review_items: SlmApiReviewItem[];
  model: string;
  device: string;
}

export interface SlmExtractionResult {
  jsonOutput: JsonSchemaOutput;
  fields: ExtractedField[];
  confidenceScores: ConfidenceScore[];
  overallConfidence: number;
  reviewItems: ReviewItem[];
  model: string;
  device: string;
}

const jsonFieldNames = new Set<keyof JsonSchemaOutput>([
  "document_type",
  "invoice_no",
  "document_date",
  "receiver_name",
  "truck_plate",
  "gross_weight_kg",
  "quantity",
  "total_amount",
  "other",
]);

export async function runSlmExtraction({ documentTypeHint, ocrText, ocrLines }: SlmExtractRequest): Promise<SlmExtractionResult> {
  const response = await fetch("/api/slm/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_type_hint: documentTypeHint,
      ocr_text: ocrText,
      ocr_lines: ocrLines,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `SLM request failed with ${response.status}`);
  }

  const data = (await response.json()) as SlmApiResponse;
  return {
    jsonOutput: data.json_schema,
    fields: data.fields
      .filter((field) => jsonFieldNames.has(field.field as keyof JsonSchemaOutput))
      .map((field, index) => ({
        id: index + 1,
        sourceText: field.sourceText,
        field: field.field as keyof JsonSchemaOutput,
        value: field.value,
        confidence: field.confidence,
        status: field.status,
      })),
    confidenceScores: [
      { label: "การอ่านข้อความ (OCR)", value: data.confidence.ocr, tone: "green" },
      { label: "การทำความเข้าใจ (SLM)", value: data.confidence.slm, tone: "blue" },
      { label: "การแมปฟิลด์", value: data.confidence.mapping, tone: "blue" },
      { label: "ความครบถ้วนของข้อมูล", value: data.confidence.completeness, tone: "blue" },
    ],
    overallConfidence: data.confidence.overall,
    reviewItems: data.review_items
      .filter((item) => jsonFieldNames.has(item.field as keyof JsonSchemaOutput))
      .map((item) => ({
        id: item.field,
        field: item.field as keyof JsonSchemaOutput,
        ocrValue: item.ocrValue,
        slmValue: item.slmValue,
        confidence: item.confidence,
        status: item.status,
      })),
    model: data.model,
    device: data.device,
  };
}
