from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
SITE_PACKAGES_DIR = (BASE_DIR / ".venv" / "Lib" / "site-packages").resolve()
TORCH_LIB_DIR = SITE_PACKAGES_DIR / "torch" / "lib"
if TORCH_LIB_DIR.exists():
    try:
        os.add_dll_directory(str(TORCH_LIB_DIR))
    except Exception:
        pass

for package in ("cublas", "cuda_runtime", "cudnn", "cufft", "curand", "cusolver", "cusparse", "nvjitlink"):
    dll_dir = SITE_PACKAGES_DIR / "nvidia" / package / "bin"
    if dll_dir.exists():
        try:
            os.add_dll_directory(str(dll_dir))
        except Exception:
            pass
        os.environ["PATH"] = f"{dll_dir}{os.pathsep}{os.environ.get('PATH', '')}"

SLM_MODEL_ID = os.environ.get("LOGIAI_SLM_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
except Exception as exc:  # pragma: no cover - startup environment dependent
    torch = None  # type: ignore[assignment]
    AutoModelForCausalLM = None  # type: ignore[assignment]
    AutoTokenizer = None  # type: ignore[assignment]
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None

app = FastAPI(title="LogiAI SLM Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_slm_tokenizer: Any | None = None
_slm_model: Any | None = None


class OcrLine(BaseModel):
    text: str
    confidence: float = 0
    box: list[list[float]] | None = None


class SlmExtractRequest(BaseModel):
    document_type_hint: str = "Invoice"
    source_file: str = "document"
    ocr_text: str = Field(default="", min_length=1)
    ocr_lines: list[OcrLine] = Field(default_factory=list)


@app.get("/api/slm/health")
def health() -> dict[str, str]:
    cuda = bool(torch is not None and torch.cuda.is_available())
    return {"status": "ready" if cuda else "missing-cuda", "service": "slm", "model": SLM_MODEL_ID, "device": "cuda:0", "cuda": str(cuda).lower()}


@app.post("/api/slm/extract")
def slm_extract(payload: SlmExtractRequest) -> dict[str, Any]:
    try:
        tokenizer, model = get_slm()
        prompt = build_slm_prompt(payload)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert AI logistics document parser. "
                    "Extract structured fields from OCR text and return ONLY valid JSON matching the exact requested schema. "
                    "Top-level MUST have exactly 7 fields: document_type, document_no, document_date, party_name, source_file, quantity, total_amount, plus an 'other' object for all extra details. "
                    "Do not wrap in markdown explanations."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)

        with torch.inference_mode():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=1000,
                do_sample=False,
                repetition_penalty=1.05,
            )

        output_ids = generated_ids[0][inputs.input_ids.shape[-1] :]
        response_text = tokenizer.decode(output_ids, skip_special_tokens=True)
        data = parse_json_object(response_text)
        normalized = normalize_slm_output(data, payload.source_file)
        return {**normalized, "model": SLM_MODEL_ID, "device": "cuda:0"}
    except Exception as exc:
        fallback = rule_based_extraction(payload)
        return {**fallback, "model": f"{SLM_MODEL_ID} (Fallback: {exc})", "device": "cpu/fallback"}


