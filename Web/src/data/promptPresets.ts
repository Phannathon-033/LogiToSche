import type { SlmPromptPreset } from "../types";

export const PROMPT_PRESETS: SlmPromptPreset[] = [
  // 1. Synonym & Entity Mapping
  {
    id: "synonym_party",
    category: "synonym",
    categoryLabel: "ตรวจสอบคำความหมายเดียวกัน",
    badge: "คู่ค้า & นิติบุคคล",
    title: "จำแนกชื่อผู้ซื้อ / ผู้ขาย / ผู้รับสินค้า (Buyer, Seller, Consignee)",
    description: "ตรวจสอบและจัดกลุ่มคำที่มีความหมายเดียวกัน เช่น ผู้ส่ง, Vendor, Shipper, ผู้ขาย เข้ากับ sender_name และ ผู้รับ, Consignee, Buyer เข้ากับ receiver_name",
    prompt: "วิเคราะห์ข้อความ OCR และจำแนกชื่อนิติบุคคลหรือคู่ค้าที่มีความหมายเดียวกัน เช่น ผู้ส่ง/ผู้ขาย/Vendor/Shipper ให้เป็น sender_name และ ผู้ซื้อ/ผู้รับสินค้า/Consignee/Buyer ให้เป็น receiver_name พร้อมระบุว่าชื่อใดควรเป็น party_name หลัก",
  },
  {
    id: "synonym_doc_no",
    category: "synonym",
    categoryLabel: "ตรวจสอบคำความหมายเดียวกัน",
    badge: "เลขที่อ้างอิง",
    title: "จำแนกเลขที่เอกสาร & เลขที่ใบสั่งซื้อ (Invoice No, PO No, Tax ID)",
    description: "ตรวจสอบคำระบุเลขที่เอกสาร เช่น เลขที่, Tax Inv, Inv No, Reference No, P.O., Purchase Order, AWB No. และจัดคู่ค่าที่ถูกต้องลงในฟิลด์",
    prompt: "ตรวจสอบคำระบุเลขที่เอกสาร เช่น เลขที่, Tax Inv, Inv No, Reference No, P.O., Purchase Order, Tax ID และจัดคู่ค่าที่ถูกต้องลงในฟิลด์ 7 ฟิลด์หลักและ other",
  },
  {
    id: "synonym_vehicle",
    category: "synonym",
    categoryLabel: "ตรวจสอบคำความหมายเดียวกัน",
    badge: "ยานพาหนะขนส่ง",
    title: "ตรวจสอบทะเบียนรถ / ตู้คอนเทนเนอร์ (Truck Plate, Container No)",
    description: "ตรวจสอบคำระบุข้อมูลยานพาหนะ เช่น ทะเบียนรถ, รถบรรทุก, ทะเบียนหัวลาก, Container No, Car Plate, Truck No. และสกัดค่าที่แท้จริง",
    prompt: "ตรวจสอบคำระบุข้อมูลยานพาหนะและการขนส่ง เช่น ทะเบียนรถ, ทะเบียนหัวลาก, หมายเลขตู้คอนเทนเนอร์ (Container No.), ชื่อเรือ (Vessel) หรือทะเบียนรถส่งของ แล้วสรุปค่าที่พบ",
  },

  // 2. Summary & Simplification
  {
    id: "summarize_short",
    category: "summary",
    categoryLabel: "วิเคราะห์ & สรุปกระชับ",
    badge: "สรุป 1 ประโยค",
    title: "สรุปใจความสำคัญของเอกสารให้สั้นกระชับใน 1-2 ประโยค",
    description: "วิเคราะห์เนื้อหาเอกสารทั้งหมดและย่อความให้เหลือเพียง 1-2 ประโยคสั้นๆ เพื่อให้เจ้าหน้าที่หรือผู้บริหารเข้าใจได้ทันที",
    prompt: "สรุปเนื้อหาหลักของเอกสารนี้ให้เหลือเพียง 1-2 ประโยคสั้นๆ กระชับ ระบุว่าใครส่งอะไรให้ใคร ยอดเงินเท่าไหร่ เพื่อใช้อ่านสรุปและส่งต่อให้ทีมงานอย่างรวดเร็ว",
  },
  {
    id: "summarize_goods",
    category: "summary",
    categoryLabel: "วิเคราะห์ & สรุปกระชับ",
    badge: "รายการสินค้า",
    title: "สรุปรายการสินค้า ปริมาณ และราคารวมแบบกระชับ",
    description: "ดึงเฉพาะรายการสินค้าหลัก, จำนวน (Quantity), หน่วยนับ และราคารวมออกมาสรุปเป็นข้อความสั้นๆ",
    prompt: "สรุปเฉพาะรายการสินค้าหลัก, จำนวน (Quantity), หน่วยนับ และราคารวมในรูปแบบตารางย่อหรือสรุปข้อความ 2-3 บรรทัดที่เข้าใจง่าย",
  },
  {
    id: "summarize_payment_terms",
    category: "summary",
    categoryLabel: "วิเคราะห์ & สรุปกระชับ",
    badge: "เงื่อนไขชำระเงิน",
    title: "สรุปเงื่อนไขการชำระเงินและข้อกำหนดการส่ง (Payment & Incoterms)",
    description: "วิเคราะห์เงื่อนไขเครดิตเทอม วันครบกำหนดชำระ เลขที่บัญชีธนาคาร และเงื่อนไขการส่งสินค้า (Incoterms)",
    prompt: "วิเคราะห์และสรุปเงื่อนไขการชำระเงิน (Credit Term, Due Date, Bank Account) และเงื่อนไขการจัดส่ง (Incoterms เช่น FOB, CIF, Door-to-Door) ให้กระชับเข้าใจง่าย",
  },

  // 3. Validation & Discrepancy Check
  {
    id: "validate_numbers",
    category: "validation",
    categoryLabel: "ตรวจสอบความถูกต้อง",
    badge: "ตรวจสอบตัวเลข",
    title: "ตรวจสอบความสอดคล้องของผลรวมเงิน (Subtotal + VAT = Total)",
    description: "ตรวจสอบตัวเลขว่ายอดก่อนภาษี รวมกับ VAT 7% แล้วเท่ากับ Total Amount สุทธิหรือไม่ และแจ้งเตือนหากมีส่วนต่าง",
    prompt: "ตรวจสอบตัวเลขในเอกสารว่า Subtotal (ยอดก่อนภาษี), VAT (ภาษีมูลค่าเพิ่ม) และ Total Amount (ยอดสุทธิ) คำนวณถูกต้องตามหลักคณิตศาสตร์หรือไม่ และแจ้งหากพบข้อผิดพลาด",
  },
  {
    id: "validate_core_fields",
    category: "validation",
    categoryLabel: "ตรวจสอบความถูกต้อง",
    badge: "ความสมบูรณ์ของฟิลด์",
    title: "ตรวจสอบความครบถ้วนของ 7 ฟิลด์หลัก (Core 7 Fields Quality Check)",
    description: "ตรวจสอบว่าเอกสารนี้มีข้อมูลครบทั้ง 7 ฟิลด์หลักหรือไม่ และแนะนำข้อความใน OCR ที่สามารถนำมาเติมในฟิลด์ที่ขาดได้",
    prompt: "ตรวจสอบว่าเอกสารนี้มีข้อมูลครบทั้ง 7 ฟิลด์หลักหรือไม่ (document_type, document_no, document_date, party_name, source_file, quantity, total_amount) หากฟิลด์ไหนขาดหายไป ให้แนะนำข้อความที่น่าจะเป็นไปได้จาก OCR Text",
  },

  // 4. Translation & Formatting
  {
    id: "translate_format",
    category: "translation",
    categoryLabel: "แปลภาษา & จัดรูปแบบ",
    badge: "แปลภาษาไทย-อังกฤษ",
    title: "แปลชื่อบริษัท รายการสินค้า และปรับรูปแบบวันที่สากล",
    description: "แปลข้อมูลภาษาอังกฤษเป็นภาษาไทยที่ถูกต้องตามศัพท์โลจิสติกส์ พร้อมแปลงวันที่เป็นรูปแบบ ISO 8601",
    prompt: "แปลชื่อบริษัท, ที่อยู่ และรายการสินค้าในเอกสารจากภาษาอังกฤษเป็นภาษาไทยที่ถูกต้องตามศัพท์โลจิสติกส์ พร้อมแปลงวันที่ทุกรูปแบบให้อยู่ในมาตรฐาน ISO 8601 (YYYY-MM-DD)",
  },
];
