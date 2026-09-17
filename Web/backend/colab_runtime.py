"""Google Colab runtime helpers for the local Gateway and private SLM service."""

from __future__ import annotations

import os
from pathlib import Path


DRIVE_ROOT = Path(os.environ.get("LOGIAI_DRIVE_ROOT", "/content/drive/MyDrive/LogiToSche"))
PROJECT_ROOT = Path(os.environ.get("LOGIAI_PROJECT_ROOT", Path(__file__).resolve().parent))


def configure_colab_environment() -> dict[str, str]:
    dataset = Path(os.environ.get("LOGIAI_DATASET_DIR", DRIVE_ROOT / "dataset"))
    ground_truth = Path(os.environ.get("LOGIAI_GROUND_TRUTH_PATH", DRIVE_ROOT / "ground_truth" / "ground_truth_dataset.json"))
    cache = Path(os.environ.get("LOGIAI_OCR_CACHE_DIR", DRIVE_ROOT / "ocr_cache"))
    reports = Path(os.environ.get("LOGIAI_REPORT_DIR", DRIVE_ROOT / "reports"))
    prompt_config = Path(os.environ.get("LOGIAI_PROMPT_CONFIG_PATH", DRIVE_ROOT / "config" / "prompts.json"))
    values = {
        "LOGIAI_DATASET_DIR": str(dataset),
        "LOGIAI_GROUND_TRUTH_PATH": str(ground_truth),
        "LOGIAI_OCR_CACHE_DIR": str(cache),
        "LOGIAI_REPORT_DIR": str(reports),
        "LOGIAI_PROMPT_CONFIG_PATH": str(prompt_config),
        "LOGIAI_SLM_URL": os.environ.get("LOGIAI_SLM_URL", "http://127.0.0.1:8001"),
        "LOGIAI_OCR_ENDPOINT": os.environ.get("LOGIAI_OCR_ENDPOINT", "http://127.0.0.1:8000/api/ocr"),
        "LOGIAI_SLM_ENDPOINT": os.environ.get("LOGIAI_SLM_ENDPOINT", "http://127.0.0.1:8000/api/slm/extract"),
    }
    for key, value in values.items():
        os.environ[key] = value
    for path in (dataset, ground_truth.parent, cache, reports, prompt_config.parent):
        path.mkdir(parents=True, exist_ok=True)
    return values


def service_commands() -> dict[str, str]:
    return {
        "slm": f"uvicorn slm_app:app --host 127.0.0.1 --port 8001",
        "gateway": f"uvicorn main:app --host 0.0.0.0 --port 8000",
    }


def mount_google_drive() -> str:
    try:
        from google.colab import drive
    except ImportError as exc:
        raise RuntimeError("mount_google_drive must run inside Google Colab") from exc
    drive.mount("/content/drive")
    return str(DRIVE_ROOT)


def gpu_health() -> dict[str, str]:
    try:
        import torch
        return {
            "cuda": str(torch.cuda.is_available()).lower(),
            "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
            "torch": torch.__version__,
        }
    except ImportError:
        return {"cuda": "false", "device": "unknown", "torch": "not-installed"}


if __name__ == "__main__":
    print(configure_colab_environment())
    print(gpu_health())
