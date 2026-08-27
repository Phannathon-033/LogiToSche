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

export const ocrText = `BILL OF LADING
Shipper: Siam Global Logistics Co., Ltd.
88/9 Sukhumvit Rd, Bangkok 10110 Thailand
Consignee: Tokyo Freight Corp.
4-1-1 Marunouchi, Chiyoda-ku, Tokyo Japan

B/L No: BL-2024-88910
Date of Issue: 2024-08-25
Port of Loading: Bangkok Port, Thailand
Port of Discharge: Tokyo Port, Japan
PO Reference: PO-2024-9988
Description: Auto Spare Parts
Quantity: 200 Packages
Unit Price: USD 79.00
Total Amount: USD 15,800.00`;

export const initialJson: JsonSchemaOutput = {
  document_type: "bill_of_lading",
  document_number: "BL-2024-88910",
  document_date: "2024-08-25",
  sender: "Siam Global Logistics Co., Ltd.",
  receiver: "Tokyo Freight Corp.",
  origin: "Bangkok Port, Thailand",
  destination: "Tokyo Port, Japan",
  reference_number: "PO-2024-9988",
  unit_price: 79.0,
  total_amount: 15800.0,
  currency: "USD",
  document_no: "BL-2024-88910",
  party_name: "Siam Global Logistics Co., Ltd.",
  source_file: "bill_of_lading_sample.jpg",
  quantity: 200,
  other: {
    gross_weight: "4,500 KGS",
    measurement: "12.5 CBM",
    container_no: "TGHU1234567",
    subtotal_amount: 15800.0,
    vat_amount: 0.0,
    payment_terms: "Freight Prepaid",
    tracking_no: "BL-2024-88910",
  },
};

export const initialFields: ExtractedField[] = [
  { id: 1, sourceText: "bill_of_lading", field: "document_type", value: "bill_of_lading", confidence: 100, status: "success" },
  { id: 2, sourceText: "BL-2024-88910", field: "document_number", value: "BL-2024-88910", confidence: 99, status: "success" },
  { id: 3, sourceText: "2024-08-25", field: "document_date", value: "2024-08-25", confidence: 98, status: "success" },
  { id: 4, sourceText: "Siam Global Logistics Co., Ltd.", field: "sender", value: "Siam Global Logistics Co., Ltd.", confidence: 98, status: "success" },
  { id: 5, sourceText: "Tokyo Freight Corp.", field: "receiver", value: "Tokyo Freight Corp.", confidence: 97, status: "success" },
  { id: 6, sourceText: "Bangkok Port, Thailand", field: "origin", value: "Bangkok Port, Thailand", confidence: 96, status: "success" },
  { id: 7, sourceText: "Tokyo Port, Japan", field: "destination", value: "Tokyo Port, Japan", confidence: 96, status: "success" },
  { id: 8, sourceText: "PO-2024-9988", field: "reference_number", value: "PO-2024-9988", confidence: 95, status: "success" },
  { id: 9, sourceText: "79.00", field: "unit_price", value: "79.00", confidence: 95, status: "success" },
  { id: 10, sourceText: "15,800.00", field: "total_amount", value: "15800.00", confidence: 99, status: "success" },
  { id: 11, sourceText: "USD", field: "currency", value: "USD", confidence: 100, status: "success" },
];

export const confidenceScores: ConfidenceScore[] = [
  { label: "การอ่านข้อความ (OCR)", value: 98, tone: "green" },
  { label: "การระบุคู่ค้า (Sender/Receiver)", value: 97, tone: "blue" },
  { label: "เส้นทางขนส่ง (Origin/Destination)", value: 96, tone: "blue" },
  { label: "ราคาและยอดเงิน (Price/Total)", value: 99, tone: "green" },
];

export const initialReviewItems: ReviewItem[] = [];

export const recentJobs: DocumentJob[] = [
  {
    id: "job-1",
    fileName: "BOL_BL-2024-88910.jpg",
    type: "Bill of Lading",
    status: "success",
    statusLabel: "สกัด 11 ฟิลด์สมบูรณ์",
    startedAt: "10:24",
    result: "98.4%",
  },
  {
    id: "job-2",
    fileName: "Invoice_INV-2024-001.pdf",
    type: "Invoice",
    status: "success",
    statusLabel: "เสร็จสมบูรณ์",
    startedAt: "09:48",
    result: "99.0%",
  },
];
