from __future__ import annotations

import gc
import os
import re
import tempfile
import unicodedata
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / ".paddlex"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(CACHE_DIR))
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
os.environ.setdefault("PADDLE_PDX_DISABLE_MKLDNN_MODEL_BL", "True")

import sys
import types

# Mock modelscope before paddlex imports it to avoid PyTorch/Paddle DLL conflict
if "modelscope" not in sys.modules:
    sys.modules["modelscope"] = types.ModuleType("modelscope")

SITE_PACKAGES_DIR = (BASE_DIR / ".venv" / "Lib" / "site-packages").resolve()
for package in ("cublas", "cuda_runtime", "cudnn", "cufft", "curand", "cusolver", "cusparse", "nvjitlink"):
    dll_dir = SITE_PACKAGES_DIR / "nvidia" / package / "bin"
    if dll_dir.exists():
        try:
            os.add_dll_directory(str(dll_dir))
        except Exception:
            pass
        os.environ["PATH"] = f"{dll_dir}{os.pathsep}{os.environ.get('PATH', '')}"

try:
    import paddle
    from paddleocr import PaddleOCR
except Exception as exc:  # pragma: no cover - startup environment dependent
    paddle = None  # type: ignore[assignment]
    PaddleOCR = None  # type: ignore[assignment]
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None

app = FastAPI(title="LogiAI OCR Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGUAGES = {"th", "en"}
OCR_DEVICE = os.environ.get("LOGIAI_OCR_DEVICE", "gpu:0")
_ocr_engines: dict[str, Any] = {}


@app.get("/api/health")
def health() -> dict[str, str]:
    cuda = bool(paddle is not None and paddle.device.is_compiled_with_cuda())
    status = "ready" if PaddleOCR is not None and cuda else "missing-gpu"
    return {"status": status, "service": "ocr", "engine": "PaddleOCR", "languages": "th,en", "device": OCR_DEVICE, "cuda": str(cuda).lower()}


@app.post("/api/ocr")
async def ocr_document(file: UploadFile = File(...), lang: str = Form("th")) -> dict[str, Any]:
    lang = lang.lower().strip()
    suffix = Path(file.filename or "document").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".pdf", ".tif", ".tiff"}:
        raise HTTPException(status_code=415, detail="รองรับเฉพาะ PDF, JPG, JPEG, PNG และ TIF/TIFF")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="ไฟล์ว่าง")

    engine = get_engine(lang)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)

    try:
        from PIL import Image
        img_w, img_h = 1000, 1000
        try:
            with Image.open(tmp_path) as im:
                img_w, img_h = im.size
        except Exception:
            pass

        raw_result = predict(engine, tmp_path)
        lines = extract_lines(raw_result, img_w, img_h)
        text = "\n".join(line["text"] for line in lines if line["text"])
        return {
            "text": text,
            "lines": lines,
            "engine": "PaddleOCR",
            "language": lang,
            "device": OCR_DEVICE,
            "image_width": img_w,
            "image_height": img_h,
        }
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/api/ocr/release")
def release_ocr() -> dict[str, str]:
    release_ocr_engines()
    return {"status": "released", "service": "ocr"}


def get_engine(lang: str) -> Any:
    if PaddleOCR is None:
        raise HTTPException(status_code=503, detail=f"PaddleOCR failed to import: {IMPORT_ERROR}")
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
                text_det_limit_side_len=1536,
                text_det_limit_type="max",
                text_det_thresh=0.36,
                text_det_box_thresh=0.60,
                text_det_unclip_ratio=1.9,
                enable_mkldnn=False,
            )
        except TypeError:
            try:
                _ocr_engines[lang] = PaddleOCR(
                    lang=lang,
                    device=OCR_DEVICE,
                    text_det_limit_side_len=1536,
                    text_det_unclip_ratio=1.9,
                )
            except Exception:
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


def predict(engine: Any, path: Path) -> Any:
    if hasattr(engine, "predict"):
        return engine.predict(input=str(path))
    return engine.ocr(str(path), cls=True)


