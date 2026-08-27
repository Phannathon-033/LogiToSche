import type {
  ConfidenceScore,
  ExtractedField,
  FieldStatus,
  JsonSchemaOutput,
  ReviewItem,
  SlmPerformanceMetrics,
  SlmPromptRequest,
  SlmPromptResponse,
} from "../types";
import type { OcrLine } from "./ocrApi";

interface SlmExtractRequest {
  documentTypeHint: string;
  sourceFile?: string;
  ocrText: string;
  ocrLines: OcrLine[];
  imageFile?: File | Blob;
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

interface SlmApiField {
  sourceText: string;
  field: string;
  value: string;
  confidence: number;
  status: FieldStatus;
  isOther?: boolean;
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
  isOther?: boolean;
}

interface SlmApiResponse {
  json_schema: JsonSchemaOutput;
  fields: SlmApiField[];
  confidence: SlmApiConfidence;
  review_items: SlmApiReviewItem[];
  performance?: SlmPerformanceMetrics;
  model: string;
  device: string;
}

export interface SlmExtractionResult {
  jsonOutput: JsonSchemaOutput;
  fields: ExtractedField[];
  confidenceScores: ConfidenceScore[];
  overallConfidence: number;
  reviewItems: ReviewItem[];
  performance?: SlmPerformanceMetrics;
  model: string;
  device: string;
}

const ROOT_FIELDS = new Set<string>([
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
]);

export async function runSlmExtraction({
  documentTypeHint,
  sourceFile,
  ocrText,
  ocrLines,
  imageFile,
}: SlmExtractRequest): Promise<SlmExtractionResult> {
  let imageBase64: string | undefined;
  if (imageFile) {
    try {
      imageBase64 = await fileToBase64(imageFile);
    } catch (err) {
      console.warn("Could not encode image to base64 for SLM:", err);
    }
  }

  const response = await fetch("/api/slm/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_type_hint: documentTypeHint,
      source_file: sourceFile || "document",
      ocr_text: ocrText,
      ocr_lines: ocrLines,
      image_base64: imageBase64,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `SLM request failed with ${response.status}`);
  }

  const data = (await response.json()) as SlmApiResponse;
  return {
    jsonOutput: data.json_schema,
    fields: (data.fields || []).map((field, index) => ({
      id: index + 1,
      sourceText: field.sourceText,
      field: field.field,
      value: field.value,
      confidence: field.confidence,
      status: field.status,
      isOther: !ROOT_FIELDS.has(field.field),
    })),
    confidenceScores: [
      { label: "การอ่านข้อความ (OCR)", value: data.confidence.ocr, tone: "green" },
      { label: "การทำความเข้าใจ (SLM)", value: data.confidence.slm, tone: "blue" },
      { label: "การแมปฟิลด์หลัก 7 ฟิลด์", value: data.confidence.mapping, tone: "blue" },
      { label: "ความครบถ้วนข้อมูล & Other", value: data.confidence.completeness, tone: "blue" },
    ],
    overallConfidence: data.confidence.overall,
    reviewItems: (data.review_items || []).map((item) => ({
      id: item.field,
      field: item.field,
      ocrValue: item.ocrValue,
      slmValue: item.slmValue,
      confidence: item.confidence,
      status: item.status,
      isOther: !ROOT_FIELDS.has(item.field),
    })),
    performance: data.performance,
    model: data.model,
    device: data.device,
  };
}

export async function executeSlmPrompt({
  promptTemplateId,
  userInstruction,
  ocrText,
  jsonSchema,
}: SlmPromptRequest): Promise<SlmPromptResponse> {
  const response = await fetch("/api/slm/execute-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt_template_id: promptTemplateId,
      user_instruction: userInstruction,
      ocr_text: ocrText || "",
      json_schema: jsonSchema || {},
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `SLM prompt execution failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    result_text: string;
    reasoning?: string;
    category?: string;
    model?: string;
    device?: string;
  };

  return {
    resultText: data.result_text,
    reasoning: data.reasoning,
    category: data.category,
    model: data.model,
    device: data.device,
  };
}
