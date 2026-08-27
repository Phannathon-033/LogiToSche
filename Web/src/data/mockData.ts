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
  AdminAnalyticsPoint,
  AdminDocumentRecord,
  AdminErrorCluster,
  AdminFewShotExample,
  AdminPromptLabState,
  AdminUserRecord,
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

export interface MockAdminDoc {
  id: string;
  fileName: string;
  type: string;
  uploadedBy: { name: string; role: string; avatar: string };
  date: string;
  status: string;
  statusLabel: string;
  result: string;
}

export const mockAdminDocs: MockAdminDoc[] = [
  {
    id: "INV_20250825_001.pdf",
    fileName: "INV_20250825_001.pdf",
    type: "Invoice",
    uploadedBy: { name: "Nattapong P.", role: "User", avatar: "N" },
    date: "25 ส.ค. 2025 14:30",
    status: "success",
    statusLabel: "Success",
    result: "95.6%",
  },
  {
    id: "BL_20250825_018.pdf",
    fileName: "BL_20250825_018.pdf",
    type: "Bill of Lading",
    uploadedBy: { name: "Sirilak K.", role: "User", avatar: "S" },
    date: "25 ส.ค. 2025 14:28",
    status: "review",
    statusLabel: "รอตรวจสอบ",
    result: "88.2%",
  },
  {
    id: "PL_20250825_017.pdf",
    fileName: "PL_20250825_017.pdf",
    type: "Packing List",
    uploadedBy: { name: "Wichai T.", role: "User", avatar: "W" },
    date: "25 ส.ค. 2025 14:25",
    status: "success",
    statusLabel: "สำเร็จ",
    result: "94.1%",
  },
  {
    id: "PO_20250825_016.pdf",
    fileName: "PO_20250825_016.pdf",
    type: "Purchase Order",
    uploadedBy: { name: "Nattapong P.", role: "User", avatar: "N" },
    date: "25 ส.ค. 2025 14:20",
    status: "success",
    statusLabel: "สำเร็จ",
    result: "91.3%",
  },
  {
    id: "INV_20250825_015.pdf",
    fileName: "INV_20250825_015.pdf",
    type: "Invoice",
    uploadedBy: { name: "Sirilak K.", role: "User", avatar: "S" },
    date: "25 ส.ค. 2025 14:15",
    status: "error",
    statusLabel: "ไม่ผ่านเกณฑ์",
    result: "62.7%",
  },
];

