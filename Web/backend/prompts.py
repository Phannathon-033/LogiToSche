from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
import pathlib
from pathlib import Path
from typing import Any

PROMPT_CONFIG_ENV = "LOGIAI_PROMPT_CONFIG_PATH"
PROMPT_CONFIG_FILENAME = "prompts.json"


def prompt_config_path() -> Path:
    configured = os.environ.get(PROMPT_CONFIG_ENV)
    return Path(configured).expanduser() if configured else Path(__file__).resolve().parent / "config" / PROMPT_CONFIG_FILENAME


def prompt_config_metadata(config: dict[str, Any], version: int = 1) -> dict[str, Any]:
    return {
        "version": str(config.get("version") or f"v{version}"),
        "updated_at": config.get("updated_at") or datetime.now(timezone.utc).isoformat(),
    }


def prompt_config_snapshot(config: dict[str, Any]) -> dict[str, Any]:
    return deepcopy(config)

CORE_FIELDS = (
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
)

MODEL_IDS = {
    "qwen-2.5-1.5b": "Qwen/Qwen2.5-1.5B-Instruct",
    "qwen-2.5-7b": "Qwen/Qwen2.5-7B-Instruct",
    "llama-3.1-8b": "meta-llama/Llama-3.1-8B-Instruct",
}

EXTRACTION_SYSTEM_PROMPT = "You extract logistics document data. Return only valid JSON. Do not include markdown or explanations."
EXTRACTION_RULES = (
    "Return every canonical field in json_schema; use an empty string or 0 when not grounded in OCR.",
    "Put source_file, quantity, vehicle, weight, tax, address, payment, and every non-canonical field inside json_schema.other.",
    "Map invoice, B/L, document, and order numbers to document_number according to context.",
    "Map Bill To, Ship To, Consignee, Buyer, Customer, and Receiver to receiver; map Vendor, Seller, Shipper, Issuer, and From to sender.",
    "Map PO, booking, and related-document identifiers to reference_number when they are not the primary document number.",
    "Normalize dates to YYYY-MM-DD when unambiguous and parse unit_price and total_amount as numbers.",
    "Use confidence values from 0 to 100 and put low-confidence or conflicting values in review_items.",
    "Return only valid JSON with no markdown or explanation.",
)

BASE_DIR = pathlib.Path(__file__).resolve().parent
PRESETS_FILE = BASE_DIR / "prompt_presets.json"

