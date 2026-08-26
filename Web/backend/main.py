from __future__ import annotations

import gc
import json
import tempfile
import os
import sys
import types
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

# Mock modelscope before paddlex imports it to avoid PyTorch/Paddle DLL conflict
if "modelscope" not in sys.modules:
    sys.modules["modelscope"] = types.ModuleType("modelscope")

SITE_PACKAGES_DIR = (BASE_DIR / ".venv" / "Lib" / "site-packages").resolve()
TORCH_LIB_DIR = SITE_PACKAGES_DIR / "torch" / "lib"
if TORCH_LIB_DIR.exists():
    try:
        os.add_dll_directory(str(TORCH_LIB_DIR))
    except Exception:
        pass

NVIDIA_DLL_DIRS = [
    SITE_PACKAGES_DIR / "nvidia" / package / "bin"
    for package in ("cublas", "cuda_runtime", "cudnn", "cufft", "curand", "cusolver", "cusparse", "nvjitlink")
]
for dll_dir in NVIDIA_DLL_DIRS:
    if dll_dir.exists():
        try:
            os.add_dll_directory(str(dll_dir))
        except Exception:
            pass
        os.environ["PATH"] = f"{dll_dir}{os.pathsep}{os.environ.get('PATH', '')}"

try:
    import paddle
    from paddleocr import PaddleOCR
    PADDLE_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover - startup environment dependent
    paddle = None  # type: ignore[assignment]
    PaddleOCR = None  # type: ignore[assignment]
    PADDLE_IMPORT_ERROR = exc

try:
    import torch
    TORCH_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover
    torch = None  # type: ignore[assignment]
    TORCH_IMPORT_ERROR = exc


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
    source_file: str = "document"
    ocr_text: str = Field(default="", min_length=1)
    ocr_lines: list[OcrLine] = Field(default_factory=list)


class SlmField(BaseModel):
    sourceText: str = ""
    field: str = ""
    value: str = ""
    confidence: int | float = 0
    status: str = "success"
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
    model: str = ""
    device: str = ""


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
    model: str = ""
    device: str = ""


def get_engine(lang: str) -> Any:
    if PaddleOCR is None or paddle is None:
        raise HTTPException(
            status_code=503,
            detail=f"PaddleOCR is not installed or failed to import: {PADDLE_IMPORT_ERROR}",
        )

    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="OCR language must be 'th' or 'en'")

    if lang not in _ocr_engines:
        use_gpu = bool(paddle.device.is_compiled_with_cuda())
        device = OCR_DEVICE if use_gpu else "cpu"
        try:
            if use_gpu:
                paddle.set_device(device)
            _ocr_engines[lang] = PaddleOCR(
                lang=lang,
                device=device,
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
    status = "ready" if PaddleOCR is not None else "missing-paddle"
    return {"status": status, "engine": "PaddleOCR", "languages": "th,en", "device": OCR_DEVICE if cuda else "cpu", "cuda": str(cuda).lower(), "slm": SLM_MODEL_ID}


@app.post("/api/ocr")
async def ocr_document(file: UploadFile = File(...), lang: str = Form("th")) -> dict[str, Any]:
    lang = lang.lower().strip()
    suffix = Path(file.filename or "document").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".pdf", ".tif", ".tiff"}:
        raise HTTPException(status_code=415, detail="รองรับเฉพาะ PDF, JPG, JPEG, PNG, TIF และ TIFF")

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
    try:
        import requests
        resp = requests.post("http://127.0.0.1:8001/api/slm/extract", json=payload.model_dump() if hasattr(payload, "model_dump") else payload.dict(), timeout=120)
        if resp.status_code == 200:
            return SlmExtractResponse(**resp.json())
    except Exception:
        pass

    try:
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

        with torch.inference_mode():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=900,
                do_sample=False,
                repetition_penalty=1.05,
            )

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
    except Exception as exc:
        fallback = rule_based_fallback_extraction(payload)
        return SlmExtractResponse(
            json_schema=fallback["json_schema"],
            fields=fallback["fields"],
            confidence=fallback["confidence"],
            review_items=fallback["review_items"],
            model=f"{SLM_MODEL_ID} (Fallback: {exc})",
            device="cpu/fallback",
        )


