import type { JsonSchemaOutput } from "../types";

/**
 * Thai month mapping to 2-digit month strings
 */
const THAI_MONTHS: Record<string, string> = {
  "ม.ค.": "01", "มกราคม": "01",
  "ก.พ.": "02", "กุมภาพันธ์": "02",
  "มี.ค.": "03", "มีนาคม": "03",
  "เม.ย.": "04", "เมษายน": "04",
  "พ.ค.": "05", "พฤษภาคม": "05",
  "มิ.ย.": "06", "มิถุนายน": "06",
  "ก.ค.": "07", "กรกฎาคม": "07",
  "ส.ค.": "08", "สิงหาคม": "08",
  "ก.ย.": "09", "กันยายน": "09",
  "ต.ค.": "10", "ตุลาคม": "10",
  "พ.ย.": "11", "พฤศจิกายน": "11",
  "ธ.ค.": "12", "ธันวาคม": "12",
};

/**
 * English month mapping to 2-digit month strings
 */
const ENGLISH_MONTHS: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

/**
 * Standard ISO 4217 Currency Definitions
 */
export interface CurrencyInfo {
  code: string;
  symbol: string;
  nameThai: string;
  nameEng: string;
}

export const ISO_CURRENCIES: Record<string, CurrencyInfo> = {
  THB: { code: "THB", symbol: "฿", nameThai: "บาทไทย", nameEng: "Thai Baht" },
  USD: { code: "USD", symbol: "$", nameThai: "ดอลลาร์สหรัฐ", nameEng: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", nameThai: "ยูโร", nameEng: "Euro" },
  JPY: { code: "JPY", symbol: "¥", nameThai: "เยนญี่ปุ่น", nameEng: "Japanese Yen" },
  GBP: { code: "GBP", symbol: "£", nameThai: "ปอนด์สเตอร์ลิง", nameEng: "British Pound" },
  CNY: { code: "CNY", symbol: "¥", nameThai: "หยวนจีน", nameEng: "Chinese Yuan" },
  SGD: { code: "SGD", symbol: "S$", nameThai: "ดอลลาร์สิงคโปร์", nameEng: "Singapore Dollar" },
  MYR: { code: "MYR", symbol: "RM", nameThai: "ริงกิตมาเลเซีย", nameEng: "Malaysian Ringgit" },
  HKD: { code: "HKD", symbol: "HK$", nameThai: "ดอลลาร์ฮ่องกง", nameEng: "Hong Kong Dollar" },
  VND: { code: "VND", symbol: "₫", nameThai: "ดงเวียดนาม", nameEng: "Vietnamese Dong" },
};

/**
 * Result of date normalization
 */
export interface DateNormalizationResult {
  isoDate: string | null;
  displayFormatted: string;
  isValid: boolean;
  wasConvertedFromBuddhist: boolean;
  originalFormat: string;
}

/**
 * Normalizes any logistics date string into standard ISO 8601 (YYYY-MM-DD)
 * Automatically converts Thai Buddhist Era (พ.ศ.) to Common Era (ค.ศ.)
 */
export function normalizeDateToIso(rawDate: string | null | undefined): DateNormalizationResult {
  if (!rawDate || rawDate === "-" || rawDate.trim() === "") {
    return {
      isoDate: null,
      displayFormatted: "-",
      isValid: false,
      wasConvertedFromBuddhist: false,
      originalFormat: "empty",
    };
  }

  const clean = rawDate.trim();

  // 1. Check if already clean ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year >= 2400) {
      // Buddhist Era ISO like 2567-09-15
      const ceYear = year - 543;
      return {
        isoDate: `${ceYear}-${isoMatch[2]}-${isoMatch[3]}`,
        displayFormatted: `${ceYear}-${isoMatch[2]}-${isoMatch[3]}`,
        isValid: true,
        wasConvertedFromBuddhist: true,
        originalFormat: "ISO-Buddhist",
      };
    }
    return {
      isoDate: clean,
      displayFormatted: clean,
      isValid: true,
      wasConvertedFromBuddhist: false,
      originalFormat: "ISO-8601",
    };
  }

  // 2. Thai Month Match (e.g. "15 ก.ย. 2567", "15 กันยายน 2567", "15 ม.ค. 67")
  for (const [tMonth, mNum] of Object.entries(THAI_MONTHS)) {
    if (clean.includes(tMonth)) {
      const parts = clean.match(new RegExp(`(\\d{1,2})\\s*${tMonth.replace(".", "\\.")}[^0-9]*(\\d{2,4})`, "i"));
      if (parts) {
        const day = parts[1].padStart(2, "0");
        let year = parseInt(parts[2], 10);
        let wasB = false;
        if (year > 2400) {
          year -= 543;
          wasB = true;
        } else if (year < 100) {
          // 2-digit Buddhist year e.g. 67 -> 2567 -> 2024
          if (year >= 50 && year <= 99) {
            year = 2500 + year - 543;
            wasB = true;
          } else {
            year = 2000 + year;
          }
        }
        const iso = `${year}-${mNum}-${day}`;
        return {
          isoDate: iso,
          displayFormatted: iso,
          isValid: true,
          wasConvertedFromBuddhist: wasB,
          originalFormat: "Thai-Text",
        };
      }
    }
  }

  // 3. English Month Match (e.g. "15 Oct 2021", "October 4, 1979", "15-Sep-2024")
  for (const [eMonth, mNum] of Object.entries(ENGLISH_MONTHS)) {
    const monthRegex = new RegExp(`\\b${eMonth}[a-z]*\\b`, "i");
    if (monthRegex.test(clean)) {
      // Form 1: Day Month Year ("15 Oct 2024")
      const dmy = clean.match(new RegExp(`(\\d{1,2})[\\s/,-]+${eMonth}[a-z]*[\\s/,-]+(\\d{2,4})`, "i"));
      if (dmy) {
        const day = dmy[1].padStart(2, "0");
        let yr = parseInt(dmy[2], 10);
        if (yr > 2400) yr -= 543;
        else if (yr < 100) yr = yr > 40 ? 1900 + yr : 2000 + yr;
        const iso = `${yr}-${mNum}-${day}`;
        return {
          isoDate: iso,
          displayFormatted: iso,
          isValid: true,
          wasConvertedFromBuddhist: false,
          originalFormat: "English-DMY",
        };
      }
      // Form 2: Month Day Year ("Oct 15, 2024")
      const mdy = clean.match(new RegExp(`${eMonth}[a-z]*[\\s/,-]+(\\d{1,2})(?:st|nd|rd|th)?[\\s/,-]+(\\d{2,4})`, "i"));
      if (mdy) {
        const day = mdy[1].padStart(2, "0");
        let yr = parseInt(mdy[2], 10);
        if (yr > 2400) yr -= 543;
        else if (yr < 100) yr = yr > 40 ? 1900 + yr : 2000 + yr;
        const iso = `${yr}-${mNum}-${day}`;
        return {
          isoDate: iso,
          displayFormatted: iso,
          isValid: true,
          wasConvertedFromBuddhist: false,
          originalFormat: "English-MDY",
        };
      }
    }
  }

  // 4. Numeric Slash / Dash formats: DD/MM/YYYY or MM/DD/YYYY or YYYY/MM/DD
  const numParts = clean.match(/(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/);
  if (numParts) {
    const p1 = parseInt(numParts[1], 10);
    const p2 = parseInt(numParts[2], 10);
    const p3 = parseInt(numParts[3], 10);

    let year = 0;
    let month = 0;
    let day = 0;
    let wasB = false;

    if (p1 > 1000) {
      // YYYY-MM-DD
      year = p1;
      month = p2;
      day = p3;
    } else if (p3 > 1000 || p3 > 50) {
      // DD/MM/YYYY or MM/DD/YYYY
      year = p3;
      if (p1 > 12 && p2 <= 12) {
        // Definitely DD/MM/YYYY
        day = p1;
        month = p2;
      } else if (p2 > 12 && p1 <= 12) {
        // Definitely MM/DD/YYYY
        month = p1;
        day = p2;
      } else {
        // Default to DD/MM/YYYY (standard in Thailand and international shipping)
        day = p1;
        month = p2;
      }
    } else {
      // 2-digit year (e.g. 15/09/24 or 15/09/67)
      if (p3 >= 50 && p3 <= 99) {
        year = 2500 + p3 - 543;
        wasB = true;
      } else {
        year = 2000 + p3;
      }
      day = p1;
      month = p2;
    }

    if (year > 2400) {
      year -= 543;
      wasB = true;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        isoDate: iso,
        displayFormatted: iso,
        isValid: true,
        wasConvertedFromBuddhist: wasB,
        originalFormat: "Numeric-Slash",
      };
    }
  }

  return {
    isoDate: null,
    displayFormatted: clean,
    isValid: false,
    wasConvertedFromBuddhist: false,
    originalFormat: "unrecognized",
  };
}

