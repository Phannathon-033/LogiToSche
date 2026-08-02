import {
  BarChart3,
  Braces,
  ClipboardCheck,
  Clock3,
  Cog,
  Cpu,
  Upload,
} from "lucide-react";
import type {
  ConfidenceScore,
  DocumentJob,
  DocumentType,
  ExtractedField,
  JsonSchemaOutput,
  MenuItem,
  ProcessingStep,
  ReviewItem,
} from "../types";

export const menuItems: MenuItem[] = [
  { label: "แดชบอร์ด", icon: BarChart3 },
  { label: "อัปโหลดเอกสาร", icon: Upload },
  { label: "ประมวลผล", icon: Cpu },
  { label: "ตรวจสอบผล", icon: ClipboardCheck },
  { label: "ประวัติการแปลง", icon: Clock3 },
  { label: "JSON Schema", icon: Braces },
  { label: "ตั้งค่า", icon: Cog },
];

export const initialSteps: ProcessingStep[] = [
  { id: 1, label: "รับเอกสาร", status: "completed" },
  { id: 2, label: "OCR", status: "active" },
  { id: 3, label: "SLM วิเคราะห์", status: "pending" },
  { id: 4, label: "ตรวจสอบข้อมูล", status: "pending" },
  { id: 5, label: "Manual Review", status: "pending" },
  { id: 6, label: "Output JSON", status: "pending" },
];

export const documentTypes: DocumentType[] = ["Invoice", "Bill of Lading", "Packing List", "Purchase Order"];

export const ocrText = `INVOICE
ABC Logistics Co., Ltd.
88/9 Moo 4, Bangna-Trad Rd.
Bang Phli, Samut Prakan 10540
Thailand
Tel: +66 2 123 4567

Invoice No.      INV-2024-001
Invoice Date    15/05/2024
Due Date        30/05/2024

Bill To:
XYZ Importer Co., Ltd.
99/1 Sukhumvit Rd.
Klongtoey, Bangkok 10110
Thailand

Ship To:
XYZ Warehouse
700/2 Amata City Chonburi
Mueang Chonburi, Chonburi 20000
Thailand

Description       Quantity    Unit Price    Amount (THB)
Logistics Service 120         406.25        48,750.00
Subtotal                                  48,750.00
VAT 7%                                     3,412.50
Total Amount                              52,162.50`;

export const initialJson: JsonSchemaOutput = {
  document_type: "invoice",
  invoice_no: "INV-2024-001",
  document_date: "2024-05-15",
  receiver_name: "ABC Logistics Co., Ltd.",
  truck_plate: "70-1234",
  gross_weight_kg: 25000,
  quantity: 120,
  total_amount: 48750,
  other: {},
};

export const initialFields: ExtractedField[] = [
  { id: 1, sourceText: "INV-2024-001", field: "invoice_no", value: "INV-2024-001", confidence: 98, status: "success" },
  { id: 2, sourceText: "15/05/2024", field: "document_date", value: "2024-05-15", confidence: 97, status: "success" },
  {
    id: 3,
    sourceText: "ABC Logistics Co., Ltd.",
    field: "receiver_name",
    value: "ABC Logistics Co., Ltd.",
    confidence: 96,
    status: "success",
  },
  { id: 4, sourceText: "70-1234", field: "truck_plate", value: "70-1234", confidence: 78, status: "review" },
  { id: 5, sourceText: "25,000 KG", field: "gross_weight_kg", value: "25000", confidence: 85, status: "review" },
  { id: 6, sourceText: "120", field: "quantity", value: "120", confidence: 96, status: "success" },
];

export const confidenceScores: ConfidenceScore[] = [
  { label: "การอ่านข้อความ (OCR)", value: 95, tone: "green" },
  { label: "การทำความเข้าใจ (SLM)", value: 90, tone: "blue" },
  { label: "การแมปฟิลด์", value: 91, tone: "blue" },
  { label: "ความครบถ้วนข้อมูล", value: 89, tone: "blue" },
];

export const initialReviewItems: ReviewItem[] = [
  { id: "truck_plate", field: "truck_plate", ocrValue: "70-123A", slmValue: "70-1234", confidence: 78, status: "review" },
  {
    id: "gross_weight_kg",
    field: "gross_weight_kg",
    ocrValue: "25,000 KG",
    slmValue: "25000",
    confidence: 85,
    status: "review",
  },
  { id: "total_amount", field: "total_amount", ocrValue: "52,162.50", slmValue: "48750", confidence: 82, status: "review" },
];

export const recentJobs: DocumentJob[] = [
  {
    id: "job-1",
    fileName: "Invoice_INV-2024-001.pdf",
    type: "Invoice",
    status: "processing",
    statusLabel: "กำลังประมวลผล OCR",
    startedAt: "10:24",
    result: "-",
  },
  {
    id: "job-2",
    fileName: "BOL_BL-2024-078.jpg",
    type: "Bill of Lading",
    status: "success",
    statusLabel: "เสร็จสมบูรณ์",
    startedAt: "09:48",
    result: "98%",
  },
  {
    id: "job-3",
    fileName: "PL_PL-2024-056.pdf",
    type: "Packing List",
    status: "success",
    statusLabel: "เสร็จสมบูรณ์",
    startedAt: "09:15",
    result: "91%",
  },
  {
    id: "job-4",
    fileName: "PO_PO-2024-033.pdf",
    type: "Purchase Order",
    status: "success",
    statusLabel: "เสร็จสมบูรณ์",
    startedAt: "เมื่อวาน 16:42",
    result: "93%",
  },
  {
    id: "job-5",
    fileName: "Invoice_INV-2024-000.pdf",
    type: "Invoice",
    status: "success",
    statusLabel: "เสร็จสมบูรณ์",
    startedAt: "เมื่อวาน 15:21",
    result: "95%",
  },
];
