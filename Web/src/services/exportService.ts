import * as XLSX from "xlsx";
import type { BatchDocumentItem, JsonSchemaOutput } from "../types";

export interface ExportRecord {
  no: number;
  fileName: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  sender: string;
  receiver: string;
  origin: string;
  destination: string;
  referenceNumber: string;
  unitPrice: number | string;
  totalAmount: number | string;
  currency: string;
  accuracyPct: number | string;
  status: string;
  otherFields: string;
}

/**
 * Normalizes document data into a clean, flat object for tabular export (Excel/CSV)
 */
export function normalizeDocumentForExport(
  doc: BatchDocumentItem | { jsonOutput: JsonSchemaOutput | null; fileName?: string },
  index: number = 0,
): ExportRecord {
  const json: Partial<JsonSchemaOutput> = doc.jsonOutput || {};
  const batchDoc = doc as Partial<BatchDocumentItem>;

  const docNo = json.document_number || json.document_no || "-";
  const sender = json.sender || json.party_name || "-";
  const otherObj = json.other || {};
  const otherStr = Object.keys(otherObj).length > 0 ? JSON.stringify(otherObj) : "-";

  const accuracy =
    batchDoc.performance?.accuracy_pct ??
    batchDoc.overallConfidence ??
    (json.total_amount ? 98 : 85);

  return {
    no: index + 1,
    fileName: batchDoc.fileName || json.source_file || `document_${index + 1}`,
    documentType: json.document_type || "invoice",
    documentNumber: docNo,
    documentDate: json.document_date || "-",
    sender: sender,
    receiver: json.receiver || "-",
    origin: json.origin || "-",
    destination: json.destination || "-",
    referenceNumber: json.reference_number || "-",
    unitPrice: json.unit_price ?? 0,
    totalAmount: json.total_amount ?? 0,
    currency: json.currency || "THB",
    accuracyPct: typeof accuracy === "number" ? `${accuracy}%` : accuracy,
    status: batchDoc.statusLabel || (json.total_amount ? "เสร็จสมบูรณ์" : "รอตรวจสอบ"),
    otherFields: otherStr,
  };
}

/**
 * Returns user-friendly Thai & English headers for spreadsheet columns
 */
function getSpreadsheetHeaders(): Record<string, string> {
  return {
    no: "ลำดับ (No.)",
    fileName: "ชื่อไฟล์ (File Name)",
    documentType: "ประเภทเอกสาร (Document Type)",
    documentNumber: "เลขที่เอกสาร (Document No.)",
    documentDate: "วันที่เอกสาร (Document Date)",
    sender: "ผู้ส่ง/ผู้ขาย (Sender)",
    receiver: "ผู้รับ/ผู้ซื้อ (Receiver)",
    origin: "ต้นทาง (Origin)",
    destination: "ปลายทาง (Destination)",
    referenceNumber: "เลขอ้างอิง (Ref No.)",
    unitPrice: "ราคาต่อหน่วย (Unit Price)",
    totalAmount: "ยอดเงินรวม (Total Amount)",
    currency: "สกุลเงิน (Currency)",
    accuracyPct: "ความถูกต้อง (%)",
    status: "สถานะ (Status)",
    otherFields: "ข้อมูลเพิ่มเติม (Other Fields)",
  };
}

/**
 * Export batch documents to Microsoft Excel (.xlsx) format
 * Generates 2 sheets:
 * 1. Logistics Summary (11 Core Fields)
 * 2. Detailed Fields & Reasoning
 */