def compute_position_info(box: list[list[float]] | None, max_w: float = 1000.0, max_h: float = 1000.0) -> dict[str, Any]:
    if not box or len(box) < 4:
        return {"x": 0, "y": 0, "width": 0, "height": 0, "region": "middle", "tag": "[y:0, x:0]"}

    try:
        xs = [float(p[0]) for p in box]
        ys = [float(p[1]) for p in box]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max(0.0, max_x - min_x)
        h = max(0.0, max_y - min_y)
        cx = (min_x + max_x) / 2.0
        cy = (min_y + max_y) / 2.0

        rel_y = cy / max(max_h, 1.0)
        rel_x = cx / max(max_w, 1.0)

        if rel_y < 0.28:
            v_reg = "top"
        elif rel_y > 0.72:
            v_reg = "bottom"
        else:
            v_reg = "middle"

        if rel_x < 0.35:
            h_reg = "left"
        elif rel_x > 0.65:
            h_reg = "right"
        else:
            h_reg = "center"

        region = f"{v_reg}-{h_reg}" if v_reg != "middle" or h_reg != "center" else "middle"

        return {
            "x": int(round(min_x)),
            "y": int(round(min_y)),
            "width": int(round(w)),
            "height": int(round(h)),
            "region": region,
            "tag": f"[y:{int(round(min_y))}, x:{int(round(min_x))}]",
        }
    except Exception:
        return {"x": 0, "y": 0, "width": 0, "height": 0, "region": "middle", "tag": "[y:0, x:0]"}


THAI_VOWELS_ABOVE = r"[\u0E31\u0E34-\u0E37\u0E47\u0E4D]"  # ั, ิ, ี, ึ, ื, ็, ํ
THAI_TONE_MARKS = r"[\u0E48-\u0E4C]"  # ่, ้, ๊, ๋, ์

COMMON_OCR_WORD_MAP = {
    # PromptPay & Payment
    r"รหัสพร[ญ้]?\s*อมเพย[6b]": "รหัสพร้อมเพย์",
    r"รหัสพร[ญ้]?\s*อมเพย์": "รหัสพร้อมเพย์",
    r"รหัส\s*พรอ้มเพย์": "รหัสพร้อมเพย์",
    r"พร[ญ้]\s*อมเพย[6b]": "พร้อมเพย์",
    r"พร[ญ้]\s*อมเพย์": "พร้อมเพย์",
    r"พรอ้มเพย์": "พร้อมเพย์",
    r"พร้อมเพย[6b]": "พร้อมเพย์",
    r"พรญอม": "พร้อม",
    r"พร้\s+อม": "พร้อม",
    r"เพย[6b]\b": "เพย์",
    r"พร้อม\s*เพย์": "พร้อมเพย์",
    r"(?i)\bprompt\s*pay\b": "Prompt Pay",
    r"(?i)\bpromptpay\b": "PromptPay",

    # Invoice / Logistics terms
    r"ใบก[ำํ]\s*กับภาษี": "ใบกำกับภาษี",
    r"ใบกำกับ\s*ภาษี": "ใบกำกับภาษี",
    r"ใบเสร็จ\s*รับเงิน": "ใบเสร็จรับเงิน",
    r"ใบแจ[้ฐ]\s*งหนี[้6]": "ใบแจ้งหนี้",
    r"ใบส[่ฐ]\s*งสินค[้ฐ]า": "ใบส่งสินค้า",
    r"ใบส[ั่]\s*งซื้อ": "ใบสั่งซื้อ",
    r"ใบเสนอ\s*ราคา": "ใบเสนอราคา",
    r"ใบรับ\s*ของ": "ใบรับของ",
    r"ใบส[่ฐ]\s*งของ": "ใบส่งของ",

    # Thai common words with tone mark / thanthakhat errors
    r"วันที[6b]\b": "วันที่",
    r"เลขที[6b]\b": "เลขที่",
    r"เล่มที[6b]\b": "เล่มที่",
    r"หน[้ฐ]าที[6b]\b": "หน้าที่",
    r"สถานที[6b]\b": "สถานที่",
    r"ครั[ง้][6b]\s*ที[6b]": "ครั้งที่",
    r"ครั[ง้][6b]": "ครั้ง",
    r"ชิ[น้][6b]": "ชิ้น",
    r"ตั[ง้][6b]\s*แต[่ฐ]": "ตั้งแต่",
    r"ทั[ง้][6b]\s*หมด": "ทั้งหมด",
    r"ทั[ง้][6b]\s*สิ[น้][6b]": "ทั้งสิ้น",
    r"รวมทั[ง้][6b]\s*สิ[น้][6b]": "รวมทั้งสิ้น",
    r"รวมทั[ง้][6b]\s*หมด": "รวมทั้งหมด",
    r"รวมภาษีมูลค[่ฐ]าเพิ[ม้][6b]": "รวมภาษีมูลค่าเพิ่ม",
    r"ภาษีมูลค[่ฐ]าเพิ[ม้][6b]": "ภาษีมูลค่าเพิ่ม",
    r"มูลค[่ฐ]าเพิ[ม้][6b]": "มูลค่าเพิ่ม",
    r"เพิ[ม้][6b]": "เพิ่ม",
    r"เบอร[6b]\b": "เบอร์",
    r"เบอร[6b]\s*โทร": "เบอร์โทร",
    r"โทรศัพท[6b]\b": "โทรศัพท์",
    r"ศัพท[6b]\b": "ศัพท์",
    r"พิมพ[6b]\b": "พิมพ์",
    r"ออนไลน[6b]\b": "ออนไลน์",
    r"เว็บไซต[6b]\b": "เว็บไซต์",
    r"เวบไซต[6b]\b": "เว็บไซต์",
    r"อีเมล[6b]\b": "อีเมล์",
    r"เมล[6b]\b": "เมล์",
    r"ไปรษณีย[6b]\b": "ไปรษณีย์",
    r"ลิขสิทธ[6b]\b": "ลิขสิทธิ์",
    r"เครดิต\s*บูโร": "เครดิตบูโร",
    r"เคาน[6b์]?เตอร[6b]\b": "เคาน์เตอร์",
    r"เซ็นเตอร[6b]\b": "เซ็นเตอร์",
    r"คอมพิวเตอร[6b]\b": "คอมพิวเตอร์",
}

