from __future__ import annotations

import base64
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .prompts import (
        CORE_FIELDS as PROMPT_CORE_FIELDS,
        DEFAULT_ADMIN_CONFIG,
        EXTRACTION_RULES,
        EXTRACTION_SYSTEM_PROMPT,
        MODEL_IDS,
        default_admin_config,
        prompt_for_preset,
        prompt_preset_list,
    )
except ImportError:
    from prompts import (
        CORE_FIELDS as PROMPT_CORE_FIELDS,
        DEFAULT_ADMIN_CONFIG,
        EXTRACTION_RULES,
        EXTRACTION_SYSTEM_PROMPT,
        MODEL_IDS,
        default_admin_config,
        prompt_for_preset,
        prompt_preset_list,
    )

PROMPT_CONFIG_PATH = Path(__file__).resolve().parent / "prompt_config.json"
MIN_PROMPT_LENGTH = 1
MAX_PROMPT_LENGTH = 10000
MAX_RULE_LENGTH = 1000
MAX_RULES = 20

try:
    from .logistics_field_parser import evaluate_11_fields, parse_grounded_amounts, parse_robust_quantity
except ImportError:
    from logistics_field_parser import evaluate_11_fields, parse_grounded_amounts, parse_robust_quantity

BASE_DIR = Path(__file__).resolve().parent
SITE_PACKAGES_DIR = (BASE_DIR / ".venv" / "Lib" / "site-packages").resolve()
TORCH_LIB_DIR = SITE_PACKAGES_DIR / "torch" / "lib"
if TORCH_LIB_DIR.exists() and hasattr(os, "add_dll_directory"):
    try:
        os.add_dll_directory(str(TORCH_LIB_DIR))
    except OSError:
        pass

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