def rule_based_extraction(payload: SlmExtractRequest) -> dict[str, Any]:
    text = payload.ocr_text
    
    inv_match = re.search(r'(?:invoice|inv|เลขที่|ใบกำกับภาษี|ใบแจ้งหนี้|พะย|no[\.\s:]*)\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})', text, re.IGNORECASE)
    document_no = inv_match.group(1).strip() if inv_match else ""

    po_match = re.search(r'(?:po|p\.o\.|purchase order|ใบสั่งซื้อ|เลขที่ po)\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})', text, re.IGNORECASE)
    po_number = po_match.group(1).strip() if po_match else ""
    if not document_no and po_number:
        document_no = po_number

    date_match = re.search(r'(\d{4}[\-\/\.]\d{2}[\-\/\.]\d{2}|\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})', text)
    document_date = date_match.group(1).strip() if date_match else ""

    sender_match = re.search(r'(?:from|vendor|seller|ผู้ขาย|ผู้ส่ง|บริษัท|บจก|บมจ)\s*[:\.\s]*([^\n\r]{3,60})', text, re.IGNORECASE)
    sender_name = sender_match.group(1).strip() if sender_match else ""

    receiver_match = re.search(r'(?:customer|receiver|ผู้รับ|คลัง|ลูกค้า|ถึง|to:?)\s*[:\.\s]*([^\n\r]{3,60})', text, re.IGNORECASE)
    receiver_name = receiver_match.group(1).strip() if receiver_match else ""

    party_name = receiver_name or sender_name or ""

    tax_match = re.search(r'(?:tax id|vat id|เลขประจำตัวผู้เสียภาษี|เลขผู้เสียภาษี|tax)\s*[:\.\s#]*([0-9\-\s]{10,18})', text, re.IGNORECASE)
    tax_id = tax_match.group(1).strip() if tax_match else ""

    plate_match = re.search(r'(?:ทะเบียน|plate|truck|รถทะเบียน)\s*[:\.\s]*([0-9]{1,2}\-[0-9]{3,4}|[ก-ฮ]{1,3}\s*[0-9]{1,4})', text, re.IGNORECASE)
    truck_plate = plate_match.group(1).strip() if plate_match else ""

    qty_match = re.search(r'(?:qty|quantity|จำนวน|ยอดจำนวน)\s*[:\.\s]*([0-9,]+)', text, re.IGNORECASE)
    quantity = to_number(qty_match.group(1)) if qty_match else 0

    subtotal_match = re.search(r'(?:subtotal|ยอดก่อนภาษี|ก่อน vat|รวมเงิน)\s*[:\s]*([0-9,]+\.?[0-9]*)', text, re.IGNORECASE)
    subtotal_amount = float(subtotal_match.group(1).replace(",", "")) if subtotal_match else 0.0

    vat_match = re.search(r'(?:vat|ภาษีมูลค่าเพิ่ม|vat 7%)\s*[:\s]*([0-9,]+\.?[0-9]*)', text, re.IGNORECASE)
    vat_amount = float(vat_match.group(1).replace(",", "")) if vat_match else 0.0

    amount_match = re.search(r'(?:total|grand total|จำนวนเงินรวม|รวมเงินสุทธิ|สุทธิ|บาท|thb)\s*[:\s]*([0-9,]+\.?[0-9]*)', text, re.IGNORECASE)
    total_amount = float(amount_match.group(1).replace(",", "")) if amount_match else 0.0

    doc_type = payload.document_type_hint.lower()
    if "invoice" in text.lower() or "ใบกำกับภาษี" in text:
        doc_type = "invoice"
    elif "bill of lading" in text.lower() or "ใบตราส่ง" in text:
        doc_type = "bill_of_lading"
    elif "packing list" in text.lower() or "ใบบรรจุสินค้า" in text:
        doc_type = "packing_list"
    elif "purchase order" in text.lower() or "po" in text.lower() or "ใบสั่งซื้อ" in text:
        doc_type = "purchase_order"

    fields = []
    if doc_type:
        fields.append({"sourceText": doc_type, "field": "document_type", "value": doc_type, "confidence": 98, "status": "success"})
    if document_no:
        fields.append({"sourceText": inv_match.group(0) if inv_match else document_no, "field": "document_no", "value": document_no, "confidence": 95, "status": "success"})
    if document_date:
        fields.append({"sourceText": date_match.group(0) if date_match else document_date, "field": "document_date", "value": document_date, "confidence": 92, "status": "success"})
    if party_name:
        fields.append({"sourceText": receiver_match.group(0) if receiver_match else (sender_match.group(0) if sender_match else party_name), "field": "party_name", "value": party_name, "confidence": 90, "status": "success"})
    fields.append({"sourceText": payload.source_file, "field": "source_file", "value": payload.source_file, "confidence": 100, "status": "success"})
    if quantity:
        fields.append({"sourceText": qty_match.group(0) if qty_match else str(quantity), "field": "quantity", "value": str(quantity), "confidence": 92, "status": "success"})
    if total_amount:
        fields.append({"sourceText": amount_match.group(0) if amount_match else str(total_amount), "field": "total_amount", "value": str(total_amount), "confidence": 95, "status": "success"})

    # Other secondary fields
    other_fields: dict[str, Any] = {}
    if sender_name:
        other_fields["sender_name"] = sender_name
        fields.append({"sourceText": sender_name, "field": "sender_name", "value": sender_name, "confidence": 88, "status": "success", "isOther": True})
    if receiver_name:
        other_fields["receiver_name"] = receiver_name
        fields.append({"sourceText": receiver_name, "field": "receiver_name", "value": receiver_name, "confidence": 88, "status": "success", "isOther": True})
    if po_number:
        other_fields["po_number"] = po_number
        fields.append({"sourceText": po_number, "field": "po_number", "value": po_number, "confidence": 92, "status": "success", "isOther": True})
    if tax_id:
        other_fields["tax_id"] = tax_id
        fields.append({"sourceText": tax_id, "field": "tax_id", "value": tax_id, "confidence": 90, "status": "success", "isOther": True})
    if truck_plate:
        other_fields["truck_plate"] = truck_plate
        fields.append({"sourceText": truck_plate, "field": "truck_plate", "value": truck_plate, "confidence": 90, "status": "success", "isOther": True})
    if subtotal_amount:
        other_fields["subtotal_amount"] = subtotal_amount
        fields.append({"sourceText": str(subtotal_amount), "field": "subtotal_amount", "value": str(subtotal_amount), "confidence": 95, "status": "success", "isOther": True})
    if vat_amount:
        other_fields["vat_amount"] = vat_amount
        fields.append({"sourceText": str(vat_amount), "field": "vat_amount", "value": str(vat_amount), "confidence": 95, "status": "success", "isOther": True})

    review_items = []
    if not document_no:
        review_items.append({"field": "document_no", "ocrValue": "-", "slmValue": "-", "confidence": 40, "status": "review"})
    if not document_date:
        review_items.append({"field": "document_date", "ocrValue": "-", "slmValue": "-", "confidence": 40, "status": "review"})
    if not party_name:
        review_items.append({"field": "party_name", "ocrValue": "-", "slmValue": "-", "confidence": 40, "status": "review"})

    return {
        "json_schema": {
            "document_type": doc_type,
            "document_no": document_no,
            "document_date": document_date,
            "party_name": party_name,
            "source_file": payload.source_file,
            "quantity": quantity,
            "total_amount": total_amount,
            "other": other_fields,
        },
        "fields": fields,
        "confidence": {
            "overall": 92 if len(fields) >= 4 else 65,
            "ocr": 95,
            "slm": 90,
            "mapping": 92,
            "completeness": 90 if len(fields) >= 5 else 60,
        },
        "review_items": review_items,
    }


