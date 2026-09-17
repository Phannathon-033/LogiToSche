from __future__ import annotations

import base64
import gc
import io
import os
import shutil
import subprocess
import sys
import tempfile
import time
import types
from pathlib import Path
from typing import Any

try:
    import psutil
except ImportError:
    psutil = None

import requests
from dotenv import load_dotenv
from PIL import Image
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

SERVER_START_TIME = time.time()

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / ".paddlex"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(CACHE_DIR))
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
os.environ.setdefault("PADDLE_PDX_DISABLE_MKLDNN_MODEL_BL", "True")

if "modelscope" not in sys.modules:
    sys.modules["modelscope"] = types.ModuleType("modelscope")

SITE_PACKAGES_DIR = (BASE_DIR / ".venv" / "Lib" / "site-packages").resolve()
for package in ("cublas", "cuda_runtime", "cudnn", "cufft", "curand", "cusolver", "cusparse", "nvjitlink"):
    dll_dir = SITE_PACKAGES_DIR / "nvidia" / package / "bin"
    if dll_dir.exists():
        if hasattr(os, "add_dll_directory"):
            try:
                os.add_dll_directory(str(dll_dir))
            except OSError:
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

app = FastAPI(title="LogiAI OCR Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def verify_gateway_token(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    public_paths = {"/docs", "/redoc", "/openapi.json", "/api/health", "/favicon.ico"}
    if request.url.path in public_paths:
        return await call_next(request)

    expected_token = os.environ.get("LOGIAI_GATEWAY_TOKEN", "").strip()
    if expected_token:
        token = request.headers.get("X-LogiAI-Token") or request.headers.get("x-logiai-token")
        if not token or token.strip() != expected_token:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized: Invalid or missing X-LogiAI-Token header"},
            )

    return await call_next(request)

SUPPORTED_LANGUAGES = {"th", "en"}
OCR_DEVICE = os.environ.get("LOGIAI_OCR_DEVICE", "gpu:0")
SLM_SERVICE_URL = os.environ.get("LOGIAI_SLM_URL", "http://127.0.0.1:8001")
_ocr_engines: dict[str, Any] = {}


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


def convert_pdf_to_image(pdf_bytes: bytes, page_num: int = 0) -> tuple[Image.Image, int]:
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(pdf_bytes)
        page_count = len(pdf)
        page = pdf[page_num if page_num < page_count else 0]
        return page.render(scale=2.0).to_pil().convert("RGB"), page_count
    except Exception:
        try:
            import fitz
            document = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = len(document)
            page = document[page_num if page_num < page_count else 0]
            pixmap = page.get_pixmap(dpi=150)
            return Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples), page_count
        except Exception as exc:
            raise ValueError(f"Failed to render PDF: {exc}") from exc


def convert_tiff_to_image(tiff_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(tiff_bytes)).convert("RGB")


def image_to_data_url(image: Image.Image, max_dimension: int = 1800) -> str:
    preview = image.copy()
    if max(preview.size) > max_dimension:
        preview.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    preview.save(buffer, format="PNG", optimize=True)
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('ascii')}"


def prepare_ocr_input(payload: bytes, suffix: str) -> tuple[Path, str, int]:
    page_count = 1
    image_preview = ""
    if suffix == ".pdf":
        preview, page_count = convert_pdf_to_image(payload)
        image_preview = image_to_data_url(preview)
        temp_suffix = ".png"
        temp_payload = io.BytesIO()
        preview.save(temp_payload, format="PNG")
        payload = temp_payload.getvalue()
    elif suffix in {".tif", ".tiff"}:
        preview = convert_tiff_to_image(payload)
        image_preview = image_to_data_url(preview)
        temp_suffix = ".png"
        temp_payload = io.BytesIO()
        preview.save(temp_payload, format="PNG")
        payload = temp_payload.getvalue()
    else:
        temp_suffix = suffix
        try:
            image_preview = image_to_data_url(Image.open(io.BytesIO(payload)).convert("RGB"))
        except Exception:
            pass

    with tempfile.NamedTemporaryFile(delete=False, suffix=temp_suffix) as tmp:
        tmp.write(payload)
        return Path(tmp.name), image_preview, page_count


