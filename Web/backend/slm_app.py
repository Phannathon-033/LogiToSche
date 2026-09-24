from __future__ import annotations

import base64
import json
import os
import re
import sys
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
        EXTRACTION_RULES,
        EXTRACTION_SYSTEM_PROMPT,
        MODEL_IDS,
        default_admin_config,
        load_prompt_config,
        prompt_for_preset,
        save_prompt_config as persist_prompt_config,
        prompt_preset_list,
    )
except ImportError:
    from prompts import (
        CORE_FIELDS as PROMPT_CORE_FIELDS,
        EXTRACTION_RULES,
        EXTRACTION_SYSTEM_PROMPT,
        MODEL_IDS,
        default_admin_config,
        load_prompt_config,
        prompt_for_preset,
        save_prompt_config as persist_prompt_config,
        prompt_preset_list,
    )

MIN_PROMPT_LENGTH = 1
MAX_PROMPT_LENGTH = 10000
MAX_RULE_LENGTH = 1000
MAX_RULES = 20
BENCHMARK_PROMPT_VARIANTS = {"zero-shot", "one-shot", "few-shot"}
MAX_BENCHMARK_EXAMPLES = 5
MAX_BENCHMARK_EXAMPLE_LENGTH = 20000

try:
    from .logistics_field_parser import evaluate_11_fields, parse_grounded_amounts, parse_robust_quantity, repair_ocr_typos
except ImportError:
    from logistics_field_parser import evaluate_11_fields, parse_grounded_amounts, parse_robust_quantity, repair_ocr_typos

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR.parent / ".env.local")

DRIVE_ROOT = Path(os.environ.get("LOGIAI_DRIVE_ROOT", "/content/drive/MyDrive/LogiToSche"))
DEFAULT_GT = (DRIVE_ROOT / "ground_truth" / "ground_truth_dataset.json") if DRIVE_ROOT.exists() else (BASE_DIR / "ground_truth_dataset.json")
DEFAULT_REPORT_DIR = (DRIVE_ROOT / "reports") if DRIVE_ROOT.exists() else (BASE_DIR / "reports")

GROUND_TRUTH_PATH = Path(os.environ.get("LOGIAI_GROUND_TRUTH_PATH", DEFAULT_GT))
REPORT_DIR = Path(os.environ.get("LOGIAI_REPORT_DIR", DEFAULT_REPORT_DIR))
REPORT_DIR.mkdir(parents=True, exist_ok=True)
SITE_PACKAGES_DIR = (BASE_DIR / ".venv" / "Lib" / "site-packages").resolve()
TORCH_LIB_DIR = SITE_PACKAGES_DIR / "torch" / "lib"
if TORCH_LIB_DIR.exists() and hasattr(os, "add_dll_directory"):
    try:
        os.add_dll_directory(str(TORCH_LIB_DIR))
    except OSError:
        pass

SLM_MODEL_ID = os.environ.get("LOGIAI_SLM_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")
GATEWAY_TOKEN = os.environ.get("LOGIAI_GATEWAY_TOKEN", "").strip()
GATEWAY_HEADERS = {"X-LogiAI-Token": GATEWAY_TOKEN} if GATEWAY_TOKEN else {}

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
    prompt_config: SlmPromptConfig | None = None
    benchmark_prompt_variant: str = "zero-shot"
    benchmark_examples: list[dict[str, Any]] = Field(default_factory=list)

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
            headers=GATEWAY_HEADERS,
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
def health() -> dict[str, Any]:
    if torch is None:
        return {
            "status": "missing-dependencies",
            "service": "slm",
            "model": SLM_MODEL_ID,
            "device": "cpu",
            "cuda": False,
            "model_loaded": False,
            "error": str(IMPORT_ERROR),
        }
    cuda = torch.cuda.is_available()
    if not cuda:
        return {
            "status": "missing-cuda",
            "service": "slm",
            "model": MODEL_IDS.get(get_prompt_config()["selected_model"], SLM_MODEL_ID),
            "device": "cpu",
            "cuda": False,
            "model_loaded": False,
            "error": "torch.cuda.is_available() returned False",
        }
    if os.environ.get("LOGIAI_PRELOAD_SLM", "false").lower() == "true":
        get_slm()
    loaded = _slm_model is not None and _slm_tokenizer is not None
    return {
        "status": "ready" if loaded else "missing-model",
        "service": "slm",
        "model": MODEL_IDS.get(get_prompt_config()["selected_model"], SLM_MODEL_ID),
        "device": "cuda:0",
        "cuda": True,
        "model_loaded": loaded,
    }