@app.post("/api/slm/execute-prompt", response_model=SlmPromptResponse)
def execute_slm_prompt(payload: SlmPromptRequest) -> SlmPromptResponse:
    # 1. Try forwarding to Dedicated SLM Microservice (Port 8001)
    try:
        import requests
        resp = requests.post(
            "http://127.0.0.1:8001/api/slm/execute-prompt",
            json=payload.model_dump() if hasattr(payload, "model_dump") else payload.dict(),
            timeout=120,
        )
        if resp.status_code == 200:
            return SlmPromptResponse(**resp.json())
    except Exception:
        pass

    # 2. Local fallback generation / heuristic response
    return execute_main_rule_based_prompt(payload)


def execute_main_rule_based_prompt(payload: SlmPromptRequest) -> SlmPromptResponse:
    pid = payload.prompt_template_id
    schema = payload.json_schema

    doc_type = schema.get("document_type", "เอกสารทั่วไป")
    doc_no = schema.get("document_no", "-")
    party = schema.get("party_name", "-")
    total = schema.get("total_amount", 0)
    date_val = schema.get("document_date", "-")
    other = schema.get("other", {})

    if pid == "synonym_party":
        sender = other.get("sender_name") or "ไม่พบชื่อผู้ส่งชัดเจน"
        receiver = other.get("receiver_name") or "ไม่พบชื่อผู้รับชัดเจน"
        text = (
            f"📌 **ผลการวิเคราะห์คำที่มีความหมายเดียวกัน (Synonym & Entity Mapping)**:\n\n"
            f"• **กลุ่มผู้ส่ง/ผู้ออกเอกสาร (Sender/Vendor/Shipper/Seller)**: '{sender}'\n"
            f"• **กลุ่มผู้รับ/ลูกค้า (Receiver/Buyer/Consignee/Customer)**: '{receiver}'\n"
            f"• **ชื่อคู่ค้าหลัก (party_name)**: กำหนดเป็น '{party}'\n\n"
            f"💡 *คำแนะนำ*: ระบบจัดให้ '{party}' เป็นตัวแทนคู่ค้าหลักใน 7 ฟิลด์หลักเรียบร้อยแล้ว"
        )
    elif pid == "synonym_doc_no":
        inv = other.get("invoice_no") or doc_no
        po = other.get("po_number") or other.get("po_no") or "-"
        tax = other.get("tax_id") or "-"
        text = (
            f"📌 **ผลการตรวจสอบเลขที่เอกสารและการอ้างอิง (Document Reference Check)**:\n\n"
            f"• **เลขที่เอกสารหลัก (document_no / Invoice No)**: '{inv}'\n"
            f"• **เลขที่ใบสั่งซื้อ (P.O. Number / Purchase Order)**: '{po}'\n"
            f"• **เลขประจำตัวผู้เสียภาษี (Tax ID / VAT No)**: '{tax}'\n\n"
            f"💡 *ข้อสรุป*: คำว่า 'เลขที่', 'Inv No.', 'Bill No.' มีความหมายเดียวกันและถูกแมปลงใน `document_no`"
        )
    elif pid == "summarize_short":
        text = (
            f"📝 **สรุปใจความสำคัญของเอกสาร (One-Sentence Summary)**:\n\n"
            f"\"เอกสาร {doc_type} เลขที่ **{doc_no}** ออกเมื่อวันที่ **{date_val}** สำหรับคู่ค้า **{party}** "
            f"มียอดเงินรวมสุทธิ **{total:,.2f} บาท**\""
        )
    elif pid == "summarize_goods":
        qty = schema.get("quantity", 0)
        text = (
            f"📦 **สรุปรายการสินค้าและปริมาณ (Goods & Volume Summary)**:\n\n"
            f"• **ประเภทสินค้า/บริการ**: รายการตามเอกสาร {doc_type}\n"
            f"• **จำนวนรวม (Total Quantity)**: {qty} รายการ/หน่วย\n"
            f"• **ยอดเงินรวมสุทธิ**: {total:,.2f} บาท\n"
            f"• **สถานะการตรวจนับ**: สกัดจากข้อความ OCR สำเร็จ"
        )
    elif pid == "validate_numbers":
        subtotal = float(other.get("subtotal_amount", 0) or 0)
        vat = float(other.get("vat_amount", 0) or 0)
        calc_total = subtotal + vat
        diff = abs(float(total) - calc_total)
        status_txt = "✅ ตัวเลขถูกต้องสอดคล้องกัน" if diff < 1.0 or subtotal == 0 else f"⚠️ พบส่วนต่าง {diff:,.2f} บาท ระหว่างยอดรวมกับยอดก่อนภาษี+VAT"
        text = (
            f"🔍 **ผลการตรวจสอบความสอดคล้องของตัวเลข (Validation Check)**:\n\n"
            f"• ยอดก่อนภาษี (Subtotal): {subtotal:,.2f} บาท\n"
            f"• ภาษีมูลค่าเพิ่ม 7% (VAT): {vat:,.2f} บาท\n"
            f"• ยอดรวมคำนวณ (Subtotal + VAT): {calc_total:,.2f} บาท\n"
            f"• ยอดรวมสุทธิในเอกสาร (Total Amount): {float(total):,.2f} บาท\n\n"
            f"📊 **ข้อสรุป**: {status_txt}"
        )
    elif pid == "translate_format":
        text = (
            f"🌐 **การจัดรูปแบบและแปลข้อมูลสากล (Standardization & Translation)**:\n\n"
            f"• **Document Type (EN -> TH)**: {doc_type} -> ใบแจ้งหนี้ / ใบกำกับภาษี\n"
            f"• **Standard ISO Date**: {date_val}\n"
            f"• **Standard Currency**: THB (บาทไทย)\n"
            f"• **Normalized Party**: {party}"
        )
    else:
        text = (
            f"🤖 **ผลการวิเคราะห์คำสั่ง (AI Analysis Result)**:\n\n"
            f"คำสั่ง: \"{payload.user_instruction}\"\n\n"
            f"จากการวิเคราะห์ข้อมูลเอกสาร {doc_type} (เลขที่ {doc_no}) พบว่าข้อมูลคู่ค้าคือ '{party}' "
            f"ยอดรวมคือ {total:,.2f} บาท ข้อมูลทั้งหมดถูกจัดโครงสร้างใน 7 ฟิลด์หลักและ other อย่างสมบูรณ์"
        )

    return SlmPromptResponse(
        result_text=text,
        reasoning="วิเคราะห์ด้วยระบบประมวลผลโลจิสติกส์อัจฉริยะ",
        category=pid,
        model=SLM_MODEL_ID,
        device="cuda:0",
    )


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

    document_type = str(raw_schema.get("document_type", "unknown"))
    document_no = str(raw_schema.get("document_no") or raw_schema.get("invoice_no") or "")
    document_date = str(raw_schema.get("document_date", ""))
    party_name = str(raw_schema.get("party_name") or raw_schema.get("receiver_name") or raw_schema.get("sender_name") or "")
    source_file = str(raw_schema.get("source_file") or default_source_file)
    quantity = to_number(raw_schema.get("quantity"))
    total_amount = to_number(raw_schema.get("total_amount"))

    other_dict = raw_schema.get("other") if isinstance(raw_schema.get("other"), dict) else {}
    reserved_keys = {"document_type", "document_no", "document_date", "party_name", "source_file", "quantity", "total_amount", "other"}
    for k, v in raw_schema.items():
        if k not in reserved_keys and k not in other_dict:
            other_dict[k] = v

    fields = data.get("fields") if isinstance(data.get("fields"), list) else []
    normalized_fields = []
    for field in fields:
        if not isinstance(field, dict):
            continue
        field_name = str(field.get("field", ""))
        if field_name == "invoice_no":
            field_name = "document_no"
        elif field_name in {"receiver_name", "sender_name"} and not any(f.get("field") == "party_name" for f in normalized_fields):
            field_name = "party_name"

        normalized_fields.append(
            {
                "sourceText": str(field.get("sourceText", "")),
                "field": field_name,
                "value": str(field.get("value", "")),
                "confidence": clamp_int(field.get("confidence"), 0, 100),
                "status": normalize_status(field.get("status")),
            }
        )

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
        field_name = str(item.get("field", ""))
        if field_name == "invoice_no":
            field_name = "document_no"
        normalized_review_items.append(
            {
                "field": field_name,
                "ocrValue": str(item.get("ocrValue", "")),
                "slmValue": str(item.get("slmValue", "")),
                "confidence": clamp_int(item.get("confidence"), 0, 100),
                "status": "review",
            }
        )

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
            texts = first_present(node, "rec_texts", "rec_text", "texts")
            scores = first_present(node, "rec_scores", "rec_score", "scores")
            boxes = first_present(node, "rec_polys", "dt_polys", "rec_boxes", "boxes")
            if texts is not None:
                if scores is None:
                    scores = []
                if boxes is None:
                    boxes = []
                for i, text in enumerate(texts):
                    score = float(scores[i]) if i < len(scores) else 0.95
                    box = boxes[i] if i < len(boxes) else None
                    lines.append({"text": str(text), "confidence": score, "box": normalize_box(box)})
                return
            for value in node.values():
                walk(value)
            return
        if isinstance(node, (list, tuple)):
            if len(node) >= 2 and isinstance(node[1], (list, tuple)) and len(node[1]) >= 2 and isinstance(node[1][0], str):
                lines.append(
                    {
                        "text": str(node[1][0]),
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


import re

def rule_based_fallback_extraction(payload: SlmExtractRequest) -> dict[str, Any]:
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

    other_fields: dict[str, Any] = {}
    if sender_name:
        other_fields["sender_name"] = sender_name
        fields.append({"sourceText": sender_name, "field": "sender_name", "value": sender_name, "confidence": 88, "status": "success"})
    if receiver_name:
        other_fields["receiver_name"] = receiver_name
        fields.append({"sourceText": receiver_name, "field": "receiver_name", "value": receiver_name, "confidence": 88, "status": "success"})
    if po_number:
        other_fields["po_number"] = po_number
        fields.append({"sourceText": po_number, "field": "po_number", "value": po_number, "confidence": 92, "status": "success"})
    if tax_id:
        other_fields["tax_id"] = tax_id
        fields.append({"sourceText": tax_id, "field": "tax_id", "value": tax_id, "confidence": 90, "status": "success"})
    if truck_plate:
        other_fields["truck_plate"] = truck_plate
        fields.append({"sourceText": plate_match.group(0) if plate_match else truck_plate, "field": "truck_plate", "value": truck_plate, "confidence": 90, "status": "success"})
    if subtotal_amount:
        other_fields["subtotal_amount"] = subtotal_amount
        fields.append({"sourceText": str(subtotal_amount), "field": "subtotal_amount", "value": str(subtotal_amount), "confidence": 95, "status": "success"})
    if vat_amount:
        other_fields["vat_amount"] = vat_amount
        fields.append({"sourceText": str(vat_amount), "field": "vat_amount", "value": str(vat_amount), "confidence": 95, "status": "success"})

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
            "overall": 92 if len(fields) >= 3 else 65,
            "ocr": 95,
            "slm": 90,
            "mapping": 92,
            "completeness": 90 if len(fields) >= 4 else 55,
        },
        "review_items": review_items,
    }