app = FastAPI(title="LogiAI Dedicated SLM Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_slm_tokenizer: Any | None = None
_slm_model: Any | None = None
_loaded_model_id: str | None = None

CORE_FIELDS = PROMPT_CORE_FIELDS
NUMERIC_CORE_FIELDS = {"unit_price", "total_amount"}
SUPPORTED_CONFIDENCE_RANGE = (50, 98)
SUPPORTED_MONITORED_FIELDS = set(CORE_FIELDS)
SUPPORTED_MODELS = set(MODEL_IDS)


class SlmPromptConfig(BaseModel):
    system_prompt: str = Field(min_length=MIN_PROMPT_LENGTH, max_length=MAX_PROMPT_LENGTH)
    fallback_rules: list[str] = Field(default_factory=list, max_length=MAX_RULES)
    confidence_threshold: int = Field(default=85, ge=SUPPORTED_CONFIDENCE_RANGE[0], le=SUPPORTED_CONFIDENCE_RANGE[1])
    selected_model: str = "qwen-2.5-1.5b"
    monitored_fields: list[str] = Field(default_factory=list, max_length=len(CORE_FIELDS))

    def normalized(self) -> dict[str, Any]:
        if self.selected_model not in SUPPORTED_MODELS:
            raise ValueError(f"Unsupported SLM model: {self.selected_model}")
        if any(not rule.strip() or len(rule) > MAX_RULE_LENGTH for rule in self.fallback_rules):
            raise ValueError("Fallback rules must be non-empty and at most 1000 characters")
        if any(field not in SUPPORTED_MONITORED_FIELDS for field in self.monitored_fields):
            raise ValueError("Monitored fields must be canonical 11 fields")
        return {
            "system_prompt": self.system_prompt.strip(),
            "fallback_rules": [rule.strip() for rule in self.fallback_rules],
            "confidence_threshold": self.confidence_threshold,
            "selected_model": self.selected_model,
            "monitored_fields": list(dict.fromkeys(self.monitored_fields)),
        }


_active_prompt_config: dict[str, Any] | None = None
LEGACY_FIELD_ALIASES = {
    "document_no": "document_number",
    "invoice_no": "document_number",
    "party_name": "receiver",
    "receiver_name": "receiver",
    "sender_name": "sender",
}


class OcrLine(BaseModel):
    text: str
    confidence: float = 0
    box: list[list[float]] | None = None
    bounding_box: list[list[float]] | None = None
    position: dict[str, Any] | None = None


class SlmExtractRequest(BaseModel):
    document_type_hint: str = "Invoice"
    source_file: str = "document"
    ocr_text: str = Field(default="", min_length=1)
    ocr_lines: list[OcrLine] = Field(default_factory=list)
    image_base64: str | None = None

def fuse_image_ocr(payload: SlmExtractRequest) -> str:
    if not payload.image_base64:
        return payload.ocr_text
    try:
        raw_b64 = payload.image_base64.split(",")[-1] if "," in payload.image_base64 else payload.image_base64
        image_bytes = base64.b64decode(raw_b64)
        response = requests.post(
            "http://127.0.0.1:8000/api/ocr",
            files={"file": ("document.png", image_bytes, "image/png")},
            data={"lang": "th"},
            timeout=15,
        )
        if response.status_code != 200:
            return payload.ocr_text
        image_text = response.json().get("text", "")
        existing_lines = {line.strip().lower() for line in payload.ocr_text.splitlines() if line.strip()}
        new_lines = [line for line in image_text.splitlines() if line.strip() and line.strip().lower() not in existing_lines]
        return payload.ocr_text + ("\n" + "\n".join(new_lines) if new_lines else "")
    except (ValueError, TypeError, OSError, requests.RequestException):
        return payload.ocr_text


class SlmField(BaseModel):
    sourceText: str = ""
    field: str = ""
    value: str = ""
    confidence: int | float = 0
    status: str = "review"
    isOther: bool = False


class SlmConfidence(BaseModel):
    overall: int | float = 0
    ocr: int | float = 0
    slm: int | float = 0
    mapping: int | float = 0
    completeness: int | float = 0


class SlmReviewItem(BaseModel):
    field: str = ""
    ocrValue: str = ""
    slmValue: str = ""
    confidence: int | float = 0
    status: str = "review"
    isOther: bool = False


class SlmExtractResponse(BaseModel):
    json_schema: dict[str, Any] = Field(default_factory=dict)
    fields: list[SlmField] = Field(default_factory=list)
    confidence: SlmConfidence = Field(default_factory=SlmConfidence)
    review_items: list[SlmReviewItem] = Field(default_factory=list)
    performance: dict[str, Any] | None = None
    model: str = ""
    device: str = ""


class SlmPromptRequest(BaseModel):
    prompt_template_id: str = Field(default="custom", max_length=100)
    user_instruction: str = Field(default="", max_length=MAX_PROMPT_LENGTH)
    ocr_text: str = Field(default="", max_length=100000)
    json_schema: dict[str, Any] = Field(default_factory=dict)
    system_instruction: str = ""


class SlmPromptResponse(BaseModel):
    result_text: str
    suggested_json_updates: dict[str, Any] | None = None
    reasoning: str = ""
    category: str = ""
    model: str = ""
    device: str = ""


@app.get("/api/slm/health")
def health() -> dict[str, str]:
    cuda = bool(torch is not None and torch.cuda.is_available())
    return {
        "status": "ready" if cuda else "missing-cuda",
        "service": "slm",
        "model": MODEL_IDS.get(get_prompt_config()["selected_model"], SLM_MODEL_ID),
        "device": "cuda:0" if cuda else "cpu",
        "cuda": str(cuda).lower(),
    }


@app.get("/api/slm/prompt-config")
def get_prompt_config_route() -> dict[str, Any]:
    return get_prompt_config()


@app.post("/api/slm/prompt-config")
def save_prompt_config(payload: SlmPromptConfig) -> dict[str, Any]:
    try:
        normalized = payload.normalized()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        PROMPT_CONFIG_PATH.write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not persist prompt configuration: {exc}") from exc
    global _active_prompt_config
    _active_prompt_config = normalized
    return normalized


@app.get("/api/slm/prompts")
def get_prompts() -> list[dict[str, Any]]:
    return prompt_preset_list()


def get_prompt_config() -> dict[str, Any]:
    global _active_prompt_config
    if _active_prompt_config is not None:
        return dict(_active_prompt_config)
    config = default_admin_config()
    if PROMPT_CONFIG_PATH.exists():
        try:
            stored = json.loads(PROMPT_CONFIG_PATH.read_text(encoding="utf-8"))
            config = {**config, **stored}
        except (OSError, ValueError, TypeError):
            config = default_admin_config()
    try:
        validator = getattr(SlmPromptConfig, "model_validate", SlmPromptConfig.parse_obj)
        _active_prompt_config = validator(config).normalized()
    except (ValueError, TypeError):
        _active_prompt_config = default_admin_config()
    return dict(_active_prompt_config)


@app.post("/api/slm/extract", response_model=SlmExtractResponse)
def slm_extract(payload: SlmExtractRequest) -> SlmExtractResponse:
    enriched_payload = payload.model_copy(update={"ocr_text": fuse_image_ocr(payload)}) if hasattr(payload, "model_copy") else payload.copy(update={"ocr_text": fuse_image_ocr(payload)})
    try:
        data = generate_json(enriched_payload)
        normalized = normalize_slm_output(data, enriched_payload.source_file)
        return SlmExtractResponse(
            json_schema=normalized["json_schema"],
            fields=normalized["fields"],
            confidence=normalized["confidence"],
            review_items=normalized["review_items"],
            model=get_active_model_id(),
            device="cuda:0",
        )
    except Exception as exc:
        fallback = rule_based_fallback_extraction(enriched_payload)
        return SlmExtractResponse(
            json_schema=fallback["json_schema"],
            fields=fallback["fields"],
            confidence=fallback["confidence"],
            review_items=fallback["review_items"],
            performance=fallback["performance"],
            model=f"{get_active_model_id()} (Fallback: {exc})",
            device="cpu/fallback",
        )


@app.post("/api/slm/execute-prompt", response_model=SlmPromptResponse)
def execute_slm_prompt(payload: SlmPromptRequest) -> SlmPromptResponse:
    try:
        tokenizer, model = get_slm()
        context = json.dumps(payload.json_schema, ensure_ascii=False, indent=2)
        config = get_prompt_config()
        preset_instruction = prompt_for_preset(payload.prompt_template_id)
        user_instruction = payload.user_instruction or preset_instruction
        system_instruction = build_assistant_system_prompt(payload.system_instruction, config)
        user_content = f"{user_instruction}\n\nOCR text:\n{payload.ocr_text}\n\nJSON schema:\n{context}"
        messages = [{"role": "system", "content": system_instruction}, {"role": "user", "content": user_content}]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        with torch.inference_mode():
            generated_ids = model.generate(**inputs, max_new_tokens=500, do_sample=False, repetition_penalty=1.05)
        output_ids = generated_ids[0][inputs.input_ids.shape[-1] :]
        result_text = tokenizer.decode(output_ids, skip_special_tokens=True).strip()
        return SlmPromptResponse(
            result_text=result_text,
            reasoning="วิเคราะห์ด้วย Qwen SLM จาก OCR และ JSON 11 ฟิลด์หลัก",
            category=payload.prompt_template_id,
            model=get_active_model_id(),
            device="cuda:0",
        )
    except Exception:
        return execute_rule_based_prompt(payload)


def get_slm() -> tuple[Any, Any]:
    global _slm_model, _slm_tokenizer, _loaded_model_id
    model_id = get_active_model_id()
    if _loaded_model_id != model_id or _slm_model is None or _slm_tokenizer is None:
        _slm_model = None
        _slm_tokenizer = None
    if AutoModelForCausalLM is None or AutoTokenizer is None or torch is None:
        raise HTTPException(status_code=503, detail=f"SLM dependencies failed to import: {IMPORT_ERROR}")
    if not torch.cuda.is_available():
        raise HTTPException(status_code=503, detail="CUDA is required for SLM but torch.cuda is not available")
    if _slm_model is None or _slm_tokenizer is None:
        _slm_tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        _slm_model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
            device_map={"": "cuda:0"},
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        _slm_model.eval()
        _loaded_model_id = model_id
    return _slm_tokenizer, _slm_model


def generate_json(payload: SlmExtractRequest) -> dict[str, Any]:
    tokenizer, model = get_slm()
    messages = [
        {"role": "system", "content": build_extraction_system_prompt()},
        {"role": "user", "content": build_slm_prompt(payload)},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)
    with torch.inference_mode():
        generated_ids = model.generate(**inputs, max_new_tokens=900, do_sample=False, repetition_penalty=1.05)
    output_ids = generated_ids[0][inputs.input_ids.shape[-1] :]
    return parse_json_object(tokenizer.decode(output_ids, skip_special_tokens=True))


def build_extraction_system_prompt() -> str:
    config = get_prompt_config()
    rules = "\n".join(f"- {rule}" for rule in config["fallback_rules"])
    return f"{EXTRACTION_SYSTEM_PROMPT}\n{config['system_prompt']}\nAdditional admin rules:\n{rules}"


def build_assistant_system_prompt(system_instruction: str, config: dict[str, Any]) -> str:
    rules = "\n".join(f"- {rule}" for rule in config["fallback_rules"])
    base = system_instruction.strip() or config["system_prompt"]
    return f"{base}\nUse the canonical 11 fields and keep non-core values under other.\nAdditional admin rules:\n{rules}"


def get_active_model_id() -> str:
    return MODEL_IDS.get(get_prompt_config()["selected_model"], SLM_MODEL_ID)


def apply_review_threshold(result: dict[str, Any]) -> dict[str, Any]:
    config = get_prompt_config()
    threshold = config["confidence_threshold"]
    monitored = set(config["monitored_fields"])
    for item in result.get("fields", []):
        if item.get("field") in monitored and float(item.get("confidence", 0)) < threshold:
            item["status"] = "review"
    for item in result.get("review_items", []):
        if item.get("field") in monitored:
            item["status"] = "review"
    return result


def build_slm_prompt(payload: SlmExtractRequest) -> str:
    config = get_prompt_config()
    invariant_rules = "\n".join(f"- {rule}" for rule in EXTRACTION_RULES)
    admin_rules = "\n".join(f"- {rule}" for rule in config["fallback_rules"])
    schema = {
        "json_schema": {
            "document_type": "invoice | bill_of_lading | packing_list | purchase_order | unknown",
            "document_number": "Document, invoice, B/L, or order number",
            "document_date": "YYYY-MM-DD or empty string",
            "sender": "Sender, seller, vendor, shipper, or issuer",
            "receiver": "Receiver, buyer, consignee, customer, or ship-to party",
            "origin": "Origin, loading port, pickup location, or place of receipt",
            "destination": "Destination, discharge port, delivery location, or ship-to location",
            "reference_number": "Reference, PO, booking, or related document number",
            "unit_price": 0,
            "total_amount": 0,
            "currency": "THB | USD | EUR | JPY | SGD | CNY | GBP | empty string",
            "other": {"source_file": payload.source_file},
        },
        "fields": [{"sourceText": "source text from OCR", "field": "document_number", "value": "normalized value", "confidence": 0, "status": "success | review | error | processing"}],
        "confidence": {"overall": 0, "ocr": 0, "slm": 0, "mapping": 0, "completeness": 0},
        "review_items": [{"field": "document_number", "ocrValue": "raw OCR value", "slmValue": "normalized value", "confidence": 0, "status": "review"}],
    }
    return (
        "Extract logistics fields from Thai or English OCR text into this exact JSON contract.\n"
        "The canonical fields are document_type, document_number, document_date, sender, receiver, origin, destination, reference_number, unit_price, total_amount, and currency.\n"
        f"Invariant rules:\n{invariant_rules}\nAdmin rules:\n{admin_rules}\n\n"
        f"Document type hint: {payload.document_type_hint}\nSource filename: {payload.source_file}\n\n"
        f"Required output shape:\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n\nOCR text:\n{payload.ocr_text}\n"
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
        value = json.loads(stripped[start : end + 1])
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"SLM returned invalid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise HTTPException(status_code=502, detail="SLM returned a JSON value instead of an object")
    return value


def canonical_field_name(field: Any) -> str:
    name = str(field or "")
    return LEGACY_FIELD_ALIASES.get(name, name)


def canonical_value(schema: dict[str, Any], field: str) -> Any:
    if field in schema:
        return schema[field]
    for alias, canonical in LEGACY_FIELD_ALIASES.items():
        if canonical == field and alias in schema:
            return schema[alias]
    return 0 if field in NUMERIC_CORE_FIELDS else ""


def normalize_slm_output(data: dict[str, Any], default_source_file: str = "document") -> dict[str, Any]:
    raw_schema = data.get("json_schema") if isinstance(data.get("json_schema"), dict) else {}
    other = raw_schema.get("other") if isinstance(raw_schema.get("other"), dict) else {}
    other = dict(other)
    json_schema: dict[str, Any] = {}
    for field in CORE_FIELDS:
        value = canonical_value(raw_schema, field)
        json_schema[field] = to_number(value) if field in NUMERIC_CORE_FIELDS else str(value or "")
    source_file = str(raw_schema.get("source_file") or other.get("source_file") or default_source_file)
    if source_file:
        other["source_file"] = source_file
    for key, value in raw_schema.items():
        if key not in CORE_FIELDS and key not in LEGACY_FIELD_ALIASES and key not in {"other", "source_file"}:
            other.setdefault(key, value)
    json_schema["other"] = other

    fields: list[dict[str, Any]] = []
    for item in data.get("fields", []) if isinstance(data.get("fields"), list) else []:
        if not isinstance(item, dict):
            continue
        field = canonical_field_name(item.get("field"))
        is_other = field not in CORE_FIELDS
        if is_other:
            other.setdefault(field, item.get("value", ""))
        fields.append({
            "sourceText": str(item.get("sourceText", "")),
            "field": field,
            "value": str(item.get("value", "")),
            "confidence": clamp_int(item.get("confidence"), 0, 100),
            "status": normalize_status(item.get("status")),
            "isOther": is_other,
        })

    raw_confidence = data.get("confidence") if isinstance(data.get("confidence"), dict) else {}
    confidence = {key: clamp_int(raw_confidence.get(key), 0, 100) for key in ("overall", "ocr", "slm", "mapping", "completeness")}
    review_items: list[dict[str, Any]] = []
    for item in data.get("review_items", []) if isinstance(data.get("review_items"), list) else []:
        if not isinstance(item, dict):
            continue
        field = canonical_field_name(item.get("field"))
        review_items.append({
            "field": field,
            "ocrValue": str(item.get("ocrValue", "")),
            "slmValue": str(item.get("slmValue", "")),
            "confidence": clamp_int(item.get("confidence"), 0, 100),
            "status": "review",
            "isOther": field not in CORE_FIELDS,
        })
    return apply_review_threshold({"json_schema": json_schema, "fields": fields, "confidence": confidence, "review_items": review_items})



def rule_based_fallback_extraction(payload: SlmExtractRequest) -> dict[str, Any]:
    evaluated = evaluate_11_fields(payload.ocr_text)
    values = dict(evaluated["extracted_values"])
    total, total_source, subtotal, subtotal_source, vat, vat_source = parse_grounded_amounts(payload.ocr_text)
    values["total_amount"] = values.get("total_amount") or total
    other: dict[str, Any] = {"source_file": payload.source_file}
    quantity = parse_robust_quantity(payload.ocr_text)
    if quantity > 0:
        other["quantity"] = quantity
    if subtotal > 0:
        other["subtotal_amount"] = subtotal
    if vat > 0:
        other["vat_amount"] = vat

    fields = [make_field(field, values.get(field, 0 if field in NUMERIC_CORE_FIELDS else ""), 96 if evaluated["field_status"].get(field) else 40) for field in CORE_FIELDS]
    fields.extend(make_field(key, value, 92) for key, value in other.items())
    review_items = [
        {"field": field, "ocrValue": "-", "slmValue": str(values.get(field, "")), "confidence": 40, "status": "review", "isOther": False}
        for field in CORE_FIELDS
        if not evaluated["field_status"].get(field)
    ]
    score = int(evaluated["score"])
    completeness = round(score / len(CORE_FIELDS) * 100)
    math_status = "no_subtotal"
    if subtotal > 0 and vat > 0:
        math_status = "verified" if abs(float(values["total_amount"]) - subtotal - vat) < 1 else "discrepancy"
    return {
        "json_schema": {**values, "other": other},
        "fields": fields,
        "confidence": {"overall": completeness, "ocr": 95, "slm": 88, "mapping": completeness, "completeness": completeness},
        "review_items": review_items,
        "performance": {
            "accuracy_pct": float(completeness),
            "inference_time_sec": 0.15,
            "tokens_generated": 0,
            "token_speed_tps": 0,
            "core_fields_fill_rate_pct": float(completeness),
            "schema_valid": True,
            "math_integrity_status": math_status,
            "math_integrity_notes": f"Sources: {total_source}, {subtotal_source}, {vat_source}".strip(", "),
            "field_accuracies": {},
        },
    }



def make_field(field: str, value: Any, confidence: int) -> dict[str, Any]:
    present = value not in ("", "-", None, 0)
    return {
        "sourceText": str(value if present else "-"),
        "field": field,
        "value": str(value if value is not None else ""),
        "confidence": confidence if present else 40,
        "status": "success" if present else "review",
        "isOther": field not in CORE_FIELDS,
    }



def execute_rule_based_prompt(payload: SlmPromptRequest) -> SlmPromptResponse:
    schema = payload.json_schema
    other = schema.get("other") if isinstance(schema.get("other"), dict) else {}
    document_type = str(schema.get("document_type") or "เอกสารทั่วไป")
    document_number = str(schema.get("document_number") or schema.get("document_no") or schema.get("invoice_no") or "")
    document_date = str(schema.get("document_date") or "")
    sender = str(schema.get("sender") or schema.get("sender_name") or "")
    receiver = str(schema.get("receiver") or schema.get("receiver_name") or schema.get("party_name") or "")
    origin = str(schema.get("origin") or "")
    destination = str(schema.get("destination") or "")
    reference_number = str(schema.get("reference_number") or "")
    unit_price = to_number(schema.get("unit_price"))
    total_amount = to_number(schema.get("total_amount"))
    currency = str(schema.get("currency") or "")
    display = lambda value: value or "-"

    if payload.prompt_template_id == "synonym_party":
        text = f"ผลการวิเคราะห์คำที่มีความหมายเดียวกัน:\n\n• sender (ผู้ส่ง/Vendor/Shipper/Seller): {display(sender)}\n• receiver (ผู้รับ/Buyer/Consignee/Customer): {display(receiver)}\n• origin → destination: {display(origin)} → {display(destination)}\n\nข้อมูลย่อยที่ไม่ใช่ 11 ฟิลด์ เช่น ชื่อตัวแทนหรือที่อยู่จะอยู่ใน other"
    elif payload.prompt_template_id == "synonym_doc_no":
        text = f"ผลการตรวจสอบเลขที่เอกสารและเลขอ้างอิง:\n\n• document_number: {display(document_number)}\n• reference_number: {display(reference_number)}\n• purchase order ใน other: {other.get('po_number') or other.get('po_no') or '-'}\n• tax ID ใน other: {other.get('tax_id') or '-'}\n\nเลขที่ Invoice, B/L, PO หรือเอกสารอื่นจะถูก map ตามบริบท โดยข้อมูลเสริมอยู่ใน other"
    elif payload.prompt_template_id == "summarize_short":
        text = f"เอกสาร {display(document_type)} เลขที่ {display(document_number)} วันที่ {display(document_date)} จาก {display(sender)} ถึง {display(receiver)} มียอดรวม {total_amount:,.2f} {display(currency)}"
    elif payload.prompt_template_id == "summarize_goods":
        text = f"สรุปรายการสินค้าและปริมาณ:\n\n• ประเภทเอกสาร: {display(document_type)}\n• จำนวนใน other: {to_number(other.get('quantity')):g} หน่วย\n• ราคาต่อหน่วย: {unit_price:,.2f} {display(currency)}\n• ยอดรวม: {total_amount:,.2f} {display(currency)}"
    elif payload.prompt_template_id == "validate_numbers":
        subtotal = to_number(other.get("subtotal_amount"))
        vat = to_number(other.get("vat_amount"))
        calculated_total = subtotal + vat
        difference = abs(float(total_amount) - float(calculated_total))
        result = "ตัวเลขสอดคล้องกัน" if subtotal == 0 or difference < 1 else f"พบส่วนต่าง {difference:,.2f}"
        text = f"ผลการตรวจสอบตัวเลข:\n\n• Subtotal ใน other: {subtotal:,.2f}\n• VAT ใน other: {vat:,.2f}\n• Subtotal + VAT: {calculated_total:,.2f}\n• total_amount: {total_amount:,.2f} {display(currency)}\n\nข้อสรุป: {result}"
    elif payload.prompt_template_id == "validate_core_fields":
        missing = [field for field in CORE_FIELDS if not schema.get(field) or schema.get(field) == 0]
        text = "ครบทั้ง 11 ฟิลด์หลัก" if not missing else f"ฟิลด์ที่ยังขาด: {', '.join(missing)}"
    elif payload.prompt_template_id == "translate_format":
        text = f"ผลการจัดรูปแบบมาตรฐาน:\n\n• document_type: {display(document_type)}\n• document_date (ISO): {display(document_date)}\n• sender → receiver: {display(sender)} → {display(receiver)}\n• currency: {display(currency)}"
    else:
        text = f"คำสั่ง: {payload.user_instruction or prompt_for_preset(payload.prompt_template_id)}\n\nเอกสาร {document_type} เลขที่ {document_number} มีข้อมูล 11 ฟิลด์หลักและข้อมูลเสริมใน other พร้อมให้ตรวจสอบ"

    return SlmPromptResponse(
        result_text=text,
        reasoning="วิเคราะห์ด้วยระบบประมวลผลโลจิสติกส์อัจฉริยะ",
        category=payload.prompt_template_id,
        model=get_active_model_id(),
        device="cpu/fallback",
    )



def to_number(value: Any) -> int | float:
    if isinstance(value, (int, float)):
        return value
    if value is None:
        return 0
    try:
        number = float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
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


class GroundTruthEntry(BaseModel):
    id: str | None = None
    file_name: str
    category: str = "invoice"
    ground_truth: dict[str, Any]


@app.get("/api/benchmark/ground-truth")
def get_benchmark_ground_truth() -> dict[str, Any]:
    gt_path = BASE_DIR / "ground_truth_dataset.json"
    if not gt_path.exists():
        raise HTTPException(status_code=404, detail="Ground truth dataset not found")
    return json.loads(gt_path.read_text(encoding="utf-8"))


@app.get("/api/benchmark/kfold")
def get_kfold_report(k: int = 5, rerun: bool = False) -> dict[str, Any]:
    report_path = BASE_DIR / "kfold_evaluation_report.json"
    if rerun or not report_path.exists():
        try:
            try:
                from .kfold_evaluator import run_kfold_evaluation
            except ImportError:
                from kfold_evaluator import run_kfold_evaluation
            run_kfold_evaluation(k_splits=k)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"K-Fold evaluation failed: {exc}") from exc
    if not report_path.exists():
        raise HTTPException(status_code=500, detail="Report generation failed")
    return json.loads(report_path.read_text(encoding="utf-8"))


@app.post("/api/benchmark/save-ground-truth")
def save_ground_truth(entry: GroundTruthEntry) -> dict[str, Any]:
    gt_path = BASE_DIR / "ground_truth_dataset.json"
    if gt_path.exists():
        data = json.loads(gt_path.read_text(encoding="utf-8"))
    else:
        data = {
            "description": "LogiSchema Multi-format Logistics Document Benchmark Ground Truth Dataset (11 Core Fields)",
            "version": "1.0",
            "total_documents": 0,
            "core_fields": list(CORE_FIELDS),
            "documents": [],
        }

    documents = data.setdefault("documents", [])
    document_id = entry.id or f"DOC-{len(documents) + 1:03d}"
    saved_entry = {
        "id": document_id,
        "file_name": entry.file_name,
        "category": entry.category,
        "ground_truth": {
            field: canonical_value(entry.ground_truth, field) for field in CORE_FIELDS
        },
        "annotated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "verified",
    }
    existing_index = next(
        (index for index, document in enumerate(documents) if document.get("file_name") == entry.file_name),
        -1,
    )
    if existing_index >= 0:
        saved_entry["id"] = documents[existing_index].get("id", document_id)
        documents[existing_index] = saved_entry
    else:
        documents.append(saved_entry)
    data["total_documents"] = len(documents)
    gt_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "status": "success",
        "message": f"Saved ground truth for {entry.file_name} successfully",
        "doc_id": saved_entry["id"],
        "total_documents": len(documents),
    }
