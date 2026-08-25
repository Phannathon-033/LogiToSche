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
