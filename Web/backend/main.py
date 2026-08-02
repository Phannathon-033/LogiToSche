from __future__ import annotations

import gc
import json
import tempfile
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / ".paddlex"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(CACHE_DIR))
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
os.environ.setdefault("PADDLE_PDX_DISABLE_MKLDNN_MODEL_BL", "True")
SITE_PACKAGES_DIR = BASE_DIR / ".venv" / "Lib" / "site-packages"
NVIDIA_DLL_DIRS = [
    SITE_PACKAGES_DIR / "nvidia" / package / "bin"
    for package in ("cublas", "cuda_runtime", "cudnn", "cufft", "curand", "cusolver", "cusparse", "nvjitlink")
]
for dll_dir in NVIDIA_DLL_DIRS:
    if dll_dir.exists():
        os.add_dll_directory(str(dll_dir))
        os.environ["PATH"] = f"{dll_dir}{os.pathsep}{os.environ.get('PATH', '')}"

try:
    import torch
    import paddle
    from paddleocr import PaddleOCR
except Exception as exc:  # pragma: no cover - startup environment dependent
    torch = None  # type: ignore[assignment]
    paddle = None  # type: ignore[assignment]
    PaddleOCR = None  # type: ignore[assignment]
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


app = FastAPI(title="LogiAI PaddleOCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGUAGES = {"th", "en"}
OCR_DEVICE = os.environ.get("LOGIAI_OCR_DEVICE", "gpu:0")
SLM_MODEL_ID = os.environ.get("LOGIAI_SLM_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")
_ocr_engines: dict[str, Any] = {}
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


class SlmField(BaseModel):
    sourceText: str
    field: str
    value: str
    confidence: int
    status: str


class SlmConfidence(BaseModel):
    overall: int
    ocr: int
    slm: int
    mapping: int
    completeness: int


class SlmReviewItem(BaseModel):
    field: str
    ocrValue: str
    slmValue: str
    confidence: int
    status: str = "review"


class SlmExtractResponse(BaseModel):
    json_schema: dict[str, Any]
    fields: list[SlmField]
    confidence: SlmConfidence
    review_items: list[SlmReviewItem]
    model: str
    device: str


def get_engine(lang: str) -> Any:
    if PaddleOCR is None:
        raise HTTPException(
            status_code=503,
            detail=f"PaddleOCR is not installed or failed to import: {IMPORT_ERROR}",
        )
    if paddle is None or not paddle.device.is_compiled_with_cuda():
        raise HTTPException(status_code=503, detail="PaddlePaddle GPU build is required for OCR")

    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="OCR language must be 'th' or 'en'")

    if lang not in _ocr_engines:
        paddle.set_device(OCR_DEVICE)
        try:
            _ocr_engines[lang] = PaddleOCR(
                lang=lang,
                device=OCR_DEVICE,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                enable_mkldnn=False,
            )
        except TypeError:
            _ocr_engines[lang] = PaddleOCR(lang=lang, use_angle_cls=True)
    return _ocr_engines[lang]


def release_ocr_engines() -> None:
    _ocr_engines.clear()
    gc.collect()
    try:
        if paddle is not None and paddle.device.is_compiled_with_cuda():
            paddle.device.cuda.empty_cache()
    except Exception:
        pass


def get_slm() -> tuple[Any, Any]:
    global _slm_model, _slm_tokenizer

    if _slm_model is None or _slm_tokenizer is None:
        release_ocr_engines()
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"SLM dependencies are not installed: {exc}") from exc

        if torch is None or not torch.cuda.is_available():
            raise HTTPException(status_code=503, detail="CUDA is required for SLM but torch.cuda is not available")

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


@app.get("/api/health")
def health() -> dict[str, str]:
    cuda = bool(paddle is not None and paddle.device.is_compiled_with_cuda())
    status = "ready" if PaddleOCR is not None and cuda else "missing-gpu"
    return {"status": status, "engine": "PaddleOCR", "languages": "th,en", "device": OCR_DEVICE, "cuda": str(cuda).lower(), "slm": SLM_MODEL_ID}


@app.post("/api/ocr")
async def ocr_document(file: UploadFile = File(...), lang: str = Form("th")) -> dict[str, Any]:
    lang = lang.lower().strip()
    suffix = Path(file.filename or "document").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".pdf"}:
        raise HTTPException(status_code=415, detail="รองรับเฉพาะ PDF, JPG, JPEG และ PNG")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="ไฟล์ว่าง")

    engine = get_engine(lang)

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)

    try:
        raw_result = predict(engine, tmp_path)
        lines = extract_lines(raw_result)
        text = "\n".join(line["text"] for line in lines if line["text"])
        return {"text": text, "lines": lines, "engine": "PaddleOCR", "language": lang}
    finally:
        tmp_path.unlink(missing_ok=True)
        release_ocr_engines()