DEFAULT_PROMPT_PRESETS: dict[str, dict[str, Any]] = {
    # 1. Extraction Core Presets
    "kfold_zero_shot": {
        "category": "extraction",
        "categoryLabel": "สกัด 11 ฟิลด์หลัก",
        "badge": "Zero-Shot Benchmark",
        "title": "K-Fold Zero-Shot Extraction (Thesis Benchmark)",
        "description": "แม่แบบสกัด 11 ฟิลด์หลักแบบไม่มีตัวอย่าง (0-shot) สำหรับการประเมินผล 5-Fold Cross Validation บนโมเดล Qwen SLM",
        "prompt": "Extract the 11 canonical logistics fields from the OCR text into JSON: document_type, document_number, document_date (YYYY-MM-DD), sender, receiver, origin, destination, reference_number, unit_price (float), total_amount (float), currency. No explanations. Return strictly valid JSON.",
    },
    "standard_extraction": {
        "category": "extraction",
        "categoryLabel": "สกัด 11 ฟิลด์หลัก",
        "badge": "Core 11 Fields",
        "title": "มาตรฐานสกัด 11 ฟิลด์หลักโลจิสติกส์",
        "description": "สกัดข้อมูลเอกสารเข้าสู่ JSON Schema 11 ฟิลด์หลักอย่างเคร่งครัด แยก sender, receiver, total_amount, document_number ให้สมบูรณ์",
        "prompt": "คุณคือผู้ช่วยดึงข้อมูลโลจิสติกส์จาก OCR text ให้ map ข้อมูลเข้าสู่ JSON schema อย่างเคร่งครัด แยก sender, receiver, total amount และ document number ให้ชัดเจน หากไม่มีข้อมูลให้ใส่ค่าว่างหรือ 0 ห้ามแต่งข้อมูลขึ้นมาเอง",
    },
    "bilingual_thai_en": {
        "category": "extraction",
        "categoryLabel": "สกัด 11 ฟิลด์หลัก",
        "badge": "Bilingual Thai/EN",
        "title": "สกัดเอกสารสองภาษา ไทย-อังกฤษ & แปลง พ.ศ. เป็น ค.ศ.",
        "description": "จัดการเอกสารใบกำกับภาษีไทยและใบขนส่งที่มีทั้งภาษาไทยและอังกฤษ พร้อมแปลงปี พ.ศ. เป็น ค.ศ. (YYYY-MM-DD)",
        "prompt": "สกัดข้อมูลเอกสารสองภาษาไทย-อังกฤษ แยกชื่อผู้ส่งและผู้รับให้ถูกต้องตามนิติบุคคลหลัก พร้อมตรวจสอบปี พ.ศ. หากพบให้แปลงเป็นปี ค.ศ. (YYYY-MM-DD) ตามมาตรฐาน ISO 8601",
    },
    "shipping_bl_ocean": {
        "category": "extraction",
        "categoryLabel": "สกัด 11 ฟิลด์หลัก",
        "badge": "Maritime & Air",
        "title": "สกัดใบตราส่งสินค้าทางเรือ (B/L) และทางอากาศ (AWB)",
        "description": "สกัดข้อมูลเฉพาะทางโลจิสติกส์ เช่น B/L No, Shipper, Consignee, Port of Loading (origin), Port of Discharge (destination)",
        "prompt": "สกัดข้อมูลใบตราส่งสินค้าทางเรือ (Ocean Bill of Lading) และทางอากาศ (Air Waybill) โดย map Port of Loading เป็น origin และ Port of Discharge เป็น destination",
    },
    # 2. Synonym & Disambiguation Presets
    "synonym_party": {
        "category": "synonym",
        "categoryLabel": "ตรวจสอบคำความหมายเดียวกัน",
        "badge": "คู่ค้า & นิติบุคคล",
        "title": "จำแนกชื่อผู้ซื้อ / ผู้ขาย / ผู้รับสินค้า (Buyer, Seller, Consignee)",
        "description": "ตรวจสอบและจัดกลุ่มคำที่มีความหมายเดียวกัน เช่น ผู้ส่ง, Vendor, Shipper, ผู้ขาย เข้ากับ sender และ ผู้รับ, Consignee, Buyer เข้ากับ receiver",
        "prompt": "วิเคราะห์ข้อความ OCR และจำแนกชื่อนิติบุคคลหรือคู่ค้าที่มีความหมายเดียวกัน เช่น ผู้ส่ง/ผู้ขาย/Vendor/Shipper ให้เป็น sender และผู้ซื้อ/ผู้รับสินค้า/Consignee/Buyer ให้เป็น receiver พร้อมระบุว่าชื่อใดควรเป็น receiver หลัก",
    },
    "synonym_doc_no": {
        "category": "synonym",
        "categoryLabel": "ตรวจสอบคำความหมายเดียวกัน",
        "badge": "เลขที่อ้างอิง",
        "title": "จำแนกเลขที่เอกสาร & เลขที่ใบสั่งซื้อ (Invoice No, PO No, Tax ID)",
        "description": "ตรวจสอบคำระบุเลขที่เอกสาร เช่น เลขที่, Tax Inv, Inv No, Reference No, P.O., Purchase Order, AWB No. และจัดคู่ค่าที่ถูกต้องลงในฟิลด์",
        "prompt": "ตรวจสอบคำระบุเลขที่เอกสาร เช่น เลขที่, Tax Inv, Inv No, Reference No, P.O., Purchase Order, Tax ID และจัดคู่ค่าที่ถูกต้องลงในฟิลด์ 11 ฟิลด์หลักและ other",
    },
    "synonym_vehicle": {
        "category": "synonym",
        "categoryLabel": "ตรวจสอบคำความหมายเดียวกัน",
        "badge": "ยานพาหนะขนส่ง",
        "title": "ตรวจสอบทะเบียนรถ / ตู้คอนเทนเนอร์ (Truck Plate, Container No)",
        "description": "ตรวจสอบคำระบุข้อมูลยานพาหนะ เช่น ทะเบียนรถ, รถบรรทุก, ทะเบียนหัวลาก, Container No, Car Plate, Truck No. และสกัดค่าที่แท้จริง",
        "prompt": "ตรวจสอบคำระบุข้อมูลยานพาหนะและการขนส่ง เช่น ทะเบียนรถ, ทะเบียนหัวลาก, หมายเลขตู้คอนเทนเนอร์ (Container No.), ชื่อเรือ (Vessel) หรือทะเบียนรถส่งของ แล้วสรุปค่าที่พบ",
    },
    # 3. Summarization Presets
    "summarize_short": {
        "category": "summary",
        "categoryLabel": "วิเคราะห์ & สรุปกระชับ",
        "badge": "สรุป 1 ประโยค",
        "title": "สรุปใจความสำคัญของเอกสารให้สั้นกระชับใน 1-2 ประโยค",
        "description": "วิเคราะห์เนื้อหาเอกสารทั้งหมดและย่อความให้เหลือเพียง 1-2 ประโยคสั้นๆ เพื่อให้เจ้าหน้าที่หรือผู้บริหารเข้าใจได้ทันที",
        "prompt": "สรุปเนื้อหาหลักของเอกสารนี้ให้เหลือเพียง 1-2 ประโยคสั้นๆ กระชับ ระบุว่าใครส่งอะไรให้ใคร ยอดเงินเท่าไหร่ เพื่อใช้อ่านสรุปและส่งต่อให้ทีมงานอย่างรวดเร็ว",
    },
    "summarize_goods": {
        "category": "summary",
        "categoryLabel": "วิเคราะห์ & สรุปกระชับ",
        "badge": "รายการสินค้า",
        "title": "สรุปรายการสินค้า ปริมาณ และราคารวมแบบกระชับ",
        "description": "ดึงเฉพาะรายการสินค้าหลัก, จำนวน (Quantity), หน่วยนับ และราคารวมออกมาสรุปเป็นข้อความสั้นๆ",
        "prompt": "สรุปเฉพาะรายการสินค้าหลัก, จำนวน (Quantity), หน่วยนับ และราคารวมในรูปแบบตารางย่อหรือสรุปข้อความ 2-3 บรรทัดที่เข้าใจง่าย",
    },
    "summarize_payment_terms": {
        "category": "summary",
        "categoryLabel": "วิเคราะห์ & สรุปกระชับ",
        "badge": "เงื่อนไขชำระเงิน",
        "title": "สรุปเงื่อนไขการชำระเงินและข้อกำหนดการส่ง (Payment & Incoterms)",
        "description": "วิเคราะห์เงื่อนไขเครดิตเทอม วันครบกำหนดชำระ เลขที่บัญชีธนาคาร และเงื่อนไขการส่งสินค้า (Incoterms)",
        "prompt": "วิเคราะห์และสรุปเงื่อนไขการชำระเงิน (Credit Term, Due Date, Bank Account) และเงื่อนไขการจัดส่ง (Incoterms เช่น FOB, CIF, Door-to-Door) ให้กระชับเข้าใจง่าย",
    },
    # 4. Validation Presets
    "validate_numbers": {
        "category": "validation",
        "categoryLabel": "ตรวจสอบความถูกต้อง",
        "badge": "ตรวจสอบตัวเลข",
        "title": "ตรวจสอบความสอดคล้องของผลรวมเงิน (Subtotal + VAT = Total)",
        "description": "ตรวจสอบตัวเลขว่ายอดก่อนภาษี รวมกับ VAT 7% แล้วเท่ากับ Total Amount สุทธิหรือไม่ และแจ้งเตือนหากมีส่วนต่าง",
        "prompt": "ตรวจสอบตัวเลขในเอกสารว่า Subtotal (ยอดก่อนภาษี), VAT (ภาษีมูลค่าเพิ่ม) และ Total Amount (ยอดสุทธิ) คำนวณถูกต้องตามหลักคณิตศาสตร์หรือไม่ และแจ้งหากพบข้อผิดพลาด",
    },
    "validate_core_fields": {
        "category": "validation",
        "categoryLabel": "ตรวจสอบความถูกต้อง",
        "badge": "ความสมบูรณ์ของฟิลด์",
        "title": "ตรวจสอบความครบถ้วนของ 11 ฟิลด์หลัก (Core 11 Fields Quality Check)",
        "description": "ตรวจสอบว่าเอกสารนี้มีข้อมูลครบทั้ง 11 ฟิลด์หลักหรือไม่ และแนะนำข้อความใน OCR ที่สามารถนำมาเติมในฟิลด์ที่ขาดได้",
        "prompt": "ตรวจสอบว่าเอกสารนี้มีข้อมูลครบทั้ง 11 ฟิลด์หลักหรือไม่ (document_type, document_number, document_date, sender, receiver, origin, destination, reference_number, unit_price, total_amount, currency) หากฟิลด์ไหนขาดหายไป ให้แนะนำข้อความที่น่าจะเป็นไปได้จาก OCR Text",
    },
    # 5. Translation & Normalization
    "translate_format": {
        "category": "translation",
        "categoryLabel": "แปลภาษา & จัดรูปแบบ",
        "badge": "แปลภาษาไทย-อังกฤษ",
        "title": "แปลชื่อบริษัท รายการสินค้า และปรับรูปแบบวันที่สากล",
        "description": "แปลข้อมูลภาษาอังกฤษเป็นภาษาไทยที่ถูกต้องตามศัพท์โลจิสติกส์ พร้อมแปลงวันที่เป็นรูปแบบ ISO 8601",
        "prompt": "แปลชื่อบริษัท, ที่อยู่ และรายการสินค้าในเอกสารจากภาษาอังกฤษเป็นภาษาไทยที่ถูกต้องตามศัพท์โลจิสติกส์ พร้อมแปลงวันที่ทุกรูปแบบให้อยู่ในมาตรฐาน ISO 8601 (YYYY-MM-DD)",
    },
}