/**
 * Normalizes raw currency text to standard ISO 4217 currency code
 */
export function normalizeCurrency(rawCurrency: string | null | undefined): {
  code: string;
  symbol: string;
  isStandard: boolean;
  nameThai: string;
} {
  if (!rawCurrency || rawCurrency.trim() === "") {
    return { code: "THB", symbol: "฿", isStandard: true, nameThai: "บาทไทย" };
  }

  const s = rawCurrency.trim().toUpperCase();

  // Direct ISO match
  if (ISO_CURRENCIES[s]) {
    return {
      code: s,
      symbol: ISO_CURRENCIES[s].symbol,
      isStandard: true,
      nameThai: ISO_CURRENCIES[s].nameThai,
    };
  }

  // Symbol or text matches
  if (s.includes("บาท") || s.includes("฿") || s === "B" || s === "BAHT") {
    return { code: "THB", symbol: "฿", isStandard: true, nameThai: "บาทไทย" };
  }
  if (s.includes("$") || s.includes("DOLLAR") || s === "US" || s === "USD") {
    return { code: "USD", symbol: "$", isStandard: true, nameThai: "ดอลลาร์สหรัฐ" };
  }
  if (s.includes("€") || s.includes("EURO")) {
    return { code: "EUR", symbol: "€", isStandard: true, nameThai: "ยูโร" };
  }
  if (s.includes("¥") || s.includes("YEN")) {
    return { code: "JPY", symbol: "¥", isStandard: true, nameThai: "เยนญี่ปุ่น" };
  }
  if (s.includes("£") || s.includes("POUND")) {
    return { code: "GBP", symbol: "£", isStandard: true, nameThai: "ปอนด์สเตอร์ลิง" };
  }
  if (s.includes("RMB") || s.includes("YUAN")) {
    return { code: "CNY", symbol: "¥", isStandard: true, nameThai: "หยวนจีน" };
  }
  if (s.includes("RM") || s.includes("RINGGIT")) {
    return { code: "MYR", symbol: "RM", isStandard: true, nameThai: "ริงกิตมาเลเซีย" };
  }
  if (s.includes("S$") || s.includes("SGD")) {
    return { code: "SGD", symbol: "S$", isStandard: true, nameThai: "ดอลลาร์สิงคโปร์" };
  }

  return { code: s, symbol: "", isStandard: false, nameThai: "สกุลเงินทั่วไป" };
}

