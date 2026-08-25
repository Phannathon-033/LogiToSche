from __future__ import annotations

import gc
import os
import tempfile
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
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
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
        return {"text": text, "lines": lines, "engine": "PaddleOCR", "language": lang, "device": OCR_DEVICE}
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
                lines.append({"text": node[1][0], "confidence": float(node[1][1]), "box": normalize_box(node[0])})
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