@app.get("/api/slm/prompt-config")
def get_prompt_config_route() -> dict[str, Any]:
    return get_prompt_config()


@app.post("/api/slm/prompt-config")
def save_prompt_config(payload: SlmPromptConfig) -> dict[str, Any]:
    try:
        normalized = payload.normalized()
        saved = persist_prompt_config(normalized)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not persist prompt configuration: {exc}") from exc
    global _active_prompt_config
    _active_prompt_config = saved
    return dict(saved)


@app.get("/api/slm/prompts")
def get_prompts() -> list[dict[str, Any]]:
    return prompt_preset_list()


def get_prompt_config() -> dict[str, Any]:
    global _active_prompt_config
    if _active_prompt_config is not None:
        return dict(_active_prompt_config)
    try:
        loaded = load_prompt_config()
        validator = getattr(SlmPromptConfig, "model_validate", SlmPromptConfig.parse_obj)
        _active_prompt_config = {
            **loaded,
            **validator(loaded).normalized(),
        }
    except (ValueError, TypeError, json.JSONDecodeError, OSError):
        _active_prompt_config = default_admin_config()
    return dict(_active_prompt_config)


@app.post("/api/slm/extract", response_model=SlmExtractResponse)
def slm_extract(payload: SlmExtractRequest) -> SlmExtractResponse:
    try:
        benchmark_variant_for_request(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    enriched_payload = payload.model_copy(update={"ocr_text": fuse_image_ocr(payload)}) if hasattr(payload, "model_copy") else payload.copy(update={"ocr_text": fuse_image_ocr(payload)})
    try:
        data = generate_json(enriched_payload)
        normalized = normalize_slm_output(
            data,
            enriched_payload.source_file,
            enriched_payload.prompt_config,
            ocr_lines=enriched_payload.ocr_lines,
        )
        config = prompt_config_for_request(enriched_payload.prompt_config)
        return SlmExtractResponse(
            json_schema=normalized["json_schema"],
            fields=normalized["fields"],
            confidence=normalized["confidence"],
            review_items=normalized["review_items"],
            model=get_active_model_id(config),
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
            model=f"{get_active_model_id(prompt_config_for_request(enriched_payload.prompt_config))} (Fallback: {exc})",
            device="cpu/fallback",
        )


@app.post("/api/slm/execute-prompt", response_model=SlmPromptResponse)
def execute_slm_prompt(payload: SlmPromptRequest) -> SlmPromptResponse:
    try:
        config = get_prompt_config()
        tokenizer, model = get_slm()
        context = json.dumps(payload.json_schema, ensure_ascii=False, indent=2)
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


def get_slm(model_id: str | None = None) -> tuple[Any, Any]:
    global _slm_model, _slm_tokenizer, _loaded_model_id
    model_id = model_id or get_active_model_id()
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
    benchmark_variant, _ = benchmark_variant_for_request(payload)
    config = prompt_config_for_request(payload.prompt_config)
    tokenizer, model = get_model_for_request(payload.prompt_config)
    messages = [
        {"role": "system", "content": build_extraction_system_prompt(config)},
        {"role": "user", "content": build_slm_prompt(payload, config)},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)
    max_tokens = 200 if benchmark_variant == "zero-shot" else 900
    import time
    t0 = time.time()
    print(f"[SLM] Generating JSON for {payload.source_file} (variant={benchmark_variant}, in_tokens={inputs.input_ids.shape[1]}, max_out={max_tokens})...", flush=True)
    with torch.inference_mode():
        generated_ids = model.generate(**inputs, max_new_tokens=max_tokens, do_sample=False, repetition_penalty=1.05)
    gen_time = time.time() - t0
    output_ids = generated_ids[0][inputs.input_ids.shape[-1] :]
    decoded = tokenizer.decode(output_ids, skip_special_tokens=True)
    print(f"[SLM] Generated {len(output_ids)} tokens in {gen_time:.2f}s ({len(output_ids)/max(gen_time, 0.01):.1f} tps)!", flush=True)
    return parse_json_object(decoded)


def prompt_config_for_request(snapshot: SlmPromptConfig | None) -> dict[str, Any]:
    return get_prompt_config() if snapshot is None else snapshot.normalized()


def benchmark_variant_for_request(payload: SlmExtractRequest) -> tuple[str, list[dict[str, Any]]]:
    variant = payload.benchmark_prompt_variant.strip().lower()
    if variant not in BENCHMARK_PROMPT_VARIANTS:
        raise ValueError(f"Unsupported benchmark prompt variant: {variant}")
    examples = payload.benchmark_examples
    if variant == "zero-shot":
        if examples:
            raise ValueError("zero-shot cannot include benchmark examples")
        return variant, []
    required_count = 1 if variant == "one-shot" else 2
    if len(examples) < required_count:
        raise ValueError(f"{variant} requires at least {required_count} benchmark examples")
    if len(examples) > MAX_BENCHMARK_EXAMPLES:
        raise ValueError(f"At most {MAX_BENCHMARK_EXAMPLES} benchmark examples are supported")
    if any(len(json.dumps(example, ensure_ascii=False)) > MAX_BENCHMARK_EXAMPLE_LENGTH for example in examples):
        raise ValueError("Benchmark example is too large")
    return variant, [dict(example) for example in examples[:required_count] if isinstance(example, dict)]


def build_extraction_system_prompt(config: dict[str, Any] | None = None) -> str:
    config = config or get_prompt_config()
    rules = "\n".join(f"- {rule}" for rule in config["fallback_rules"])
    return f"{EXTRACTION_SYSTEM_PROMPT}\n{config['system_prompt']}\nAdditional admin rules:\n{rules}"


def build_assistant_system_prompt(system_instruction: str, config: dict[str, Any]) -> str:
    rules = "\n".join(f"- {rule}" for rule in config["fallback_rules"])
    base = system_instruction.strip() or config["system_prompt"]
    return f"{base}\nUse the canonical 11 fields and keep non-core values under other.\nAdditional admin rules:\n{rules}"


def get_active_model_id(config: dict[str, Any] | None = None) -> str:
    active = config or get_prompt_config()
    return MODEL_IDS.get(active["selected_model"], SLM_MODEL_ID)


def get_model_for_request(snapshot: SlmPromptConfig | None) -> tuple[Any, Any]:
    return get_slm(MODEL_IDS.get(snapshot.selected_model) if snapshot else None)


def apply_review_threshold(result: dict[str, Any], config: SlmPromptConfig | dict[str, Any] | None = None) -> dict[str, Any]:
    if isinstance(config, SlmPromptConfig):
        config = config.normalized()
    config = config or get_prompt_config()
    threshold = config["confidence_threshold"]
    monitored = set(config["monitored_fields"])
    for item in result.get("fields", []):
        if item.get("field") in monitored and float(item.get("confidence", 0)) < threshold:
            item["status"] = "review"
    for item in result.get("review_items", []):
        if item.get("field") in monitored:
            item["status"] = "review"
    return result


def build_slm_prompt(payload: SlmExtractRequest, config: dict[str, Any] | None = None) -> str:
    config = config or prompt_config_for_request(payload.prompt_config)
    benchmark_variant, benchmark_examples = benchmark_variant_for_request(payload)
    invariant_rules = "\n".join(f"- {rule}" for rule in EXTRACTION_RULES)
    admin_rules = "\n".join(f"- {rule}" for rule in config["fallback_rules"])
    benchmark_instruction = ""
    if benchmark_variant != "zero-shot":
        benchmark_instruction = (
            f"\nBenchmark prompt variant: {benchmark_variant}. "
            "Use the following labeled examples only as formatting and mapping demonstrations; "
            "do not copy values unless grounded in the current OCR text.\n"
            f"Examples:\n{json.dumps(benchmark_examples, ensure_ascii=False, indent=2)}\n"
        )

    # Clean optical OCR typos and incorporate line-level OCR confidence
    ocr_text_to_use = repair_ocr_typos(payload.ocr_text)
    low_conf_guidance = ""
    if payload.ocr_lines:
        annotated_lines = []
        low_count = 0
        for line in payload.ocr_lines:
            c = float(line.confidence or 0)
            c_pct = round(c * 100 if c <= 1.0 else c)
            rep_text = repair_ocr_typos(line.text)
            if 0 < c_pct < 80 and rep_text.strip():
                annotated_lines.append(f"{rep_text} [⚠️ OCR conf: {c_pct}%]")
                low_count += 1
            else:
                annotated_lines.append(rep_text)
        ocr_text_to_use = "\n".join(annotated_lines)
        if low_count > 0:
            low_conf_guidance = "- Lines marked with [⚠️ OCR conf: <80%] have lower optical recognition clarity. Use semantic reasoning to correct obvious character misreadings (e.g. 0 vs O, 1 vs I, punctuation).\n"

    if benchmark_variant == "zero-shot":
        zero_shot_schema = {
            "document_type": "invoice | bill_of_lading | packing_list | purchase_order | unknown",
            "document_number": "string",
            "document_date": "YYYY-MM-DD",
            "sender": "string",
            "receiver": "string",
            "origin": "string",
            "destination": "string",
            "reference_number": "string",
            "unit_price": 0.0,
            "total_amount": 0.0,
            "currency": "USD | THB | EUR | string",
        }
        return (
            "Extract the 11 canonical logistics fields from OCR text into JSON.\n"
            "Fields: document_type, document_number, document_date, sender, receiver, origin, destination, reference_number, unit_price, total_amount, currency.\n"
            f"Invariant rules:\n{invariant_rules}\nAdmin rules:\n{admin_rules}\n"
            f"{low_conf_guidance}"
            "Rules:\n- Numbers must be numeric float without commas.\n- Dates must be YYYY-MM-DD.\n- If missing, use \"\" or 0.0.\n"
            "- Currency must match OCR symbols ($/USD for dollar, ฿/THB/บาท for Thai baht). Do NOT default to THB if $ or USD is present.\n"
            "- Bank names (e.g. ธ.กสิกรไทย, ธนาคาร, KBANK, SCB, BBL) are payment channels, NOT sender or receiver. Put bank info in other.\n\n"
            f"Document type hint: {payload.document_type_hint}\nSource filename: {payload.source_file}\n\n"
            f"Required output shape:\n{json.dumps(zero_shot_schema, ensure_ascii=False, indent=2)}\n\nOCR text:\n{ocr_text_to_use}\n"
        )

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
        f"Invariant rules:\n{invariant_rules}\nAdmin rules:\n{admin_rules}\n"
        f"{low_conf_guidance}"
        f"{benchmark_instruction}\n"
        f"Document type hint: {payload.document_type_hint}\nSource filename: {payload.source_file}\n\n"
        f"Required output shape:\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n\nOCR text:\n{ocr_text_to_use}\n"
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


def find_ocr_line_for_value(target_val: Any, ocr_lines: list[Any] | None) -> tuple[str, int] | None:
    """
    Matches an extracted field value against OCR lines to find the source text and PaddleOCR confidence score.
    Returns (matched_ocr_text, confidence_percent) or None if no match found.
    """
    if target_val is None or not ocr_lines:
        return None
    val_str = str(target_val).strip()
    if not val_str or val_str in ("-", "0", "0.0", "unknown", "none", "null"):
        return None

    val_lower = val_str.lower()
    val_digits = re.sub(r"[^\d]", "", val_str)

    best_match: tuple[str, int] | None = None
    best_score = -1.0

    for line in ocr_lines:
        txt = getattr(line, "text", "") if hasattr(line, "text") else (line.get("text", "") if isinstance(line, dict) else "")
        txt = str(txt).strip()
        if not txt:
            continue
        c = getattr(line, "confidence", 0) if hasattr(line, "confidence") else (line.get("confidence", 0) if isinstance(line, dict) else 0)
        try:
            c_val = float(c or 0)
        except (ValueError, TypeError):
            c_val = 0.0
        c_pct = round(c_val * 100 if c_val <= 1.0 else c_val)
        c_pct = max(0, min(100, c_pct))

        txt_lower = txt.lower()

        # 1. Exact or substring string match
        if len(val_lower) >= 2:
            if val_lower == txt_lower:
                return (txt, c_pct)
            if val_lower in txt_lower:
                match_score = len(val_lower) / max(len(txt_lower), 1)
                if match_score > best_score:
                    best_score = match_score
                    best_match = (txt, c_pct)
            elif txt_lower in val_lower and len(txt_lower) >= 4:
                match_score = len(txt_lower) / max(len(val_lower), 1)
                if match_score > best_score:
                    best_score = match_score
                    best_match = (txt, c_pct)

        # 2. Numeric match (for unit_price, total_amount, dates)
        if len(val_digits) >= 3:
            txt_digits = re.sub(r"[^\d]", "", txt)
            if val_digits in txt_digits:
                match_score = len(val_digits) / max(len(txt_digits), 1)
                if match_score > best_score:
                    best_score = match_score
                    best_match = (txt, c_pct)

    return best_match


def normalize_slm_output(
    data: dict[str, Any],
    default_source_file: str = "document",
    config: SlmPromptConfig | None = None,
    ocr_lines: list[OcrLine] | None = None,
) -> dict[str, Any]:
    if isinstance(data.get("json_schema"), dict):
        raw_schema = data["json_schema"]
    else:
        raw_schema = data
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

    # Sanitize bank names from sender/receiver (banks are payment channels, not vendors/clients)
    sender_val = str(json_schema.get("sender", ""))
    if re.search(r'(?:ธนาคาร|ธ\.\s*|kbank|scb|bbl|krungthai|kasikorn)', sender_val, re.IGNORECASE):
        other["payment_bank"] = sender_val
        json_schema["sender"] = ""

    receiver_val = str(json_schema.get("receiver", ""))
    if re.search(r'(?:ธนาคาร|ธ\.\s*|kbank|scb|bbl|krungthai|kasikorn)', receiver_val, re.IGNORECASE):
        other["payment_bank"] = receiver_val
        json_schema["receiver"] = ""

    # Currency Grounding & Disambiguation:
    curr_val = str(json_schema.get("currency", "")).strip().upper()
    ocr_combined_text = " ".join(getattr(l, "text", "") if hasattr(l, "text") else (l.get("text", "") if isinstance(l, dict) else "") for l in (ocr_lines or []))
    has_usd = bool(re.search(r'(?:\$|\bUSD\b|\bdollar\b|S\s*\d)', ocr_combined_text, re.IGNORECASE))
    has_thb = bool(re.search(r'(?:บาท|\bTHB\b|฿|\bbaht\b)', ocr_combined_text, re.IGNORECASE))
    if (curr_val in ("THB", "บาท", "") or not curr_val) and has_usd and not has_thb:
        json_schema["currency"] = "USD"
    elif (curr_val in ("USD", "$", "") or not curr_val) and has_thb and not has_usd:
        json_schema["currency"] = "THB"

    # Extract real OCR line confidence metrics from PaddleOCR
    valid_ocr_scores: list[int] = []
    if ocr_lines:
        for line in ocr_lines:
            c = getattr(line, "confidence", 0) if hasattr(line, "confidence") else (line.get("confidence", 0) if isinstance(line, dict) else 0)
            try:
                c_val = float(c or 0)
            except (ValueError, TypeError):
                c_val = 0.0
            c_pct = round(c_val * 100 if c_val <= 1.0 else c_val)
            if 0 < c_pct <= 100:
                valid_ocr_scores.append(c_pct)
    real_ocr_confidence = round(sum(valid_ocr_scores) / len(valid_ocr_scores)) if valid_ocr_scores else 95

    fields: list[dict[str, Any]] = []
    for item in data.get("fields", []) if isinstance(data.get("fields"), list) else []:
        if not isinstance(item, dict):
            continue
        field = canonical_field_name(item.get("field"))
        is_other = field not in CORE_FIELDS
        if is_other:
            other.setdefault(field, item.get("value", ""))
        val = str(item.get("value", ""))
        source_txt = str(item.get("sourceText", ""))
        base_c = clamp_int(item.get("confidence"), 0, 100)
        status = normalize_status(item.get("status"))

        if field == "currency" and json_schema.get("currency"):
            val = json_schema["currency"]
            if "$" in ocr_combined_text and val == "USD":
                source_txt = "$"
        elif field == "sender" and not json_schema.get("sender"):
            val = ""
            source_txt = "-"
            status = "review"
            base_c = 40
        elif field == "receiver" and not json_schema.get("receiver"):
            val = ""
            source_txt = "-"
            status = "review"
            base_c = 40

        ocr_match = find_ocr_line_for_value(val, ocr_lines) if val else None
        if ocr_match:
            matched_txt, ocr_conf = ocr_match
            if not source_txt or source_txt == "-":
                source_txt = matched_txt
            if ocr_conf > 0:
                base_c = round(0.4 * ocr_conf + 0.6 * base_c)
            if ocr_conf < 75 and status == "success":
                status = "review"

        fields.append({
            "sourceText": source_txt,
            "field": field,
            "value": val,
            "confidence": base_c,
            "status": status,
            "isOther": is_other,
        })

    if not fields:
        for field in CORE_FIELDS:
            val = json_schema.get(field, "")
            present = val not in ("", "-", None, 0)
            base_c = 95 if present else 40
            source_txt = str(val if present else "-")
            status = "success" if present else "review"

            ocr_match = find_ocr_line_for_value(val, ocr_lines) if present else None
            if ocr_match:
                matched_txt, ocr_conf = ocr_match
                source_txt = matched_txt
                if ocr_conf > 0:
                    base_c = round(0.4 * ocr_conf + 0.6 * base_c)
                if ocr_conf < 75:
                    status = "review"

            fields.append({
                "sourceText": source_txt,
                "field": field,
                "value": str(val if val is not None else ""),
                "confidence": base_c,
                "status": status,
                "isOther": False,
            })

    raw_confidence = data.get("confidence") if isinstance(data.get("confidence"), dict) else {}
    if raw_confidence:
        confidence = {key: clamp_int(raw_confidence.get(key), 0, 100) for key in ("overall", "ocr", "slm", "mapping", "completeness")}
        if valid_ocr_scores:
            confidence["ocr"] = real_ocr_confidence
    else:
        completed = sum(1 for f in fields if f["status"] == "success")
        completeness = round(completed / len(CORE_FIELDS) * 100)
        overall = round((real_ocr_confidence * 0.35) + (90 * 0.35) + (completeness * 0.30))
        confidence = {
            "overall": clamp_int(overall, 0, 100),
            "ocr": real_ocr_confidence,
            "slm": 90,
            "mapping": completeness,
            "completeness": completeness,
        }

    review_items: list[dict[str, Any]] = []
    seen_review_fields: set[str] = set()
    for item in data.get("review_items", []) if isinstance(data.get("review_items"), list) else []:
        if not isinstance(item, dict):
            continue
        field = canonical_field_name(item.get("field"))
        seen_review_fields.add(field)
        ocr_val = str(item.get("ocrValue", ""))
        slm_val = str(item.get("slmValue", ""))
        if (not ocr_val or ocr_val == "-") and slm_val:
            match = find_ocr_line_for_value(slm_val, ocr_lines)
            if match:
                ocr_val = match[0]
        review_items.append({
            "field": field,
            "ocrValue": ocr_val,
            "slmValue": slm_val,
            "confidence": clamp_int(item.get("confidence"), 0, 100),
            "status": "review",
            "isOther": field not in CORE_FIELDS,
        })

    for f in fields:
        if f["status"] == "review" and f["field"] not in seen_review_fields:
            seen_review_fields.add(f["field"])
            ocr_match = find_ocr_line_for_value(f["value"], ocr_lines)
            ocr_val = ocr_match[0] if ocr_match else f.get("sourceText", "-")
            review_items.append({
                "field": f["field"],
                "ocrValue": str(ocr_val if ocr_val else "-"),
                "slmValue": str(f["value"] if f["value"] is not None else ""),
                "confidence": f["confidence"],
                "status": "review",
                "isOther": f.get("isOther", False),
            })

    return apply_review_threshold(
        {"json_schema": json_schema, "fields": fields, "confidence": confidence, "review_items": review_items},
        config,
    )



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

    valid_ocr_scores: list[int] = []
    if payload.ocr_lines:
        for line in payload.ocr_lines:
            c = float(line.confidence or 0)
            c_pct = round(c * 100 if c <= 1.0 else c)
            if 0 < c_pct <= 100:
                valid_ocr_scores.append(c_pct)
    real_ocr_confidence = round(sum(valid_ocr_scores) / len(valid_ocr_scores)) if valid_ocr_scores else 95

    fields = []
    for field in CORE_FIELDS:
        val = values.get(field, 0 if field in NUMERIC_CORE_FIELDS else "")
        present = bool(evaluated["field_status"].get(field))
        base_conf = 96 if present else 40
        status = "success" if present else "review"
        source_txt = str(val if present else "-")
        ocr_match = find_ocr_line_for_value(val, payload.ocr_lines) if present else None
        if ocr_match:
            matched_txt, ocr_conf = ocr_match
            source_txt = matched_txt
            if ocr_conf > 0:
                base_conf = round(0.4 * ocr_conf + 0.6 * base_conf)
            if ocr_conf < 75:
                status = "review"
        fields.append({
            "sourceText": source_txt,
            "field": field,
            "value": str(val if val is not None else ""),
            "confidence": base_conf,
            "status": status,
            "isOther": False,
        })
    fields.extend(make_field(key, value, 92) for key, value in other.items())

    review_items = [
        {
            "field": f["field"],
            "ocrValue": str(f["sourceText"] if f["sourceText"] != "-" else "-"),
            "slmValue": str(f["value"]),
            "confidence": f["confidence"],
            "status": "review",
            "isOther": False,
        }
        for f in fields
        if f["status"] == "review" and not f.get("isOther")
    ]
    score = int(evaluated["score"])
    completeness = round(score / len(CORE_FIELDS) * 100)
    math_status = "no_subtotal"
    if subtotal > 0 and vat > 0:
        math_status = "verified" if abs(float(values["total_amount"]) - subtotal - vat) < 1 else "discrepancy"
    overall = round((real_ocr_confidence * 0.35) + (88 * 0.35) + (completeness * 0.30))
    return {
        "json_schema": {**values, "other": other},
        "fields": fields,
        "confidence": {
            "overall": clamp_int(overall, 0, 100),
            "ocr": real_ocr_confidence,
            "slm": 88,
            "mapping": completeness,
            "completeness": completeness,
        },
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
    gt_path = GROUND_TRUTH_PATH
    if not gt_path.exists():
        raise HTTPException(status_code=404, detail="Ground truth dataset not found")
    data = json.loads(gt_path.read_text(encoding="utf-8"))
    dataset_dir = Path(os.environ.get("LOGIAI_DATASET_DIR", str(BASE_DIR.parent.parent / "To_Testing")))
    labels_dir = dataset_dir / "labels_json"
    if labels_dir.is_dir() and "documents" in data:
        for doc in data["documents"]:
            file_name = doc.get("file_name", "")
            stem = Path(file_name).stem if file_name else ""
            doc_id = doc.get("id", "")
            for candidate in [labels_dir / f"{stem}.json", labels_dir / f"{doc_id}.json"]:
                if candidate.is_file():
                    try:
                        lbl_data = json.loads(candidate.read_text(encoding="utf-8"))
                        if "ground_truth" in lbl_data and isinstance(lbl_data["ground_truth"], dict):
                            doc["ground_truth"] = lbl_data["ground_truth"]
                        break
                    except Exception:
                        pass
    return data


@app.get("/api/benchmark/kfold")
def get_kfold_report(
    k: int = 5,
    seed: int = 42,
    rerun: bool = False,
    prompt_variant: str = "zero-shot",
    limit: int | None = None,
    doc_id: str | None = None,
    single_fold: int | None = None,
) -> dict[str, Any]:
    if prompt_variant.strip().lower() != "zero-shot":
        raise HTTPException(status_code=400, detail="K-Fold evaluation supports zero-shot only")
    prompt_variant = "zero-shot"
    report_path = REPORT_DIR / "kfold_evaluation_report.json"
    if not report_path.exists() and (BASE_DIR / "kfold_evaluation_report.json").exists():
        report_path = BASE_DIR / "kfold_evaluation_report.json"
    cached_report: dict[str, Any] | None = None
    if report_path.exists():
        try:
            cached_report = json.loads(report_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            cached_report = None

    # If general request without rerun, return cached 5-fold thesis report immediately
    if not rerun and limit is None and doc_id is None and k > 1 and single_fold is None:
        if cached_report:
            return cached_report

    # Run only if explicitly requested, single-doc test, specific document, or single_fold
    if rerun or limit is not None or doc_id is not None or k <= 1 or single_fold is not None:
        try:
            try:
                from .kfold_evaluator import run_kfold_evaluation
            except ImportError:
                from kfold_evaluator import run_kfold_evaluation
            report = run_kfold_evaluation(
                k_splits=k,
                random_seed=seed,
                document_limit=limit,
                prompt_variant=prompt_variant,
                force_rerun=rerun if (k <= 1 or doc_id is not None) else False,
                doc_id=doc_id,
                single_fold=single_fold,
            )
            return report
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"K-Fold evaluation failed: {exc}") from exc

    if cached_report:
        return cached_report
    if not report_path.exists():
        raise HTTPException(status_code=500, detail="Report generation failed")
    return json.loads(report_path.read_text(encoding="utf-8"))


_fresh_process = None


@app.get("/api/benchmark/kfold/fresh-status")
def get_fresh_run_status() -> dict[str, Any]:
    progress_file = REPORT_DIR / "fresh_run_progress.json"
    if progress_file.is_file():
        try:
            return json.loads(progress_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"is_running": False, "finished": False}


@app.post("/api/benchmark/kfold/fresh-start")
def start_fresh_run_endpoint(
    fold: int = 1,
    k: int = 5,
    max_docs: int | None = None,
    re_ocr: bool = False,
) -> dict[str, Any]:
    global _fresh_process
    progress_file = REPORT_DIR / "fresh_run_progress.json"
    if progress_file.is_file():
        try:
            curr = json.loads(progress_file.read_text(encoding="utf-8"))
            if curr.get("is_running"):
                return {"status": "already_running", "progress": curr}
        except Exception:
            pass

    import subprocess
    runner_script = BASE_DIR / "fresh_runner.py"
    py_exec = sys.executable
    cmd = [py_exec, str(runner_script), "--fold", str(fold), "--k", str(k)]
    if max_docs:
        cmd.extend(["--max", str(max_docs)])
    if re_ocr:
        cmd.append("--re-ocr")
    _fresh_process = subprocess.Popen(
        cmd,
        cwd=str(BASE_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return {"status": "started", "fold": fold, "k": k, "max_docs": max_docs, "pid": _fresh_process.pid}


@app.post("/api/benchmark/kfold/fresh-stop")
def stop_fresh_run_endpoint() -> dict[str, Any]:
    global _fresh_process
    stopped = False
    if _fresh_process and _fresh_process.poll() is None:
        try:
            _fresh_process.terminate()
            stopped = True
        except Exception:
            pass
    progress_file = REPORT_DIR / "fresh_run_progress.json"
    if progress_file.is_file():
        try:
            curr = json.loads(progress_file.read_text(encoding="utf-8"))
            curr["is_running"] = False
            progress_file.write_text(json.dumps(curr, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
    return {"status": "stopped", "process_terminated": stopped}


@app.post("/api/benchmark/save-ground-truth")
def save_ground_truth(entry: GroundTruthEntry) -> dict[str, Any]:
    gt_path = GROUND_TRUTH_PATH
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
    gt_path.parent.mkdir(parents=True, exist_ok=True)
    gt_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "status": "success",
        "message": f"Saved ground truth for {entry.file_name} successfully",
        "doc_id": saved_entry["id"],
        "total_documents": len(documents),
    }


@app.get("/api/benchmark/performance-log")
def get_performance_log_endpoint() -> dict[str, Any]:
    try:
        from kfold_evaluator import get_performance_logs
        return get_performance_logs()
    except Exception as e:
        return {"records": [], "summary": {}, "error": str(e)}


@app.post("/api/benchmark/performance-log/clear")
def clear_performance_log_endpoint() -> dict[str, Any]:
    try:
        from kfold_evaluator import PERF_LOG_FILE, PERF_CSV_FILE
        if PERF_LOG_FILE.is_file():
            PERF_LOG_FILE.unlink(missing_ok=True)
        if PERF_CSV_FILE.is_file():
            PERF_CSV_FILE.unlink(missing_ok=True)
        return {"status": "success", "message": "Performance logs cleared"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ---------------------------------------------------------------------------
# Background Evaluation Job System (Immediate response, resume, OCR cache)
# ---------------------------------------------------------------------------
class StartEvaluationRequest(BaseModel):
    mode: str = "5_fold"  # '5_fold' | 'single_fold' | 'single_doc'
    fold: int = 1
    k: int = 5
    seed: int = 42
    prompt_variant: str = "zero-shot"
    resume: bool = True
    force_rerun_ocr: bool = False
    max_docs: int | None = None
    doc_id: str | None = None


@app.post("/api/evaluation/start")
@app.post("/api/benchmark/evaluation/start")
def start_evaluation_job(payload: StartEvaluationRequest | None = None) -> dict[str, Any]:
    from evaluation_job_manager import job_manager
    p = payload or StartEvaluationRequest()
    return job_manager.start_job(
        mode=p.mode,
        single_fold=p.fold,
        k_splits=p.k,
        random_seed=p.seed,
        prompt_variant=p.prompt_variant,
        resume=p.resume,
        force_rerun_ocr=p.force_rerun_ocr,
        max_docs=p.max_docs,
        doc_id=p.doc_id,
    )


@app.get("/api/evaluation/status")
@app.get("/api/benchmark/evaluation/status")
def get_current_evaluation_job_status() -> dict[str, Any]:
    from evaluation_job_manager import job_manager
    return job_manager.get_status(None)


@app.get("/api/evaluation/{job_id}/status")
def get_specific_evaluation_job_status(job_id: str) -> dict[str, Any]:
    from evaluation_job_manager import job_manager
    return job_manager.get_status(job_id)


@app.post("/api/evaluation/stop")
@app.post("/api/benchmark/evaluation/stop")
def stop_current_evaluation_job() -> dict[str, Any]:
    from evaluation_job_manager import job_manager
    return job_manager.stop_job(None)


@app.post("/api/evaluation/{job_id}/stop")
def stop_specific_evaluation_job(job_id: str) -> dict[str, Any]:
    from evaluation_job_manager import job_manager
    return job_manager.stop_job(job_id)