/**
 * Validates mathematical integrity between Subtotal, VAT, and Total Amount
 */
export interface MathValidationResult {
  status: "verified" | "discrepancy" | "no_subtotal";
  subtotal: number;
  vat: number;
  total: number;
  expectedTotal: number;
  discrepancyAmount: number;
  message: string;
}

export function validateMathIntegrity(
  totalAmount: number | string,
  subtotalAmount?: number | string,
  vatAmount?: number | string,
): MathValidationResult {
  const total = typeof totalAmount === "number" ? totalAmount : parseFloat(String(totalAmount).replace(/,/g, "")) || 0;
  const subtotal = typeof subtotalAmount === "number" ? subtotalAmount : parseFloat(String(subtotalAmount || "0").replace(/,/g, "")) || 0;
  const vat = typeof vatAmount === "number" ? vatAmount : parseFloat(String(vatAmount || "0").replace(/,/g, "")) || 0;

  if (subtotal <= 0 || vat <= 0) {
    return {
      status: "no_subtotal",
      subtotal,
      vat,
      total,
      expectedTotal: total,
      discrepancyAmount: 0,
      message: "ไม่มีข้อมูล Subtotal / VAT ในเอกสารสำหรับตรวจสอบยอดรวม",
    };
  }

  const expectedTotal = Math.round((subtotal + vat) * 100) / 100;
  const diff = Math.round(Math.abs(total - expectedTotal) * 100) / 100;

  // Allow up to 1.0 currency unit difference for rounding differences
  if (diff <= 1.0) {
    return {
      status: "verified",
      subtotal,
      vat,
      total,
      expectedTotal,
      discrepancyAmount: diff,
      message: `ยอดรวมตรงกันถูกต้อง (Subtotal: ${subtotal.toLocaleString()} + VAT: ${vat.toLocaleString()} = ${total.toLocaleString()})`,
    };
  }

  return {
    status: "discrepancy",
    subtotal,
    vat,
    total,
    expectedTotal,
    discrepancyAmount: diff,
    message: `ยอดรวมไม่ตรงกับผลรวม (Subtotal + VAT = ${expectedTotal.toLocaleString()}, ยอดรวมที่สกัดได้ = ${total.toLocaleString()}, ส่วนต่าง = ${diff.toLocaleString()})`,
  };
}