TARGET_PHRASE_PAIRS = [
    # English logistics & payments
    ("prompt", "pay", "Prompt Pay"),
    ("tax", "invoice", "Tax Invoice"),
    ("bill", "of", "lading", "Bill of Lading"),
    ("purchase", "order", "Purchase Order"),
    ("delivery", "order", "Delivery Order"),
    ("credit", "note", "Credit Note"),
    ("debit", "note", "Debit Note"),
    ("packing", "list", "Packing List"),
    ("total", "amount", "Total Amount"),
    ("due", "date", "Due Date"),
    ("invoice", "no", "Invoice No"),
    ("invoice", "date", "Invoice Date"),
    ("payment", "due", "Payment Due"),
    ("freight", "charges", "Freight Charges"),
    ("commercial", "invoice", "Commercial Invoice"),
    # Thai
    ("พร้อม", "เพย์", "พร้อมเพย์"),
    ("รหัส", "พร้อมเพย์", "รหัสพร้อมเพย์"),
    ("ใบเสร็จ", "รับเงิน", "ใบเสร็จรับเงิน"),
    ("ใบ", "เสร็จรับเงิน", "ใบเสร็จรับเงิน"),
    ("ใบกำกับ", "ภาษี", "ใบกำกับภาษี"),
    ("ใบ", "กำกับภาษี", "ใบกำกับภาษี"),
    ("ใบส่ง", "สินค้า", "ใบส่งสินค้า"),
    ("ใบแจ้ง", "หนี้", "ใบแจ้งหนี้"),
    ("ใบสั่ง", "ซื้อ", "ใบสั่งซื้อ"),
    ("ใบเสนอ", "ราคา", "ใบเสนอราคา"),
    ("สำนักงาน", "ใหญ่", "สำนักงานใหญ่"),
    ("รวมทั้ง", "สิ้น", "รวมทั้งสิ้น"),
    ("ภาษีมูลค่า", "เพิ่ม", "ภาษีมูลค่าเพิ่ม"),
    ("จำนวน", "เงิน", "จำนวนเงิน"),
]


def clean_thai_spaces(text: str) -> str:
    if not text:
        return ""
    # Remove any erroneous space between two Thai characters
    return re.sub(r"(?<=[\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])", "", text).strip()