@app.post("/api/render-pdf-preview")
async def render_pdf_preview(file: UploadFile = File(...)) -> dict[str, Any]:
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="ไฟล์ว่าง")
    suffix = Path(file.filename or "document").suffix.lower()
    try:
        if suffix == ".pdf":
            image, page_count = convert_pdf_to_image(payload)
            return {"image_preview": image_to_data_url(image), "page_count": page_count, "format": "pdf"}
        if suffix in {".tif", ".tiff"}:
            return {"image_preview": image_to_data_url(convert_tiff_to_image(payload)), "page_count": 1, "format": "tiff"}
        return {"image_preview": image_to_data_url(Image.open(io.BytesIO(payload)).convert("RGB")), "page_count": 1, "format": "image"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"ไม่สามารถสร้างภาพตัวอย่างได้: {exc}") from exc


class SlmPromptRequest(BaseModel):
    prompt_template_id: str = "custom"
    user_instruction: str = ""
    ocr_text: str = ""
    json_schema: dict[str, Any] = Field(default_factory=dict)
    system_instruction: str = ""


class SlmPromptConfig(BaseModel):
    system_prompt: str = Field(default="", min_length=1)
    fallback_rules: list[str] = Field(default_factory=list)
    confidence_threshold: int = 85
    selected_model: str = "qwen-2.5-1.5b"
    monitored_fields: list[str] = Field(default_factory=list)


@app.get("/api/health")
def health() -> dict[str, str]:
    cuda = bool(paddle is not None and paddle.device.is_compiled_with_cuda())
    status = "ready" if PaddleOCR is not None and cuda else "missing-gpu"
    return {
        "status": status,
        "service": "ocr",
        "engine": "PaddleOCR",
        "languages": "th,en",
        "device": OCR_DEVICE if cuda else "cpu",
        "cuda": str(cuda).lower(),
    }


@app.get("/api/slm/health")
def slm_health() -> dict[str, Any]:
    try:
        response = requests.get(f"{SLM_SERVICE_URL}/api/slm/health", timeout=5)
        return response.json()
    except requests.RequestException:
        return {"status": "unavailable", "service": "slm", "device": "unknown", "cuda": "false"}