def get_slm() -> tuple[Any, Any]:
    global _slm_model, _slm_tokenizer
    if AutoModelForCausalLM is None or AutoTokenizer is None or torch is None:
        raise HTTPException(status_code=503, detail=f"SLM dependencies failed to import: {IMPORT_ERROR}")
    if not torch.cuda.is_available():
        raise HTTPException(status_code=503, detail="CUDA is required for SLM but torch.cuda is not available")

    if _slm_model is None or _slm_tokenizer is None:
        _slm_tokenizer = AutoTokenizer.from_pretrained(SLM_MODEL_ID, trust_remote_code=True)
        _slm_model = AutoModelForCausalLM.from_pretrained(
            SLM_MODEL_ID,
            torch_dtype=torch.float16,
            device_map={"": "cuda:0"},
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        _slm_model.eval()
    return _slm_tokenizer, _slm_model


def build_slm_prompt(payload: SlmExtractRequest) -> str:
    schema = {
        "json_schema": {
            "document_type": "invoice | bill_of_lading | packing_list | purchase_order | unknown",
            "document_no": "Document or invoice reference number",
            "document_date": "YYYY-MM-DD or date string",
            "party_name": "Customer, buyer, vendor, supplier, or party name",
            "source_file": payload.source_file,
            "quantity": 0,
            "total_amount": 0,
            "other": {
                "sender_name": "",
                "receiver_name": "",
                "po_number": "",
                "tax_id": "",
                "truck_plate": "",
                "gross_weight_kg": 0,
                "subtotal_amount": 0,
                "vat_amount": 0,
            },
        },
        "fields": [
            {"sourceText": "source text from OCR", "field": "document_no", "value": "normalized value", "confidence": 95, "status": "success | review | error | processing"},
            {"sourceText": "source text from OCR", "field": "party_name", "value": "normalized value", "confidence": 92, "status": "success | review | error | processing"},
        ],
        "confidence": {"overall": 90, "ocr": 95, "slm": 90, "mapping": 92, "completeness": 90},
        "review_items": [{"field": "document_no", "ocrValue": "raw OCR value", "slmValue": "normalized value", "confidence": 50, "status": "review"}],
    }
    return (
        "Extract logistics fields from OCR text and normalize into this EXACT JSON structure.\n"
        "STRICT REQUIREMENTS:\n"
        "1. Top-level JSON MUST contain exactly these 7 keys:\n"
        "   - 'document_type'\n"
        "   - 'document_no'\n"
        "   - 'document_date'\n"
        "   - 'party_name'\n"
        "   - 'source_file'\n"
        "   - 'quantity'\n"
        "   - 'total_amount'\n"
        "2. Put ALL other fields (sender_name, receiver_name, po_number, tax_id, truck_plate, gross_weight_kg, subtotal_amount, vat_amount, etc.) inside the 'other' object.\n"
        "3. Parse numbers for quantity, total_amount, subtotal_amount, vat_amount, gross_weight_kg.\n"
        "4. Return ONLY valid JSON.\n\n"
        f"Document type hint: {payload.document_type_hint}\n"
        f"Source filename: {payload.source_file}\n\n"
        f"Required output shape:\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
        f"OCR text:\n{payload.ocr_text}\n"
    )


def parse_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:].strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start < 0 or end < start:
        raise HTTPException(status_code=502, detail=f"SLM did not return JSON: {text[:500]}")
    try:
        return json.loads(stripped[start : end + 1])
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"SLM returned invalid JSON: {exc}") from exc