def normalize_thai_ocr_text(text: str) -> str:
    if not text:
        return ""

    # 1. Clean spaces between Thai characters
    text = clean_thai_spaces(text)

    # 2. Unicode NFC normalization
    text = unicodedata.normalize("NFC", text)

    # 3. Fix Sara Am (ํ + า -> ำ)
    text = text.replace("\u0E4D\u0E32", "\u0E33")

    # 4. Fix misplaced tone marks and upper vowels
    text = re.sub(f"({THAI_TONE_MARKS})({THAI_VOWELS_ABOVE})", r"\2\1", text)

    # 5. Remove duplicate diacritics / tone marks
    text = re.sub(r"([\u0E48-\u0E4C])\1+", r"\1", text)
    text = re.sub(r"([\u0E31\u0E34-\u0E37])\1+", r"\1", text)

    # 6. Apply known regex replacements
    for pattern, replacement in COMMON_OCR_WORD_MAP.items():
        text = re.sub(pattern, replacement, text)

    # 7. Specific tone mark / diacritic confusion heuristics:
    text = re.sub(r"(?<![0-9\s])([ก-ฮ])6\b", r"\1์", text)
    text = re.sub(r"ที6\b", "ที่", text)
    text = re.sub(r"\bไดฐ\b", "ได้", text)
    text = re.sub(r"\bใหฐ\b", "ให้", text)
    text = re.sub(r"\bใชฐ\b", "ใช้", text)
    text = re.sub(r"\bผูฐ\b", "ผู้", text)

    return text.strip()


def get_box_bounds(box: list[list[float]]) -> tuple[float, float, float, float]:
    xs = [float(p[0]) for p in box]
    ys = [float(p[1]) for p in box]
    return min(xs), min(ys), max(xs), max(ys)


def is_noise_line(item: dict[str, Any]) -> bool:
    """Filter out dust specks, stray dots, and low-confidence isolated punctuation marks."""
    text = item.get("text", "").strip()
    if not text:
        return True

    conf = float(item.get("confidence", 0.0))
    b = item.get("box") or []

    w, h = 0.0, 0.0
    if len(b) >= 4:
        min_x, min_y, max_x, max_y = get_box_bounds(b)
        w = max_x - min_x
        h = max_y - min_y

    # Tiny dust specks (< 8x8 px)
    if w < 8 and h < 8:
        return True

    # Pure punctuation noise without any alphanumeric character
    clean_alnum = re.sub(r"[^\w\u0E00-\u0E7F0-9]", "", text)
    if not clean_alnum:
        return True

    # Single character noise with low confidence or stray symbols
    if len(text) == 1:
        if conf < 0.70 and text.lower() in {"r", "o", "c", "v", "x", "i", "l", "1", "~", "^", "`", "'", "\"", "-", ";", ":"}:
            return True
        if conf < 0.50:
            return True

    # Extremely low confidence
    if conf < 0.40:
        return True

    return False


def merge_two_boxes(item1: dict[str, Any], item2: dict[str, Any], merged_text: str | None = None) -> dict[str, Any]:
    box1 = item1["box"]
    box2 = item2["box"]
    min_x1, min_y1, max_x1, max_y1 = get_box_bounds(box1)
    min_x2, min_y2, max_x2, max_y2 = get_box_bounds(box2)

    merged_min_x = min(min_x1, min_x2)
    merged_min_y = min(min_y1, min_y2)
    merged_max_x = max(max_x1, max_x2)
    merged_max_y = max(max_y1, max_y2)

    merged_polygon = [
        [merged_min_x, merged_min_y],
        [merged_max_x, merged_min_y],
        [merged_max_x, merged_max_y],
        [merged_min_x, merged_max_y],
    ]

    t1 = item1["text"].strip()
    t2 = item2["text"].strip()

    if merged_text is None:
        is_thai1 = bool(re.search(r"[\u0E00-\u0E7F]", t1))
        is_thai2 = bool(re.search(r"[\u0E00-\u0E7F]", t2))
        if is_thai1 and is_thai2:
            merged_text = f"{t1}{t2}"
        else:
            merged_text = f"{t1} {t2}"

    c1 = item1.get("confidence", 0.9)
    c2 = item2.get("confidence", 0.9)
    len1 = max(len(t1), 1)
    len2 = max(len(t2), 1)
    merged_conf = round((c1 * len1 + c2 * len2) / (len1 + len2), 2)

    return {
        "text": normalize_thai_ocr_text(merged_text),
        "confidence": merged_conf,
        "box": merged_polygon,
        "bounding_box": merged_polygon,
    }