export const mockAdminDocuments: AdminDocumentRecord[] = [
  {
    id: "INV_20250825_001",
    fileName: "INV_20250825_001.pdf",
    type: "Invoice",
    uploadedBy: { name: "Nattapong P.", role: "User", avatar: "N" },
    date: "27/08/2569",
    status: "review",
    statusLabel: "ต้องตรวจ field ยอดรวม",
    result: "84%",
    overallConfidence: 84,
    queueReasons: ["ยอดรวมไม่ตรง OCR", "มี field สำคัญต้องยืนยัน"],
    missingFields: [],
    conflictingFields: ["total_amount", "truck_plate"],
    errorTags: ["amount_mismatch", "plate_normalization"],
    reviewNotes: ["OCR อ่านยอดรวมเป็น 52,162.50 แต่ SLM เลือก subtotal แทน"],
    ocrText,
    jsonOutput: {
      document_type: "invoice",
      invoice_no: "INV-2024-001",
      document_date: "2024-05-15",
      receiver_name: "XYZ Warehouse",
      truck_plate: "70-1234",
      gross_weight_kg: 25000,
      quantity: 120,
      total_amount: 48750,
      other: { due_date: "2024-05-30", currency: "THB" },
    },
    extractedFields: initialFields.map((field) =>
      field.field === "truck_plate" || field.field === "gross_weight_kg" ? field : { ...field, status: "success" },
    ),
    reviewItems: initialReviewItems,
    correctionHistory: [
      {
        id: "corr-1",
        field: "receiver_name",
        previousValue: "ABC Logistics Co., Ltd.",
        nextValue: "XYZ Warehouse",
        reason: "ปลายทางอยู่ใน block Ship To ไม่ใช่ชื่อผู้ส่งเอกสาร",
        correctedBy: "สมชาย วงศ์สวัสดิ์",
          correctedAt: "27/08/2569 14:42",
      },
    ],
    promptSignals: [
      {
        id: "signal-1",
        title: "แยก Ship To กับ Bill To ให้ชัด",
        detail: "Invoice กลุ่มนี้มีทั้ง Bill To และ Ship To ในหน้าเดียว ทำให้ field receiver_name หลุดไปหา sender บ่อย",
        severity: "high",
      },
      {
        id: "signal-2",
        title: "ห้ามใช้ subtotal แทน total_amount",
        detail: "เมื่อเจอทั้ง Subtotal, VAT และ Total Amount ให้เลือก Total Amount เป็นหลัก",
        severity: "high",
      },
    ],
    metrics: {
      ocrTime: "0.8s",
      slmTime: "1.6s",
      totalTime: "2.4s",
      device: "CUDA 12.6 / GPU-0",
      ocrEngine: "PaddleOCR v4",
      slmModel: "Qwen2.5-1.5B-Instruct",
    },
    ocrLines: [
      { id: "ocr-1", text: "Invoice No. INV-2024-001", confidence: 98, box: [120, 168, 428, 196] },
      { id: "ocr-2", text: "Invoice Date 15/05/2024", confidence: 97, box: [122, 198, 386, 228] },
      { id: "ocr-3", text: "Ship To: XYZ Warehouse", confidence: 91, box: [94, 320, 422, 360] },
      { id: "ocr-4", text: "Total Amount 52,162.50", confidence: 88, box: [340, 594, 594, 628] },
    ],
  },
  {
    id: "BL_20250825_018",
    fileName: "BL_20250825_018.pdf",
    type: "Bill of Lading",
    uploadedBy: { name: "Sirilak K.", role: "User", avatar: "S" },
    date: "27/08/2569",
    status: "processing",
    statusLabel: "กำลังประมวลผล",
    result: "-",
    overallConfidence: 0,
    queueReasons: ["กำลังรอผล SLM", "OCR line confidence ต่ำ"],
    missingFields: ["receiver_name"],
    conflictingFields: ["document_date"],
    errorTags: ["missing_receiver", "date_format_conflict"],
    reviewNotes: ["ต้นฉบับสแกนเอียง ทำให้ OCR line ปลายหน้าขาดหาย"],
    ocrText: `BILL OF LADING
Carrier: Meridian Shipping
B/L No: BL-2025-018
Date: 2025/08/25
Consignee: Siam Port Services
Notify Party: Eastern Warehouse
Port of Loading: Laem Chabang
Port of Discharge: Singapore`,
    jsonOutput: {
      document_type: "bill_of_lading",
      invoice_no: "BL-2025-018",
      document_date: "2025/08/25",
      receiver_name: "",
      truck_plate: "",
      gross_weight_kg: 0,
      quantity: 0,
      total_amount: 0,
      other: {
        carrier_company: "Meridian Shipping",
        port_of_loading: "Laem Chabang",
        port_of_discharge: "Singapore",
      },
    },
    extractedFields: [
      { id: 1, sourceText: "B/L No: BL-2025-018", field: "invoice_no", value: "BL-2025-018", confidence: 96, status: "success" },
      { id: 2, sourceText: "Date: 2025/08/25", field: "document_date", value: "2025/08/25", confidence: 72, status: "review" },
      { id: 3, sourceText: "Consignee: Siam Port Services", field: "receiver_name", value: "", confidence: 48, status: "error" },
    ],
    reviewItems: [
      { id: "receiver_name", field: "receiver_name", ocrValue: "Consignee: Siam Port Services", slmValue: "", confidence: 48, status: "review" },
      { id: "document_date", field: "document_date", ocrValue: "2025/08/25", slmValue: "2025/08/25", confidence: 72, status: "review" },
    ],
    correctionHistory: [],
    promptSignals: [
      {
        id: "signal-3",
        title: "เพิ่ม synonym ของ receiver",
        detail: "Bill of Lading มักใช้ Consignee แทน receiver_name ต้องย้ำใน prompt mapping",
        severity: "high",
      },
      {
        id: "signal-4",
        title: "normalize วันที่เป็น ISO",
        detail: "OCR ให้รูปแบบ YYYY/MM/DD ควร normalize เป็น YYYY-MM-DD เสมอ",
        severity: "medium",
      },
    ],
    metrics: {
      ocrTime: "1.1s",
      slmTime: "1.9s",
      totalTime: "3.0s",
      device: "CUDA 12.6 / GPU-0",
      ocrEngine: "PaddleOCR v4",
      slmModel: "Qwen2.5-1.5B-Instruct",
    },
    ocrLines: [
      { id: "ocr-5", text: "B/L No: BL-2025-018", confidence: 96, box: [88, 140, 312, 170] },
      { id: "ocr-6", text: "Date: 2025/08/25", confidence: 72, box: [322, 140, 470, 170] },
      { id: "ocr-7", text: "Consignee: Siam Port Services", confidence: 48, box: [84, 226, 386, 258] },
      { id: "ocr-8", text: "Port of Discharge: Singapore", confidence: 78, box: [92, 312, 430, 344] },
    ],
  },
  {
    id: "PO_20250825_016",
    fileName: "packing03.jpg",
    type: "Packing List",
    uploadedBy: { name: "User03", role: "User", avatar: "U" },
    date: "26/08/2569",
    status: "error",
    statusLabel: "ไม่สำเร็จ",
    result: "62%",
    overallConfidence: 62,
    queueReasons: ["OCR อ่านผิดหลายบรรทัด", "ข้อมูลสำคัญไม่ครบ"],
    missingFields: [],
    conflictingFields: ["receiver_name", "total_amount"],
    errorTags: ["ocr_noise", "missing_amount"],
    reviewNotes: ["ภาพเบลอและมีเงาซ้อน ทำให้ OCR หลายบรรทัดคลาดเคลื่อน"],
    ocrText: `PACKING LIST
Reference: PK-2025-003
Receiver: ...
Gross Weight: 1?5? KG
Total Amount: unreadable`,
    jsonOutput: {
      document_type: "packing_list",
      invoice_no: "PK-2025-003",
      document_date: "2025-08-26",
      receiver_name: "",
      truck_plate: "",
      gross_weight_kg: 0,
      quantity: 0,
      total_amount: 0,
      other: {},
    },
    extractedFields: [
      { id: 1, sourceText: "Reference: PK-2025-003", field: "invoice_no", value: "PK-2025-003", confidence: 85, status: "success" },
      { id: 2, sourceText: "Receiver: ...", field: "receiver_name", value: "", confidence: 32, status: "error" },
      { id: 3, sourceText: "Gross Weight: 1?5? KG", field: "gross_weight_kg", value: "0", confidence: 41, status: "review" },
      { id: 4, sourceText: "Total Amount: unreadable", field: "total_amount", value: "0", confidence: 18, status: "error" },
    ],
    reviewItems: [
      { id: "receiver_name", field: "receiver_name", ocrValue: "...", slmValue: "", confidence: 32, status: "review" },
      { id: "total_amount", field: "total_amount", ocrValue: "unreadable", slmValue: "0", confidence: 18, status: "review" },
    ],
    correctionHistory: [],
    promptSignals: [
      {
        id: "signal-5",
        title: "ภาพเบลอควรลดความเชื่อมั่นทันที",
        detail: "เมื่อ OCR confidence หลายบรรทัดต่ำกว่า 50 ควรบังคับส่งเข้า review พร้อมเตือน field ที่อ่านไม่ได้",
        severity: "high",
      },
    ],
    metrics: {
      ocrTime: "1.4s",
      slmTime: "0.0s",
      totalTime: "1.4s",
      device: "CUDA 12.6 / GPU-0",
      ocrEngine: "PaddleOCR v4",
      slmModel: "Qwen2.5-1.5B-Instruct",
    },
    ocrLines: [
      { id: "ocr-9", text: "Reference: PK-2025-003", confidence: 85, box: [108, 134, 296, 162] },
      { id: "ocr-10", text: "Receiver: ...", confidence: 32, box: [104, 236, 290, 266] },
      { id: "ocr-11", text: "Total Amount: unreadable", confidence: 18, box: [332, 482, 592, 514] },
    ],
  },
];