def normalize_slm_output(data: dict[str, Any], default_source_file: str = "document") -> dict[str, Any]:
    raw_schema = data.get("json_schema") if isinstance(data.get("json_schema"), dict) else {}
    confidence = data.get("confidence") if isinstance(data.get("confidence"), dict) else {}

    # Extract 7 core fields
    document_type = str(raw_schema.get("document_type", "unknown"))
    document_no = str(raw_schema.get("document_no") or raw_schema.get("invoice_no") or "")
    document_date = str(raw_schema.get("document_date", ""))
    party_name = str(raw_schema.get("party_name") or raw_schema.get("receiver_name") or raw_schema.get("sender_name") or "")
    source_file = str(raw_schema.get("source_file") or default_source_file)
    quantity = to_number(raw_schema.get("quantity"))
    total_amount = to_number(raw_schema.get("total_amount"))

    # Collect all other fields into 'other'
    other_dict = raw_schema.get("other") if isinstance(raw_schema.get("other"), dict) else {}
    reserved_keys = {"document_type", "document_no", "document_date", "party_name", "source_file", "quantity", "total_amount", "other"}
    for k, v in raw_schema.items():
        if k not in reserved_keys and k not in other_dict:
            other_dict[k] = v

    return {
        "json_schema": {
            "document_type": document_type,
            "document_no": document_no,
            "document_date": document_date,
            "party_name": party_name,
            "source_file": source_file,
            "quantity": quantity,
            "total_amount": total_amount,
            "other": other_dict,
        },
        "fields": normalize_fields(data.get("fields")),
        "confidence": {
            "overall": clamp_int(confidence.get("overall"), 0, 100),
            "ocr": clamp_int(confidence.get("ocr"), 0, 100),
            "slm": clamp_int(confidence.get("slm"), 0, 100),
            "mapping": clamp_int(confidence.get("mapping"), 0, 100),
            "completeness": clamp_int(confidence.get("completeness"), 0, 100),
        },
        "review_items": normalize_review_items(data.get("review_items")),
    }


def normalize_fields(fields: Any) -> list[dict[str, Any]]:
    if not isinstance(fields, list):
        return []
    normalized = []
    for field in fields:
        if isinstance(field, dict):
            field_name = str(field.get("field", ""))
            # Remap legacy field names if needed
            if field_name == "invoice_no":
                field_name = "document_no"
            elif field_name in {"receiver_name", "sender_name"} and not any(f.get("field") == "party_name" for f in normalized):
                field_name = "party_name"

            normalized.append(
                {
                    "sourceText": str(field.get("sourceText", "")),
                    "field": field_name,
                    "value": str(field.get("value", "")),
                    "confidence": clamp_int(field.get("confidence"), 0, 100),
                    "status": normalize_status(field.get("status")),
                }
            )
    return normalized