def merge_vertical_diacritics(raw_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Absorbs detached floating upper/lower vowels or tone marks into the base word underneath."""
    if len(raw_items) < 2:
        return raw_items

    items = list(raw_items)
    changed = True
    while changed:
        changed = False
        n = len(items)
        skip = set()
        new_items: list[dict[str, Any]] = []

        for i in range(n):
            if i in skip:
                continue
            item_a = items[i]
            b_a = item_a.get("box")
            if not b_a or len(b_a) < 4:
                new_items.append(item_a)
                continue

            t_a = item_a["text"].strip()
            min_x_a, min_y_a, max_x_a, max_y_a = get_box_bounds(b_a)
            cx_a = (min_x_a + max_x_a) / 2.0
            h_a = max_y_a - min_y_a

            merged = False
            # Check if item_a is an isolated diacritic/short mark above another box item_b
            is_diacritic_candidate = (
                len(t_a) <= 2
                and (
                    bool(re.search(r"^[\u0E30-\u0E3A\u0E47-\u0E4E]+$", t_a))
                    or t_a.lower() in {"r", "^", "~", "\"", "'", "“", "”", "6", "b", "`", "o", "."}
                )
            )

            if is_diacritic_candidate:
                for j in range(n):
                    if i == j or j in skip:
                        continue
                    item_b = items[j]
                    b_b = item_b.get("box")
                    if not b_b or len(b_b) < 4:
                        continue

                    min_x_b, min_y_b, max_x_b, max_y_b = get_box_bounds(b_b)
                    h_b = max_y_b - min_y_b

                    # Check if cx_a falls within horizontal span of box B
                    if (min_x_b - 5.0) <= cx_a <= (max_x_b + 5.0):
                        vert_gap = min_y_b - max_y_a
                        if -10.0 <= vert_gap <= (0.85 * h_b):
                            new_b = merge_two_boxes(item_b, item_a, item_b["text"])
                            items[j] = new_b
                            skip.add(i)
                            changed = True
                            merged = True
                            break

            if not merged:
                new_items.append(item_a)

        items = new_items

    return items


TARGET_PHRASE_RULES = [
    # English logistics & payment phrases
    ("prompt", "pay", "Prompt Pay"),
    ("prompt", "pay.", "Prompt Pay"),
    ("prompt", "pay:", "Prompt Pay:"),
    ("tax", "invoice", "Tax Invoice"),
    ("bill", "of lading", "Bill of Lading"),
    ("bill of", "lading", "Bill of Lading"),
    ("bill", "lading", "Bill of Lading"),
    ("purchase", "order", "Purchase Order"),
    ("delivery", "order", "Delivery Order"),
    ("credit", "note", "Credit Note"),
    ("debit", "note", "Debit Note"),
    ("packing", "list", "Packing List"),
    ("commercial", "invoice", "Commercial Invoice"),
    ("freight", "charges", "Freight Charges"),
    ("total", "amount", "Total Amount"),
    ("due", "date", "Due Date"),
    ("invoice", "no", "Invoice No"),
    ("invoice", "no.", "Invoice No."),
    ("invoice", "date", "Invoice Date"),
    ("payment", "due", "Payment Due"),
    # Thai compound phrases
    ("พร้อม", "เพย์", "พร้อมเพย์"),
    ("รหัส", "พร้อมเพย์", "รหัสพร้อมเพย์"),
    ("รหัสพร้อม", "เพย์", "รหัสพร้อมเพย์"),
    ("ใบเสร็จ", "รับเงิน", "ใบเสร็จรับเงิน"),
    ("ใบ", "เสร็จรับเงิน", "ใบเสร็จรับเงิน"),
    ("ใบกำกับ", "ภาษี", "ใบกำกับภาษี"),
    ("ใบ", "กำกับภาษี", "ใบกำกับภาษี"),
    ("ใบส่ง", "สินค้า", "ใบส่งสินค้า"),
    ("ใบแจ้ง", "หนี้", "ใบแจ้งหนี้"),
    ("ใบสั่ง", "ซื้อ", "ใบสั่งซื้อ"),
    ("ใบเสนอ", "ราคา", "ใบเสนอราคา"),
    ("สำนักงาน", "ใหญ่", "สำนักงานใหญ่"),
    ("ภาษีมูลค่า", "เพิ่ม", "ภาษีมูลค่าเพิ่ม"),
    ("รวมทั้ง", "สิ้น", "รวมทั้งสิ้น"),
    ("จำนวน", "เงิน", "จำนวนเงิน"),
    ("ราคาต่อ", "หน่วย", "ราคาต่อหน่วย"),
    ("ราคารวม", "ทั้งสิ้น", "ราคารวมทั้งสิ้น"),
]


def can_merge_compound_phrase(item1: dict[str, Any], item2: dict[str, Any]) -> tuple[bool, str | None]:
    """
    Checks if item1 and item2 form a compound phrase (e.g. Prompt + Pay),
    whether horizontally adjacent on the SAME line OR vertically stacked on CONSECUTIVE lines.
    """
    t1 = item1["text"].strip().lower()
    t2 = item2["text"].strip().lower()

    target_matched = None
    for p1, p2, out in TARGET_PHRASE_RULES:
        if (t1 == p1 and t2 == p2) or (t1.endswith(p1) and t2.startswith(p2)):
            target_matched = out
            break

    if not target_matched:
        return False, None

    b1, b2 = item1.get("box"), item2.get("box")
    if not b1 or not b2 or len(b1) < 4 or len(b2) < 4:
        return False, None

    min_x1, min_y1, max_x1, max_y1 = get_box_bounds(b1)
    min_x2, min_y2, max_x2, max_y2 = get_box_bounds(b2)

    h1 = max(1.0, max_y1 - min_y1)
    h2 = max(1.0, max_y2 - min_y2)
    ref_h = max(h1, h2)

    # Condition A: Same line (horizontal adjacency)
    v_overlap = max(0.0, min(max_y1, max_y2) - max(min_y1, min_y2))
    v_overlap_ratio = v_overlap / min(h1, h2)
    gap_x = min_x2 - max_x1

    if v_overlap_ratio >= 0.25 and -20.0 <= gap_x <= (4.5 * ref_h):
        return True, target_matched

    # Condition B: Different lines / Consecutive lines (item2 is on the next line below item1)
    vert_gap = min_y2 - max_y1
    if -10.0 <= vert_gap <= (2.2 * ref_h):
        cx1 = (min_x1 + max_x1) / 2.0
        cx2 = (min_x2 + max_x2) / 2.0
        x_dist = min(abs(min_x1 - min_x2), abs(cx1 - cx2))
        if x_dist <= (3.5 * ref_h) or (max(min_x1, min_x2) <= min(max_x1, max_x2) + (2.0 * ref_h)):
            return True, target_matched

    return False, None


def merge_leading_vowels(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merges detached leading Thai vowels (เ, แ, โ, ใ, ไ) with their following consonant on the same line."""
    if len(items) < 2:
        return items

    changed = True
    result = list(items)
    while changed:
        changed = False
        n = len(result)
        skip = set()
        new_items = []
        for i in range(n):
            if i in skip:
                continue
            curr = result[i]
            t = curr["text"].strip()
            if re.match(r"^[เแโใไ]$", t):
                b_curr = curr.get("box")
                if b_curr and len(b_curr) >= 4:
                    min_x1, min_y1, max_x1, max_y1 = get_box_bounds(b_curr)
                    h1 = max(1.0, max_y1 - min_y1)
                    for j in range(n):
                        if i == j or j in skip:
                            continue
                        cand = result[j]
                        b_cand = cand.get("box")
                        if not b_cand or len(b_cand) < 4:
                            continue
                        min_x2, min_y2, max_x2, max_y2 = get_box_bounds(b_cand)
                        h2 = max(1.0, max_y2 - min_y2)
                        v_overlap = max(0.0, min(max_y1, max_y2) - max(min_y1, min_y2))
                        if v_overlap / min(h1, h2) >= 0.30 and -10.0 <= (min_x2 - max_x1) <= (1.8 * max(h1, h2)):
                            curr = merge_two_boxes(curr, cand, f"{t}{cand['text'].strip()}")
                            skip.add(j)
                            changed = True
                            break
            new_items.append(curr)
        result = new_items
    return result


def process_word_level_with_compounds(raw_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Keeps detected words separated as distinct word-level boxes,
    BUT connects compound phrases like 'Prompt Pay' even if they are on different lines.
    """
    if not raw_items:
        return []

    valid_items = [it for it in raw_items if it.get("text", "").strip() and it.get("box")]

    items = list(valid_items)
    changed = True
    while changed:
        changed = False
        n = len(items)
        skip = set()
        new_items = []

        for i in range(n):
            if i in skip:
                continue
            curr = items[i]
            for j in range(n):
                if i == j or j in skip:
                    continue
                can_merge, out_text = can_merge_compound_phrase(curr, items[j])
                if can_merge:
                    curr = merge_two_boxes(curr, items[j], out_text)
                    skip.add(j)
                    changed = True
            new_items.append(curr)
        items = new_items

    items.sort(key=lambda it: (get_box_bounds(it["box"])[1] // 15, get_box_bounds(it["box"])[0]))
    return items


def extract_lines(raw_result: Any, img_w: int = 1000, img_h: int = 1000) -> list[dict[str, Any]]:
    raw_lines: list[dict[str, Any]] = []

    def walk(node: Any) -> None:
        if node is None:
            return
        if isinstance(node, dict):
            texts = first_present(node, "rec_texts", "texts")
            scores = first_present(node, "rec_scores", "scores")
            boxes = first_present(node, "rec_polys", "dt_polys", "rec_boxes", "boxes")
            if scores is None:
                scores = []
            if boxes is None:
                boxes = []
            if isinstance(texts, list):
                for index, text in enumerate(texts):
                    b = normalize_box(boxes[index]) if index < len(boxes) else None
                    raw_lines.append(
                        {
                            "text": normalize_thai_ocr_text(str(text)),
                            "confidence": float(scores[index]) if index < len(scores) else 0.0,
                            "box": b,
                            "bounding_box": b,
                        }
                    )
                return
            for value in node.values():
                walk(value)
            return
        if isinstance(node, (list, tuple)):
            if len(node) >= 2 and isinstance(node[1], (list, tuple)) and len(node[1]) >= 2 and isinstance(node[1][0], str):
                b = normalize_box(node[0])
                raw_lines.append({
                    "text": normalize_thai_ocr_text(str(node[1][0])),
                    "confidence": float(node[1][1]),
                    "box": b,
                    "bounding_box": b,
                })
                return
            for value in node:
                walk(value)

    walk(raw_result)

    # Filter out empty texts
    valid_raw_lines = [item for item in raw_lines if item["text"]]

    # 1. Absorb detached vertical diacritics / upper tone marks into the base word underneath
    with_vowels_absorbed = merge_vertical_diacritics(valid_raw_lines)

    # 2. Merge detached leading Thai vowels (เ, แ, โ, ใ, ไ) with following consonant
    with_leading_vowels = merge_leading_vowels(with_vowels_absorbed)

    # 3. Process as word-level boxes while merging compound phrases (Prompt Pay, etc.)
    # even if they are on different lines!
    word_level_lines = process_word_level_with_compounds(with_leading_vowels)

    # 4. Filter out stray noise and low-confidence non-alphanumeric artifacts
    clean_lines = [item for item in word_level_lines if not is_noise_line(item)]

    all_xs = [p[0] for line in clean_lines if line.get("box") for p in line["box"]]
    all_ys = [p[1] for line in clean_lines if line.get("box") for p in line["box"]]
    max_w = float(img_w) if img_w > 0 else (max(all_xs) if all_xs else 1000.0)
    max_h = float(img_h) if img_h > 0 else (max(all_ys) if all_ys else 1000.0)

    lines: list[dict[str, Any]] = []
    for item in clean_lines:
        cleaned_text = normalize_thai_ocr_text(item["text"])
        if not cleaned_text:
            continue
        pos = compute_position_info(item.get("box"), max_w, max_h)
        b_box = item.get("box") or []
        conf_val = round(float(item["confidence"]), 2)
        lines.append({
            "text": cleaned_text,
            "confidence": conf_val,
            "bounding_box": b_box,
            "box": b_box,
            "position": pos,
        })

    # Sort lines spatially: top-to-bottom (y), then left-to-right (x)
    lines.sort(key=lambda l: (l["position"]["y"] // 15, l["position"]["x"]))
    return lines


def first_present(node: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in node and node[key] is not None:
            return node[key]
    return None


def normalize_box(box: Any) -> Any:
    if box is None:
        return None
    try:
        if hasattr(box, "tolist"):
            box = box.tolist()
        if not isinstance(box, (list, tuple)):
            return None
        # Case 1: [xmin, ymin, xmax, ymax]
        if len(box) == 4 and not isinstance(box[0], (list, tuple)):
            xmin, ymin, xmax, ymax = float(box[0]), float(box[1]), float(box[2]), float(box[3])
            return [
                [xmin, ymin],
                [xmax, ymin],
                [xmax, ymax],
                [xmin, ymax],
            ]
        # Case 2: [[x1, y1], [x2, y2], ...]
        if len(box) >= 4 and isinstance(box[0], (list, tuple)):
            return [[float(point[0]), float(point[1])] for point in box]
        return None
    except Exception:
        return None