export function exportBatchToExcel(
  documents: BatchDocumentItem[],
  customFileName?: string,
): void {
  const completedDocs = documents.filter((d) => d.jsonOutput !== null);
  if (completedDocs.length === 0) {
    throw new Error("ยังไม่มีเอกสารที่ประมวลผล JSON เสร็จสมบูรณ์สำหรับ Export");
  }

  const exportRecords = completedDocs.map((doc, idx) => normalizeDocumentForExport(doc, idx));
  const headers = getSpreadsheetHeaders();

  // 1. Sheet 1: Summary of 11 Core Logistics Fields
  const sheet1Data = exportRecords.map((r) => ({
    [headers.no]: r.no,
    [headers.fileName]: r.fileName,
    [headers.documentType]: r.documentType,
    [headers.documentNumber]: r.documentNumber,
    [headers.documentDate]: r.documentDate,
    [headers.sender]: r.sender,
    [headers.receiver]: r.receiver,
    [headers.origin]: r.origin,
    [headers.destination]: r.destination,
    [headers.referenceNumber]: r.referenceNumber,
    [headers.unitPrice]: r.unitPrice,
    [headers.totalAmount]: r.totalAmount,
    [headers.currency]: r.currency,
    [headers.accuracyPct]: r.accuracyPct,
    [headers.status]: r.status,
    [headers.otherFields]: r.otherFields,
  }));

  const worksheet1 = XLSX.utils.json_to_sheet(sheet1Data);

  // Set optimal column widths
  worksheet1["!cols"] = [
    { wch: 6 },  // No
    { wch: 32 }, // File Name
    { wch: 16 }, // Type
    { wch: 20 }, // Doc No
    { wch: 15 }, // Date
    { wch: 28 }, // Sender
    { wch: 28 }, // Receiver
    { wch: 18 }, // Origin
    { wch: 18 }, // Destination
    { wch: 20 }, // Ref No
    { wch: 14 }, // Unit Price
    { wch: 16 }, // Total Amount
    { wch: 10 }, // Currency
    { wch: 14 }, // Accuracy %
    { wch: 16 }, // Status
    { wch: 40 }, // Other
  ];

  // 2. Sheet 2: Detailed Field Breakdown per Document
  const sheet2Data: Array<Record<string, any>> = [];
  completedDocs.forEach((doc, docIdx) => {
    const fields = doc.fields || [];
    if (fields.length > 0) {
      fields.forEach((f) => {
        sheet2Data.push({
          "ลำดับเอกสาร": docIdx + 1,
          "ชื่อไฟล์": doc.fileName,
          "ชื่อฟิลด์ (Field Name)": f.field,
          "ข้อความสกัดได้ (Extracted Value)": f.value,
          "ข้อความต้นฉบับ OCR (Source Text)": f.sourceText || "-",
          "ความมั่นใจ (%)": `${f.confidence}%`,
          "สถานะ": f.status === "success" ? "ถูกต้อง" : "ต้องตรวจสอบ",
          "ประเภทฟิลด์": f.isOther ? "ฟิลด์เสริม (Other)" : "11 ฟิลด์หลัก",
        });
      });
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet1, "Logistics Summary (11 Fields)");

  if (sheet2Data.length > 0) {
    const worksheet2 = XLSX.utils.json_to_sheet(sheet2Data);
    worksheet2["!cols"] = [
      { wch: 10 }, // Doc No
      { wch: 30 }, // File Name
      { wch: 22 }, // Field
      { wch: 26 }, // Value
      { wch: 30 }, // Source
      { wch: 12 }, // Conf
      { wch: 14 }, // Status
      { wch: 18 }, // Type
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet2, "Detailed Fields");
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFileName = customFileName || `logiai_export_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, finalFileName);
}

/**
 * Export batch documents to CSV with UTF-8 BOM for Thai language Excel compatibility
 */
export function exportBatchToCsv(
  documents: BatchDocumentItem[],
  customFileName?: string,
): void {
  const completedDocs = documents.filter((d) => d.jsonOutput !== null);
  if (completedDocs.length === 0) {
    throw new Error("ยังไม่มีเอกสารที่ประมวลผล JSON เสร็จสมบูรณ์สำหรับ Export");
  }

  const records = completedDocs.map((doc, idx) => normalizeDocumentForExport(doc, idx));
  const headers = getSpreadsheetHeaders();

  const columnKeys = Object.keys(headers) as Array<keyof ExportRecord>;
  const headerRow = columnKeys.map((k) => `"${headers[k].replace(/"/g, '""')}"`).join(",");

  const rows = records.map((record) => {
    return columnKeys
      .map((k) => {
        const val = String(record[k] ?? "");
        // Escape quotes per RFC 4180
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  // Include UTF-8 BOM (\uFEFF) to make Microsoft Excel display Thai text cleanly
  const csvContent = "\uFEFF" + [headerRow, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerFileDownload(blob, customFileName || `logiai_export_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export a single active document to Microsoft Excel (.xlsx)
 */
export function exportSingleDocToExcel(
  doc: BatchDocumentItem | { jsonOutput: JsonSchemaOutput; fileName?: string; fields?: any[] },
  customFileName?: string,
): void {
  const record = normalizeDocumentForExport(doc, 0);
  const headers = getSpreadsheetHeaders();

  const sheetData = [
    {
      [headers.no]: 1,
      [headers.fileName]: record.fileName,
      [headers.documentType]: record.documentType,
      [headers.documentNumber]: record.documentNumber,
      [headers.documentDate]: record.documentDate,
      [headers.sender]: record.sender,
      [headers.receiver]: record.receiver,
      [headers.origin]: record.origin,
      [headers.destination]: record.destination,
      [headers.referenceNumber]: record.referenceNumber,
      [headers.unitPrice]: record.unitPrice,
      [headers.totalAmount]: record.totalAmount,
      [headers.currency]: record.currency,
      [headers.accuracyPct]: record.accuracyPct,
      [headers.status]: record.status,
      [headers.otherFields]: record.otherFields,
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 16 },
    { wch: 20 },
    { wch: 15 },
    { wch: 28 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Document Info");

  const fields = (doc as any).fields || [];
  if (fields.length > 0) {
    const fieldsData = fields.map((f: any) => ({
      "ชื่อฟิลด์": f.field,
      "ค่าที่สกัดได้": f.value,
      "ข้อความต้นฉบับ": f.sourceText || "-",
      "ความมั่นใจ (%)": `${f.confidence}%`,
      "สถานะ": f.status === "success" ? "ถูกต้อง" : "ต้องตรวจสอบ",
      "ประเภท": f.isOther ? "ฟิลด์เสริม (Other)" : "11 ฟิลด์หลัก",
    }));
    const worksheet2 = XLSX.utils.json_to_sheet(fieldsData);
    worksheet2["!cols"] = [
      { wch: 22 },
      { wch: 28 },
      { wch: 30 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet2, "Extracted Fields");
  }

  const safeName = record.documentNumber !== "-" ? record.documentNumber : record.fileName.replace(/\.[^/.]+$/, "");
  XLSX.writeFile(workbook, customFileName || `${safeName}_export.xlsx`);
}

/**
 * Export a single active document to CSV
 */
export function exportSingleDocToCsv(
  doc: BatchDocumentItem | { jsonOutput: JsonSchemaOutput; fileName?: string },
  customFileName?: string,
): void {
  const record = normalizeDocumentForExport(doc, 0);
  const headers = getSpreadsheetHeaders();

  const columnKeys = Object.keys(headers) as Array<keyof ExportRecord>;
  const headerRow = columnKeys.map((k) => `"${headers[k].replace(/"/g, '""')}"`).join(",");
  const row = columnKeys
    .map((k) => {
      const val = String(record[k] ?? "");
      return `"${val.replace(/"/g, '""')}"`;
    })
    .join(",");

  const csvContent = "\uFEFF" + [headerRow, row].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const safeName = record.documentNumber !== "-" ? record.documentNumber : record.fileName.replace(/\.[^/.]+$/, "");
  triggerFileDownload(blob, customFileName || `${safeName}_export.csv`);
}

/**
 * Export single or multiple schemas to standard formatted JSON
 */
export function exportToJson(
  data: JsonSchemaOutput | JsonSchemaOutput[] | Record<string, any>,
  fileName: string,
): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  triggerFileDownload(blob, fileName);
}

/**
 * Helper to trigger browser download
 */
function triggerFileDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