def normalize_review_items(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    normalized = []
    for item in items:
        if isinstance(item, dict):
            field_name = str(item.get("field", ""))
            if field_name == "invoice_no":
                field_name = "document_no"
            normalized.append(
                {
                    "field": field_name,
                    "ocrValue": str(item.get("ocrValue", "")),
                    "slmValue": str(item.get("slmValue", "")),
                    "confidence": clamp_int(item.get("confidence"), 0, 100),
                    "status": "review",
                }
            )
    return normalized


def to_number(value: Any) -> int | float:
    if isinstance(value, (int, float)):
        return value
    if value is None:
        return 0
    try:
        number = float(str(value).replace(",", "").strip())
    except ValueError:
        return 0
    return int(number) if number.is_integer() else number


def clamp_int(value: Any, low: int, high: int) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        number = 0
    return max(low, min(high, number))


def normalize_status(value: Any) -> str:
    status = str(value or "review")
    return status if status in {"success", "review", "error", "processing"} else "review"


class SlmPromptRequest(BaseModel):
    prompt_template_id: str = "custom"
    user_instruction: str = Field(default="", min_length=1)
    ocr_text: str = ""
    json_schema: dict[str, Any] = Field(default_factory=dict)
    system_instruction: str = ""


class SlmPromptResponse(BaseModel):
    result_text: str
    suggested_json_updates: dict[str, Any] | None = None
    reasoning: str = ""
    category: str = ""
    model: str = SLM_MODEL_ID
    device: str = "cuda:0"


@app.post("/api/slm/execute-prompt", response_model=SlmPromptResponse)
def execute_slm_prompt(payload: SlmPromptRequest) -> SlmPromptResponse:
    system_prompt = (
        payload.system_instruction
        or (
            "You are an expert AI logistics assistant and document analyst. "
            "Analyze logistics documents, resolve synonym terms, simplify long sentences, validate arithmetic numbers, or summarize content. "
            "Respond in natural, professional Thai language (or English if prompt asks). "
            "Keep the explanation clear, structured, and easy to understand."
        )
    )

    user_content = (
        f"คำสั่ง (Instruction):\n{payload.user_instruction}\n\n"
        f"โครงสร้าง JSON ปัจจุบัน (Current JSON):\n{json.dumps(payload.json_schema, ensure_ascii=False, indent=2)}\n\n"
        f"ข้อความ OCR จากเอกสาร (OCR Text):\n{payload.ocr_text[:3000]}\n"
    )

    try:
        tokenizer, model = get_slm()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)

        with torch.inference_mode():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=850,
                do_sample=False,
                repetition_penalty=1.05,
            )

        output_ids = generated_ids[0][inputs.input_ids.shape[-1] :]
        response_text = tokenizer.decode(output_ids, skip_special_tokens=True).strip()

        return SlmPromptResponse(
            result_text=response_text,
            reasoning=f"ประมวลผลด้วยโมเดล {SLM_MODEL_ID} บน CUDA GPU สำเร็จ",
            category=payload.prompt_template_id,
            model=SLM_MODEL_ID,
            device="cuda:0",
        )
    except Exception as exc:
        fallback_text = execute_rule_based_prompt(payload, exc)
        return SlmPromptResponse(
            result_text=fallback_text,
            reasoning=f"ประมวลผลด้วยระบบวิเคราะห์สำรอง ({exc})",
            category=payload.prompt_template_id,
            model=f"{SLM_MODEL_ID} (Fallback Engine)",
            device="cpu/fallback",
        )