export const mockAdminAnalytics: AdminAnalyticsPoint[] = [
  { label: "เอกสารในคิวตรวจ", value: 12, hint: "รวมเคส confidence ต่ำและ field ตกหล่น" },
  { label: "เคสที่แก้แล้วสัปดาห์นี้", value: 27, hint: "แก้ไขโดย admin เพื่อนำไปปรับ prompt" },
  { label: "field ที่พลาดบ่อย", value: 4, hint: "receiver_name, total_amount, truck_plate, document_date" },
  { label: "baseline docs", value: 9, hint: "ใช้เป็นตัวอย่างอ้างอิงสำหรับ prompt lab" },
];

export const mockAdminErrorClusters: AdminErrorCluster[] = [
  {
    id: "cluster-1",
    title: "ยอดรวมไม่ตรงกับ OCR block สุดท้าย",
    count: 11,
    documents: 7,
    recommendation: "เพิ่ม rule ให้ total_amount ต้องอิง label Total Amount ก่อน subtotal เสมอ",
  },
  {
    id: "cluster-2",
    title: "receiver_name หายเมื่อเอกสารใช้คำว่า Consignee",
    count: 8,
    documents: 5,
    recommendation: "เพิ่ม synonym mapping สำหรับ Bill of Lading และ Packing List",
  },
  {
    id: "cluster-3",
    title: "วันที่ออกมาไม่เป็น ISO format",
    count: 6,
    documents: 6,
    recommendation: "normalize วันที่ทุก format หลัง post-processing ก่อนแสดง JSON",
  },
];