/**
 * ISO 6346 Standard Shipping Container Number Validation (Modulus 11 Checksum)
 */
export interface ContainerValidationResult {
  isValid: boolean;
  ownerCode: string;
  category: string;
  serialNumber: string;
  checkDigit: number;
  calculatedCheckDigit: number;
  formatted: string;
  message: string;
}

const ISO_6346_LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export function validateContainerNumber(rawContainerNo: string): ContainerValidationResult | null {
  if (!rawContainerNo) return null;

  // Pattern: 4 letters + 6 digits + 1 digit (e.g. MSKU 123456-7 or TGHU9182374)
  const clean = rawContainerNo.toUpperCase().replace(/[\s\-_]/g, "");
  const match = clean.match(/^([A-Z]{3})([UJZ])(\d{6})(\d)$/);
  if (!match) return null;

  const ownerCode = match[1];
  const category = match[2];
  const serialNumber = match[3];
  const checkDigit = parseInt(match[4], 10);

  const fullCode = ownerCode + category + serialNumber;
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    const char = fullCode[i];
    const val = i < 4 ? ISO_6346_LETTER_VALUES[char] || 0 : parseInt(char, 10);
    const weight = Math.pow(2, i);
    sum += val * weight;
  }

  let calculatedCheckDigit = sum % 11;
  if (calculatedCheckDigit === 10) calculatedCheckDigit = 0;

  const isValid = checkDigit === calculatedCheckDigit;
  const formatted = `${ownerCode}${category} ${serialNumber}-${checkDigit}`;

  return {
    isValid,
    ownerCode,
    category,
    serialNumber,
    checkDigit,
    calculatedCheckDigit,
    formatted,
    message: isValid
      ? `เลขตู้คอนเทนเนอร์ถูกต้องตามมาตรฐาน ISO 6346 (${formatted})`
      : `Check Digit ไม่ถูกต้อง (ระบุ: ${checkDigit}, คำนวณได้: ${calculatedCheckDigit})`,
  };
}

/**
 * Normalizes an entire JsonSchemaOutput object applying all business rules:
 * - Converts date to canonical ISO YYYY-MM-DD
 * - Normalizes currency to 3-letter ISO code
 * - Normalizes document number (strips noisy prefixes)
 * - Returns the updated schema + array of human-readable changes
 */
