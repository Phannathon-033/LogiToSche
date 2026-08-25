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
                    "Do not wrap in markdown or add commentary."
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
        normalized = normalize_slm_output(data)
        return {**normalized, "model": SLM_MODEL_ID, "device": "cuda:0"}
    except Exception as exc:
        fallback = rule_based_extraction(payload)
        return {**fallback, "model": f"{SLM_MODEL_ID} (Fallback: {exc})", "device": "cpu/fallback"}


def rule_based_extraction(payload: SlmExtractRequest) -> dict[str, Any]:
    text = payload.ocr_text
    
    inv_match = re.search(r'(?:invoice|inv|เลขที่|ใบกำกับภาษี|ใบแจ้งหนี้|พะย|no[\.\s:]*)\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})', text, re.IGNORECASE)
    invoice_no = inv_match.group(1).strip() if inv_match else ""

    po_match = re.search(r'(?:po|p\.o\.|purchase order|ใบสั่งซื้อ|เลขที่ po)\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})', text, re.IGNORECASE)
    po_number = po_match.group(1).strip() if po_match else ""

    date_match = re.search(r'(\d{4}[\-\/\.]\d{2}[\-\/\.]\d{2}|\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})', text)
    document_date = date_match.group(1).strip() if date_match else ""

    sender_match = re.search(r'(?:from|vendor|seller|ผู้ขาย|ผู้ส่ง|บริษัท|บจก|บมจ)\s*[:\.\s]*([^\n\r]{3,60})', text, re.IGNORECASE)
    sender_name = sender_match.group(1).strip() if sender_match else ""

    receiver_match = re.search(r'(?:customer|receiver|ผู้รับ|คลัง|ลูกค้า|ถึง|to:?)\s*[:\.\s]*([^\n\r]{3,60})', text, re.IGNORECASE)
    receiver_name = receiver_match.group(1).strip() if receiver_match else ""

    tax_match = re.search(r'(?:tax id|vat id|เลขประจำตัวผู้เสียภาษี|เลขผู้เสียภาษี|tax)\s*[:\.\s#]*([0-9\-\s]{10,18})', text, re.IGNORECASE)
    tax_id = tax_match.group(1).strip() if tax_match else ""

    plate_match = re.search(r'(?:ทะเบียน|plate|truck|รถทะเบียน)\s*[:\.\s]*([0-9]{1,2}\-[0-9]{3,4}|[ก-ฮ]{1,3}\s*[0-9]{1,4})', text, re.IGNORECASE)
    truck_plate = plate_match.group(1).strip() if plate_match else ""

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
    if invoice_no:
        fields.append({"sourceText": inv_match.group(0) if inv_match else invoice_no, "field": "invoice_no", "value": invoice_no, "confidence": 95, "status": "success"})
    if po_number:
        fields.append({"sourceText": po_match.group(0) if po_match else po_number, "field": "po_number", "value": po_number, "confidence": 92, "status": "success"})
    if document_date:
        fields.append({"sourceText": date_match.group(0) if date_match else document_date, "field": "document_date", "value": document_date, "confidence": 92, "status": "success"})
    if sender_name:
        fields.append({"sourceText": sender_match.group(0) if sender_match else sender_name, "field": "sender_name", "value": sender_name, "confidence": 88, "status": "success"})
    if receiver_name:
        fields.append({"sourceText": receiver_match.group(0) if receiver_match else receiver_name, "field": "receiver_name", "value": receiver_name, "confidence": 88, "status": "success"})
    if tax_id:
        fields.append({"sourceText": tax_match.group(0) if tax_match else tax_id, "field": "tax_id", "value": tax_id, "confidence": 90, "status": "success"})
    if truck_plate:
        fields.append({"sourceText": plate_match.group(0) if plate_match else truck_plate, "field": "truck_plate", "value": truck_plate, "confidence": 90, "status": "success"})
    if subtotal_amount:
        fields.append({"sourceText": subtotal_match.group(0) if subtotal_match else str(subtotal_amount), "field": "subtotal_amount", "value": str(subtotal_amount), "confidence": 95, "status": "success"})
    if vat_amount:
        fields.append({"sourceText": vat_match.group(0) if vat_match else str(vat_amount), "field": "vat_amount", "value": str(vat_amount), "confidence": 95, "status": "success"})
    if total_amount:
        fields.append({"sourceText": amount_match.group(0) if amount_match else str(total_amount), "field": "total_amount", "value": str(total_amount), "confidence": 95, "status": "success"})

    review_items = []
    if not invoice_no:
        review_items.append({"field": "invoice_no", "ocrValue": "-", "slmValue": "-", "confidence": 40, "status": "review"})
    if not document_date:
        review_items.append({"field": "document_date", "ocrValue": "-", "slmValue": "-", "confidence": 40, "status": "review"})

    return {
        "json_schema": {
            "document_type": doc_type,
            "invoice_no": invoice_no,
            "po_number": po_number,
            "document_date": document_date,
            "sender_name": sender_name,
            "receiver_name": receiver_name,
            "tax_id": tax_id,
            "truck_plate": truck_plate,
            "gross_weight_kg": 0,
            "quantity": 0,
            "subtotal_amount": subtotal_amount,
            "vat_amount": vat_amount,
            "total_amount": total_amount,
            "other": {},
        },
        "fields": fields,
        "confidence": {
            "overall": 92 if len(fields) >= 3 else 65,
            "ocr": 95,
            "slm": 90,
            "mapping": 92,
            "completeness": 90 if len(fields) >= 4 else 55,
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
            "invoice_no": "Invoice/Document ID",
            "po_number": "Purchase Order Number if present",
            "document_date": "YYYY-MM-DD or document date string",
            "sender_name": "Company issuing/sending the document",
            "receiver_name": "Customer/Billed to/Shipping destination",
            "tax_id": "Tax ID / VAT Registration number if present",
            "truck_plate": "Vehicle plate or transport ID",
            "gross_weight_kg": 0,
            "quantity": 0,
            "subtotal_amount": 0,
            "vat_amount": 0,
            "total_amount": 0,
            "other": {},
        },
        "fields": [{"sourceText": "source text from OCR", "field": "invoice_no", "value": "normalized value", "confidence": 95, "status": "success | review | error | processing"}],
        "confidence": {"overall": 90, "ocr": 95, "slm": 90, "mapping": 92, "completeness": 90},
        "review_items": [{"field": "truck_plate", "ocrValue": "raw OCR value", "slmValue": "normalized value", "confidence": 50, "status": "review"}],
    }
    return (
        "Extract logistics fields from OCR text and normalize into this EXACT JSON structure.\n"
        "Instructions:\n"
        "- Parse both Thai and English text.\n"
        "- Normalize dates to YYYY-MM-DD when possible.\n"
        "- Parse numerical fields (subtotal_amount, vat_amount, total_amount, gross_weight_kg, quantity) as numbers (float/int).\n"
        "- Put unmapped extra key-value pairs into json_schema.other.\n"
        "- Include confidence scores (0-100).\n"
        "- Return ONLY valid JSON.\n\n"
        f"Document type hint: {payload.document_type_hint}\n\n"
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


def normalize_slm_output(data: dict[str, Any]) -> dict[str, Any]:
    json_schema = data.get("json_schema") if isinstance(data.get("json_schema"), dict) else {}
    confidence = data.get("confidence") if isinstance(data.get("confidence"), dict) else {}
    return {
        "json_schema": {
            "document_type": str(json_schema.get("document_type", "unknown")),
            "invoice_no": str(json_schema.get("invoice_no", "")),
            "po_number": str(json_schema.get("po_number", "")),
            "document_date": str(json_schema.get("document_date", "")),
            "sender_name": str(json_schema.get("sender_name", "")),
            "receiver_name": str(json_schema.get("receiver_name", "")),
            "tax_id": str(json_schema.get("tax_id", "")),
            "truck_plate": str(json_schema.get("truck_plate", "")),
            "gross_weight_kg": to_number(json_schema.get("gross_weight_kg")),
            "quantity": to_number(json_schema.get("quantity")),
            "subtotal_amount": to_number(json_schema.get("subtotal_amount")),
            "vat_amount": to_number(json_schema.get("vat_amount")),
            "total_amount": to_number(json_schema.get("total_amount")),
            "other": json_schema.get("other") if isinstance(json_schema.get("other"), dict) else {},
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
            normalized.append(
                {
                    "sourceText": str(field.get("sourceText", "")),
                    "field": str(field.get("field", "")),
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
            normalized.append(
                {
                    "field": str(item.get("field", "")),
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