export const mockPromptLabState: AdminPromptLabState = {
  confidenceThreshold: 85,
  selectedModel: "qwen-2.5-1.5b",
  systemPrompt:
    "คุณคือผู้ช่วยดึงข้อมูลโลจิสติกส์จาก OCR text ให้ map ข้อมูลเข้าสู่ JSON schema อย่างเคร่งครัด แยก sender, receiver, total amount และ document number ให้ชัดเจน พร้อมระบุ field ที่ไม่มั่นใจลง review_items",
  fallbackRules: [
    "ถ้าเจอทั้ง Subtotal และ Total Amount ให้เลือก Total Amount",
    "Consignee, Ship To, Deliver To ให้ตีความเป็น receiver_name ตามบริบทเอกสาร",
    "วันที่ต้อง normalize เป็น YYYY-MM-DD ถ้าตีความได้ชัดเจน",
  ],
  monitoredFields: ["invoice_no", "document_date", "receiver_name", "total_amount"],
  fewShotExamples: [],
};

export const mockAdminUsers: AdminUserRecord[] = [
  {
    id: "user-01",
    name: "User01",
    email: "user01@email.com",
    role: "User",
    registeredAt: "20/08/2569",
  },
  {
    id: "user-02",
    name: "User02",
    email: "user02@email.com",
    role: "User",
    registeredAt: "22/08/2569",
  },
  {
    id: "user-03",
    name: "User03",
    email: "user03@email.com",
    role: "User",
    registeredAt: "24/08/2569",
  },
];

export const mockPromptExamples: AdminFewShotExample[] = [
  {
    id: "fewshot-1",
    title: "Invoice Standard",
    input: "Invoice No. INV-2024-001\nInvoice Date 15/05/2024\nShip To: XYZ Warehouse\nTotal Amount 52,162.50",
    expectedOutput:
      '{\n  "document_type": "invoice",\n  "invoice_no": "INV-2024-001",\n  "document_date": "2024-05-15",\n  "receiver_name": "XYZ Warehouse",\n  "total_amount": 52162.5\n}',
  },
  {
    id: "fewshot-2",
    title: "Bill of Lading Consignee Mapping",
    input: "B/L No: BL-2025-018\nDate: 2025/08/25\nConsignee: Siam Port Services",
    expectedOutput:
      '{\n  "document_type": "bill_of_lading",\n  "invoice_no": "BL-2025-018",\n  "document_date": "2025-08-25",\n  "receiver_name": "Siam Port Services"\n}',
  },
];