export function normalizeLogisticsJsonSchema(json: JsonSchemaOutput): {
  normalized: JsonSchemaOutput;
  changes: string[];
} {
  const nextJson = { ...json };
  const changes: string[] = [];

  // 1. Date Normalization
  if (nextJson.document_date && nextJson.document_date !== "-") {
    const dateResult = normalizeDateToIso(nextJson.document_date);
    if (dateResult.isValid && dateResult.isoDate && dateResult.isoDate !== nextJson.document_date) {
      changes.push(`ปรับรูปแบบวันที่ "${nextJson.document_date}" -> "${dateResult.isoDate}" (ISO 8601)`);
      nextJson.document_date = dateResult.isoDate;
    }
  }

  // 2. Currency Normalization
  if (nextJson.currency) {
    const currResult = normalizeCurrency(nextJson.currency);
    if (currResult.code !== nextJson.currency) {
      changes.push(`ปรับรหัสสกุลเงิน "${nextJson.currency}" -> "${currResult.code}" (ISO 4217)`);
      nextJson.currency = currResult.code;
    }
  } else {
    nextJson.currency = "THB";
  }

  // 3. Document Number Cleanup
  const rawDocNo = nextJson.document_number || nextJson.document_no || "";
  if (rawDocNo) {
    const cleanDocNo = rawDocNo.replace(/^(?:no\.?|invoice\s*no\.?|inv\s*#|เลขที่)\s*[:#\s]*/i, "").trim();
    if (cleanDocNo !== rawDocNo && cleanDocNo.length >= 2) {
      changes.push(`ทำความสะอาดเลขที่เอกสาร "${rawDocNo}" -> "${cleanDocNo}"`);
      nextJson.document_number = cleanDocNo;
      nextJson.document_no = cleanDocNo;
    }
  }

  // 4. Numbers formatting
  if (typeof nextJson.total_amount === "string") {
    const parsed = parseFloat(String(nextJson.total_amount).replace(/,/g, "")) || 0;
    nextJson.total_amount = Math.round(parsed * 100) / 100;
  }
  if (typeof nextJson.unit_price === "string") {
    const parsed = parseFloat(String(nextJson.unit_price).replace(/,/g, "")) || 0;
    nextJson.unit_price = Math.round(parsed * 100) / 100;
  }

  return { normalized: nextJson, changes };
}

export interface DocumentCompleteness {
  pct: number;
  filledCount: number;
  totalCount: number;
  level: "critical" | "warning" | "good" | "pending";
  label: string;
}

/**
 * Calculates field completeness percentage (% ความครบของ 11 ฟิลด์หลัก)
 * Evaluates core fields: document_type, document_number, document_date, sender, receiver,
 * origin, destination, reference_number, unit_price, total_amount, currency
 */
export function calculateDocumentCompleteness(doc: {
  status?: string;
  jsonOutput?: JsonSchemaOutput | null;
  performance?: any;
  overallConfidence?: number;
}): DocumentCompleteness {
  if (doc.status !== "completed" || !doc.jsonOutput) {
    return { pct: 0, filledCount: 0, totalCount: 11, level: "pending", label: "รอประมวลผล" };
  }

  const json = doc.jsonOutput;
  const coreKeys = [
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
  ] as const;

  let filledCount = 0;
  for (const key of coreKeys) {
    let val: any = json[key];
    if ((val === undefined || val === null || val === "" || val === "-" || val === "N/A") && key === "document_number") {
      val = json.document_no;
    }
    if ((val === undefined || val === null || val === "" || val === "-" || val === "N/A") && key === "sender") {
      val = json.party_name;
    }

    if (val !== undefined && val !== null && val !== "" && val !== "-" && val !== "N/A") {
      if (typeof val === "number") {
        if (val > 0) filledCount++;
      } else {
        filledCount++;
      }
    }
  }

  const pct = Math.round((filledCount / coreKeys.length) * 100);

  // Red: < 65%, Yellow: 65% - 84%, Green: >= 85%
  if (pct < 65) {
    return {
      pct,
      filledCount,
      totalCount: coreKeys.length,
      level: "critical", // Red
      label: `ฟิลด์ครบ ${pct}% (ต้องตรวจซ้ำ)`,
    };
  } else if (pct < 85) {
    return {
      pct,
      filledCount,
      totalCount: coreKeys.length,
      level: "warning", // Yellow
      label: `ฟิลด์ครบ ${pct}% (ปานกลาง)`,
    };
  } else {
    return {
      pct,
      filledCount,
      totalCount: coreKeys.length,
      level: "good", // Green
      label: `ฟิลด์ครบ ${pct}% (สมบูรณ์)`,
    };
  }
}