@app.post("/api/slm/extract", response_model=SlmExtractResponse)
def slm_extract(payload: SlmExtractRequest) -> SlmExtractResponse:
    tokenizer, model = get_slm()

    prompt = build_slm_prompt(payload)
    messages = [
        {
            "role": "system",
            "content": (
                "You extract logistics document data. Return only valid JSON. "
                "Do not include markdown, comments, or explanations."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    try:
        import torch

        with torch.inference_mode():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=900,
                temperature=0.1,
                do_sample=False,
                repetition_penalty=1.05,
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"SLM generation failed on CUDA: {exc}") from exc

    output_ids = generated_ids[0][inputs.input_ids.shape[-1] :]
    response_text = tokenizer.decode(output_ids, skip_special_tokens=True)
    data = parse_json_object(response_text)
    normalized = normalize_slm_output(data)

    return SlmExtractResponse(
        json_schema=normalized["json_schema"],
        fields=normalized["fields"],
        confidence=normalized["confidence"],
        review_items=normalized["review_items"],
        model=SLM_MODEL_ID,
        device="cuda:0",
    )


def build_slm_prompt(payload: SlmExtractRequest) -> str:
    schema = {
        "json_schema": {
            "document_type": "invoice | bill_of_lading | packing_list | purchase_order | unknown",
            "invoice_no": "",
            "document_date": "YYYY-MM-DD or empty string",
            "receiver_name": "",
            "truck_plate": "",
            "gross_weight_kg": 0,
            "quantity": 0,
            "total_amount": 0,
            "other": {},
        },
        "fields": [
            {
                "sourceText": "source text from OCR",
                "field": "invoice_no",
                "value": "normalized value",
                "confidence": 0,
                "status": "success | review | error | processing",
            }
        ],
        "confidence": {"overall": 0, "ocr": 0, "slm": 0, "mapping": 0, "completeness": 0},
        "review_items": [
            {
                "field": "truck_plate",
                "ocrValue": "raw OCR value",
                "slmValue": "normalized value",
                "confidence": 0,
                "status": "review",
            }
        ],
    }
    return (
        "Extract logistics fields from OCR text and normalize to this exact JSON shape.\n"
        "Use Thai and English OCR text if present.\n"
        "Rules:\n"
        "- Unknown fields must go into json_schema.other.\n"
        "- Use number type for gross_weight_kg, quantity, total_amount.\n"
        "- Use confidence 0-100.\n"
        "- Put low-confidence or conflicting values in review_items.\n"
        "- Return only JSON.\n\n"
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
    json_schema = data.get("json_schema")
    if not isinstance(json_schema, dict):
        json_schema = {}

    default_json = {
        "document_type": str(json_schema.get("document_type", "unknown")),
        "invoice_no": str(json_schema.get("invoice_no", "")),
        "document_date": str(json_schema.get("document_date", "")),
        "receiver_name": str(json_schema.get("receiver_name", "")),
        "truck_plate": str(json_schema.get("truck_plate", "")),
        "gross_weight_kg": to_number(json_schema.get("gross_weight_kg")),
        "quantity": to_number(json_schema.get("quantity")),
        "total_amount": to_number(json_schema.get("total_amount")),
        "other": json_schema.get("other") if isinstance(json_schema.get("other"), dict) else {},
    }

    fields = data.get("fields") if isinstance(data.get("fields"), list) else []
    normalized_fields = []
    for index, field in enumerate(fields, start=1):
        if not isinstance(field, dict):
            continue
        normalized_fields.append(
            {
                "sourceText": str(field.get("sourceText", "")),
                "field": str(field.get("field", "")),
                "value": str(field.get("value", "")),
                "confidence": clamp_int(field.get("confidence"), 0, 100),
                "status": normalize_status(field.get("status")),
            }
        )

    confidence = data.get("confidence") if isinstance(data.get("confidence"), dict) else {}
    normalized_confidence = {
        "overall": clamp_int(confidence.get("overall"), 0, 100),
        "ocr": clamp_int(confidence.get("ocr"), 0, 100),
        "slm": clamp_int(confidence.get("slm"), 0, 100),
        "mapping": clamp_int(confidence.get("mapping"), 0, 100),
        "completeness": clamp_int(confidence.get("completeness"), 0, 100),
    }

    review_items = data.get("review_items") if isinstance(data.get("review_items"), list) else []
    normalized_review_items = []
    for item in review_items:
        if not isinstance(item, dict):
            continue
        normalized_review_items.append(
            {
                "field": str(item.get("field", "")),
                "ocrValue": str(item.get("ocrValue", "")),
                "slmValue": str(item.get("slmValue", "")),
                "confidence": clamp_int(item.get("confidence"), 0, 100),
                "status": "review",
            }
        )

    return {
        "json_schema": default_json,
        "fields": normalized_fields,
        "confidence": normalized_confidence,
        "review_items": normalized_review_items,
    }


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


def predict(engine: Any, path: Path) -> Any:
    if hasattr(engine, "predict"):
        return engine.predict(input=str(path))
    return engine.ocr(str(path), cls=True)


def extract_lines(raw_result: Any) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []

    def walk(node: Any) -> None:
        if node is None:
            return
        if isinstance(node, dict):
            texts = first_present(node, "rec_texts", "texts")
            scores = first_present(node, "rec_scores", "scores")
            boxes = first_present(node, "rec_boxes", "dt_polys")
            if scores is None:
                scores = []
            if boxes is None:
                boxes = []
            if isinstance(texts, list):
                for index, text in enumerate(texts):
                    lines.append(
                        {
                            "text": str(text),
                            "confidence": float(scores[index]) if index < len(scores) else 0.0,
                            "box": normalize_box(boxes[index]) if index < len(boxes) else None,
                        }
                    )
                return
            for value in node.values():
                walk(value)
            return
        if isinstance(node, (list, tuple)):
            if len(node) >= 2 and isinstance(node[1], (list, tuple)) and len(node[1]) >= 2 and isinstance(node[1][0], str):
                lines.append(
                    {
                        "text": node[1][0],
                        "confidence": float(node[1][1]),
                        "box": normalize_box(node[0]),
                    }
                )
                return
            for value in node:
                walk(value)

    walk(raw_result)
    return lines


def first_present(node: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in node and node[key] is not None:
            return node[key]
    return None


def normalize_box(box: Any) -> Any:
    try:
        return [[float(point[0]), float(point[1])] for point in box]
    except Exception:
        return None