PROMPT_PRESETS = DEFAULT_PROMPT_PRESETS


def load_prompt_presets() -> dict[str, dict[str, Any]]:
    if PRESETS_FILE.exists():
        try:
            data = json.loads(PRESETS_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict) and len(data) > 0:
                return data
        except Exception:
            pass
    # Initialize presets file with defaults
    save_prompt_presets(DEFAULT_PROMPT_PRESETS)
    return deepcopy(DEFAULT_PROMPT_PRESETS)


def save_prompt_presets(presets: dict[str, dict[str, Any]]) -> None:
    PRESETS_FILE.write_text(json.dumps(presets, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def reset_prompt_presets() -> dict[str, dict[str, Any]]:
    save_prompt_presets(DEFAULT_PROMPT_PRESETS)
    return deepcopy(DEFAULT_PROMPT_PRESETS)


DEFAULT_ADMIN_CONFIG = {
    "system_prompt": "คุณคือผู้ช่วยดึงข้อมูลโลจิสติกส์จาก OCR text ให้ map ข้อมูลเข้าสู่ JSON schema อย่างเคร่งครัด แยก sender, receiver, total amount และ document number ให้ชัดเจน พร้อมระบุ field ที่ไม่มั่นใจลง review_items",
    "fallback_rules": [
        "ถ้าเจอทั้ง Subtotal และ Total Amount ให้เลือก Total Amount",
        "Consignee, Ship To, Deliver To ให้ตีความเป็น receiver ตามบริบทเอกสาร",
        "วันที่ต้อง normalize เป็น YYYY-MM-DD ถ้าตีความได้ชัดเจน",
    ],
    "confidence_threshold": 85,
    "selected_model": "qwen-2.5-1.5b",
    "monitored_fields": ["document_number", "document_date", "receiver", "total_amount"],
}


def default_admin_config() -> dict[str, Any]:
    return deepcopy(DEFAULT_ADMIN_CONFIG)


def load_prompt_config() -> dict[str, Any]:
    path = prompt_config_path()
    if not path.exists():
        config = default_admin_config()
        config.update(prompt_config_metadata(config))
        return config
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Prompt configuration must be a JSON object")
    config = default_admin_config()
    config.update(data)
    config.update(prompt_config_metadata(config))
    return config


def save_prompt_config(config: dict[str, Any]) -> dict[str, Any]:
    path = prompt_config_path()
    current = load_prompt_config()
    try:
        current_version = 0 if not path.exists() else int(str(current.get("version", "v0")).lstrip("v"))
    except ValueError:
        current_version = 0
    saved = default_admin_config()
    saved.update(config)
    saved["version"] = f"v{current_version + 1}"
    saved["updated_at"] = datetime.now(timezone.utc).isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(saved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    return deepcopy(saved)


def prompt_preset_list() -> list[dict[str, Any]]:
    presets = load_prompt_presets()
    return [{"id": preset_id, **deepcopy(preset)} for preset_id, preset in presets.items()]


def prompt_for_preset(preset_id: str) -> str:
    presets = load_prompt_presets()
    preset = presets.get(preset_id)
    return str(preset["prompt"]) if preset else ""