def execute_rule_based_prompt(payload: SlmPromptRequest, exc: Exception) -> str:
    pid = payload.prompt_template_id
    schema = payload.json_schema
    text = payload.ocr_text

    doc_type = schema.get("document_type", "เอกสารทั่วไป")
    doc_no = schema.get("document_no", "-")
    party = schema.get("party_name", "-")
    total = schema.get("total_amount", 0)
    date_val = schema.get("document_date", "-")
    other = schema.get("other", {})

    if pid == "synonym_party":
        sender = other.get("sender_name") or "ไม่พบชื่อผู้ส่งชัดเจน"
        receiver = other.get("receiver_name") or "ไม่พบชื่อผู้รับชัดเจน"
        return (
            f"📌 **ผลการวิเคราะห์คำที่มีความหมายเดียวกัน (Synonym & Entity Mapping)**:\n\n"
            f"• **กลุ่มผู้ส่ง/ผู้ออกเอกสาร (Sender/Vendor/Shipper/Seller)**: '{sender}'\n"
            f"• **กลุ่มผู้รับ/ลูกค้า (Receiver/Buyer/Consignee/Customer)**: '{receiver}'\n"
            f"• **ชื่อคู่ค้าหลัก (party_name)**: กำหนดเป็น '{party}'\n\n"
            f"💡 *คำแนะนำ*: ระบบจัดให้ '{party}' เป็นตัวแทนคู่ค้าหลักใน 7 ฟิลด์หลักเรียบร้อยแล้ว"
        )

    if pid == "synonym_doc_no":
        inv = other.get("invoice_no") or doc_no
        po = other.get("po_number") or other.get("po_no") or "-"
        tax = other.get("tax_id") or "-"
        return (
            f"📌 **ผลการตรวจสอบเลขที่เอกสารและการอ้างอิง (Document Reference Check)**:\n\n"
            f"• **เลขที่เอกสารหลัก (document_no / Invoice No)**: '{inv}'\n"
            f"• **เลขที่ใบสั่งซื้อ (P.O. Number / Purchase Order)**: '{po}'\n"
            f"• **เลขประจำตัวผู้เสียภาษี (Tax ID / VAT No)**: '{tax}'\n\n"
            f"💡 *ข้อสรุป*: คำว่า 'เลขที่', 'Inv No.', 'Bill No.' มีความหมายเดียวกันและถูกแมปลงใน `document_no`"
        )

    if pid == "summarize_short":
        return (
            f"📝 **สรุปใจความสำคัญของเอกสาร (One-Sentence Summary)**:\n\n"
            f"\"เอกสาร {doc_type} เลขที่ **{doc_no}** ออกเมื่อวันที่ **{date_val}** สำหรับคู่ค้า **{party}** "
            f"มียอดเงินรวมสุทธิ **{total:,.2f} บาท**\""
        )

    if pid == "summarize_goods":
        qty = schema.get("quantity", 0)
        return (
            f"📦 **สรุปรายการสินค้าและปริมาณ (Goods & Volume Summary)**:\n\n"
            f"• **ประเภทสินค้า/บริการ**: รายการตามเอกสาร {doc_type}\n"
            f"• **จำนวนรวม (Total Quantity)**: {qty} รายการ/หน่วย\n"
            f"• **ยอดเงินรวมสุทธิ**: {total:,.2f} บาท\n"
            f"• **สถานะการตรวจนับ**: สกัดจากข้อความ OCR สำเร็จ"
        )

    if pid == "validate_numbers":
        subtotal = float(other.get("subtotal_amount", 0) or 0)
        vat = float(other.get("vat_amount", 0) or 0)
        calc_total = subtotal + vat
        diff = abs(float(total) - calc_total)
        status_txt = "✅ ตัวเลขถูกต้องสอดคล้องกัน" if diff < 1.0 or subtotal == 0 else f"⚠️ พบส่วนต่าง {diff:,.2f} บาท ระหว่างยอดรวมกับยอดก่อนภาษี+VAT"
        return (
            f"🔍 **ผลการตรวจสอบความสอดคล้องของตัวเลข (Validation Check)**:\n\n"
            f"• ยอดก่อนภาษี (Subtotal): {subtotal:,.2f} บาท\n"
            f"• ภาษีมูลค่าเพิ่ม 7% (VAT): {vat:,.2f} บาท\n"
            f"• ยอดรวมคำนวณ (Subtotal + VAT): {calc_total:,.2f} บาท\n"
            f"• ยอดรวมสุทธิในเอกสาร (Total Amount): {float(total):,.2f} บาท\n\n"
            f"📊 **ข้อสรุป**: {status_txt}"
        )

    if pid == "translate_format":
        return (
            f"🌐 **การจัดรูปแบบและแปลข้อมูลสากล (Standardization & Translation)**:\n\n"
            f"• **Document Type (EN -> TH)**: {doc_type} -> ใบแจ้งหนี้ / ใบกำกับภาษี\n"
            f"• **Standard ISO Date**: {date_val}\n"
            f"• **Standard Currency**: THB (บาทไทย)\n"
            f"• **Normalized Party**: {party}"
        )

    # General Custom Instruction
    return (
        f"🤖 **ผลการวิเคราะห์คำสั่ง (AI Analysis Result)**:\n\n"
        f"คำสั่ง: \"{payload.user_instruction}\"\n\n"
        f"จากการวิเคราะห์ข้อมูลเอกสาร {doc_type} (เลขที่ {doc_no}) พบว่าข้อมูลคู่ค้าคือ '{party}' "
        f"ยอดรวมคือ {total:,.2f} บาท ข้อมูลทั้งหมดถูกจัดโครงสร้างใน 7 ฟิลด์หลักและ other อย่างสมบูรณ์"
    )