@app.get("/api/system/health")
def system_health() -> dict[str, Any]:
    gpu_name = "NVIDIA GeForce RTX 3050 Laptop GPU"
    cuda_ver = "12.6"
    driver_ver = "Unknown"
    gpu_util = 0
    total_mb = 4096
    used_mb = 0
    free_mb = 4096

    nvidia_smi = shutil.which("nvidia-smi")
    if nvidia_smi:
        try:
            res = subprocess.run(
                [nvidia_smi, "--query-gpu=name,memory.total,memory.used,memory.free,driver_version,utilization.gpu", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=2
            )
            if res.returncode == 0 and res.stdout.strip():
                parts = [p.strip() for p in res.stdout.strip().split(",")]
                if len(parts) >= 6:
                    gpu_name = parts[0]
                    total_mb = int(parts[1])
                    used_mb = int(parts[2])
                    free_mb = int(parts[3])
                    driver_ver = parts[4]
                    gpu_util = int(parts[5])
        except Exception:
            pass

    used_gb = round(used_mb / 1024, 1)
    total_gb = round(total_mb / 1024, 1)
    vram_percent = round((used_mb / total_mb) * 100, 1) if total_mb > 0 else 0

    cuda_ocr = bool(paddle is not None and paddle.device.is_compiled_with_cuda())
    ocr_active = PaddleOCR is not None and cuda_ocr

    slm_active = False
    slm_model = "Qwen2.5-1.5B (FP16)"
    slm_device = "CUDA:0"
    try:
        r = requests.get(f"{SLM_SERVICE_URL}/api/slm/health", timeout=1.5)
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "ready":
                slm_active = True
                slm_model = "Qwen2.5-1.5B (FP16)"
                slm_device = str(data.get("device", "cuda:0")).upper()
    except Exception:
        slm_active = False

    if psutil:
        uptime_seconds = int(time.time() - psutil.boot_time())
    else:
        uptime_seconds = int(time.time() - SERVER_START_TIME)

    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    if days > 0:
        uptime_str = f"{days} วัน {hours} ชม. {minutes} นาที"
    elif hours > 0:
        uptime_str = f"{hours} ชม. {minutes} นาที"
    else:
        uptime_str = f"{minutes} นาที"

    all_active = ocr_active and slm_active

    return {
        "status": "all_active" if all_active else ("partial" if (ocr_active or slm_active) else "offline"),
        "status_label": "All systems active" if all_active else ("Degraded" if (ocr_active or slm_active) else "Systems offline"),
        "uptime_human": uptime_str,
        "uptime_seconds": uptime_seconds,
        "gpu": {
            "name": gpu_name,
            "engine": f"NVIDIA CUDA {cuda_ver}",
            "cuda_version": cuda_ver,
            "driver_version": driver_ver,
            "utilization": gpu_util,
            "status": "ACTIVE" if (ocr_active or slm_active) else "IDLE",
        },
        "vram": {
            "used_mb": used_mb,
            "total_mb": total_mb,
            "free_mb": free_mb,
            "used_gb": used_gb,
            "total_gb": total_gb,
            "label": f"{used_gb} GB / {total_gb} GB",
            "percent": vram_percent,
        },
        "ocr": {
            "engine": "PaddleOCR v4 (GPU)",
            "device": OCR_DEVICE if cuda_ocr else "CPU",
            "status": "ACTIVE" if ocr_active else "OFFLINE",
            "cuda": cuda_ocr,
        },
        "slm": {
            "model": slm_model,
            "device": slm_device,
            "status": "ACTIVE" if slm_active else "OFFLINE",
            "cuda": slm_active,
        },
    }


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
    tmp_path, image_preview, page_count = prepare_ocr_input(payload, suffix)
    try:
        lines = extract_lines(predict(engine, tmp_path))
        text = "\n".join(line["text"] for line in lines if line["text"])
        spatial_text = "\n".join(
            f"{line['position']['tag']} ({line['position']['region']}): {line['text']}"
            for line in lines
            if line["text"] and "position" in line and "tag" in line["position"]
        )
        return {
            "text": text,
            "spatial_text": spatial_text,
            "lines": lines,
            "engine": "PaddleOCR",
            "language": lang,
            "device": OCR_DEVICE,
            "image_preview": image_preview,
            "page_count": page_count,
        }
    finally:
        tmp_path.unlink(missing_ok=True)
        release_ocr_engines()


@app.post("/api/ocr/release")
def release_ocr() -> dict[str, str]:
    release_ocr_engines()
    return {"status": "released", "service": "ocr"}


@app.post("/api/slm/extract")
def slm_extract(payload: SlmExtractRequest) -> dict[str, Any]:
    return forward_slm_request("/api/slm/extract", payload.model_dump() if hasattr(payload, "model_dump") else payload.dict())


@app.post("/api/slm/execute-prompt")
def execute_slm_prompt(payload: SlmPromptRequest) -> dict[str, Any]:
    return forward_slm_request("/api/slm/execute-prompt", payload.model_dump() if hasattr(payload, "model_dump") else payload.dict())


@app.get("/api/slm/prompt-config")
def get_slm_prompt_config() -> dict[str, Any]:
    return forward_slm_request("/api/slm/prompt-config", {}, method="GET")


@app.post("/api/slm/prompt-config")
def save_slm_prompt_config(payload: SlmPromptConfig) -> dict[str, Any]:
    body = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    return forward_slm_request("/api/slm/prompt-config", body, method="POST")


@app.get("/api/slm/prompts")
def get_slm_prompts() -> list[dict[str, Any]]:
    return forward_slm_request("/api/slm/prompts", {}, method="GET")


@app.post("/api/slm/prompts")
def save_slm_prompts(payload: dict[str, Any]) -> dict[str, Any]:
    return forward_slm_request("/api/slm/prompts", payload, method="POST")


@app.post("/api/slm/prompts/reset")
def reset_slm_prompts() -> Any:
    return forward_slm_request("/api/slm/prompts/reset", {}, method="POST")


@app.get("/api/benchmark/ground-truth")
def get_benchmark_ground_truth() -> Any:
    return forward_slm_request("/api/benchmark/ground-truth", {}, method="GET")


@app.get("/api/benchmark/kfold")
def get_benchmark_kfold(k: int = 5, seed: int = 42, rerun: bool = False) -> Any:
    query = f"?k={k}&seed={seed}&rerun={str(rerun).lower()}"
    return forward_slm_request(f"/api/benchmark/kfold{query}", {}, method="GET")


@app.get("/api/benchmark/image/{file_name}")
def get_benchmark_image(file_name: str) -> Any:
    from fastapi.responses import FileResponse
    base_testing_dir = Path(r"E:\Logistics To JSON\To_Testing")
    safe_name = Path(file_name).name
    img_path = base_testing_dir / safe_name
    if not img_path.exists() or not img_path.is_file():
        raise HTTPException(status_code=404, detail=f"Image {safe_name} not found")
    media = "image/png" if safe_name.lower().endswith(".png") else "image/jpeg"
    return FileResponse(str(img_path), media_type=media)


class GroundTruthEntry(BaseModel):
    id: str | None = None
    file_name: str
    category: str = "invoice"
    ground_truth: dict[str, Any]


@app.post("/api/benchmark/save-ground-truth")
def save_benchmark_ground_truth(payload: GroundTruthEntry) -> Any:
    body = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    return forward_slm_request("/api/benchmark/save-ground-truth", body)


def forward_slm_request(path: str, body: dict[str, Any], method: str = "POST") -> Any:
    if method == "GET":
        try:
            response = requests.get(f"{SLM_SERVICE_URL}{path}", timeout=60)
            response.raise_for_status()
            value = response.json()
            if isinstance(value, (dict, list)):
                return value
        except (requests.RequestException, ValueError):
            raise HTTPException(status_code=503, detail="SLM service is unavailable")

    try:
        response = requests.post(f"{SLM_SERVICE_URL}{path}", json=body, timeout=120)
        response.raise_for_status()
        value = response.json()
        if isinstance(value, (dict, list)):
            return value
    except (requests.RequestException, ValueError):
        pass
    if path.endswith("/execute-prompt"):
        return {
            "result_text": "SLM service is unavailable. Please start the dedicated SLM service on port 8001.",
            "reasoning": "No dedicated SLM service response was available.",
            "category": body.get("prompt_template_id", "custom"),
            "model": "unavailable",
            "device": "cpu/fallback",
        }
    raise HTTPException(status_code=503, detail="SLM service is unavailable")


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
    raw_lines: list[dict[str, Any]] = []

    def walk(node: Any) -> None:
        if node is None:
            return
        if isinstance(node, dict):
            texts = first_present(node, "rec_texts", "rec_text", "texts")
            scores = first_present(node, "rec_scores", "rec_score", "scores") or []
            boxes = first_present(node, "rec_polys", "dt_polys", "rec_boxes", "boxes") or []
            if isinstance(texts, list):
                for index, text in enumerate(texts):
                    raw_lines.append({
                        "text": str(text).strip(),
                        "confidence": float(scores[index]) if index < len(scores) else 0.95,
                        "box": normalize_box(boxes[index]) if index < len(boxes) else None,
                    })
                return
            for value in node.values():
                walk(value)
            return
        if isinstance(node, (list, tuple)):
            if len(node) >= 2 and isinstance(node[1], (list, tuple)) and len(node[1]) >= 2 and isinstance(node[1][0], str):
                raw_lines.append({"text": str(node[1][0]).strip(), "confidence": float(node[1][1]), "box": normalize_box(node[0])})
                return
            for value in node:
                walk(value)

    walk(raw_result)
    all_xs = [point[0] for line in raw_lines if line.get("box") for point in line["box"]]
    all_ys = [point[1] for line in raw_lines if line.get("box") for point in line["box"]]
    max_w = max(all_xs) if all_xs else 1000.0
    max_h = max(all_ys) if all_ys else 1000.0
    lines = []
    for item in raw_lines:
        if not item["text"]:
            continue
        position = compute_position_info(item.get("box"), max_w, max_h)
        box = item.get("box") or []
        lines.append({"text": item["text"], "confidence": round(float(item["confidence"]), 2), "bounding_box": box, "box": box, "position": position})
    lines.sort(key=lambda line: (line["position"]["y"] // 15, line["position"]["x"]))
    return lines


def compute_position_info(box: list[list[float]] | None, max_w: float, max_h: float) -> dict[str, Any]:
    if not box or len(box) < 4:
        return {"x": 0, "y": 0, "width": 0, "height": 0, "region": "middle", "tag": "[y:0, x:0]"}
    try:
        xs = [float(point[0]) for point in box]
        ys = [float(point[1]) for point in box]
        min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        rel_y = center_y / max(max_h, 1)
        rel_x = center_x / max(max_w, 1)
        vertical = "top" if rel_y < 0.28 else "bottom" if rel_y > 0.72 else "middle"
        horizontal = "left" if rel_x < 0.35 else "right" if rel_x > 0.65 else "center"
        region = f"{vertical}-{horizontal}" if vertical != "middle" or horizontal != "center" else "middle"
        return {"x": round(min_x), "y": round(min_y), "width": round(max_x - min_x), "height": round(max_y - min_y), "center_x": round(center_x, 1), "center_y": round(center_y, 1), "region": region, "tag": f"[y:{round(min_y)}, x:{round(min_x)}]"}
    except (TypeError, ValueError, IndexError):
        return {"x": 0, "y": 0, "width": 0, "height": 0, "region": "middle", "tag": "[y:0, x:0]"}


def first_present(node: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if node.get(key) is not None:
            return node[key]
    return None


def normalize_box(box: Any) -> list[list[float]] | None:
    try:
        return [[float(point[0]), float(point[1])] for point in box]
    except (TypeError, ValueError, IndexError):
        return None
