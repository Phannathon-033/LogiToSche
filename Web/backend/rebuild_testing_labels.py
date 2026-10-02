"""Rebuild To_Testing labels from actual images using live OCR + SLM.

Backs up current labels before overwrite. Designed for the thesis benchmark dataset.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import pathlib
import re
import shutil
import sys
import time
from datetime import datetime
from typing import Any

import requests

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent
DATASET_DIR = pathlib.Path(os.environ.get("LOGIAI_DATASET_DIR", PROJECT_ROOT / "To_Testing"))
LABELS_DIR = DATASET_DIR / "labels_json"
BACKUP_ROOT = DATASET_DIR / "label_backups"
MASTER_JSON = DATASET_DIR / "ground_truth_300.json"
MASTER_CSV = DATASET_DIR / "ground_truth_300.csv"
CHECKPOINT_FILE = DATASET_DIR / "corrected_checkpoint.json"
REPORT_FILE = DATASET_DIR / "label_correction_report.json"
BACKEND_GT_FILE = BASE_DIR / "ground_truth_dataset.json"
OCR_URL = os.environ.get("LOGIAI_OCR_ENDPOINT", "http://127.0.0.1:8000/api/ocr")
SLM_URL = os.environ.get("LOGIAI_SLM_ENDPOINT", os.environ.get("LOGIAI_SLM_URL", "http://127.0.0.1:8001") + "/api/slm/extract")
API_TOKEN = os.environ.get("LOGIAI_GATEWAY_TOKEN", "").strip()
HEADERS = {"X-LogiAI-Token": API_TOKEN} if API_TOKEN else {}

CORE_FIELDS = [
    "document_type",
    "document_number",
    "document_date",
    "sender",
    "receiver",
    "origin",
    "destination",
    "reference_number",
    "unit_price",
    "total_amount",
    "currency",
]

ALIASES = {
    "document_number": ("document_number", "document_no", "invoice_no"),
    "sender": ("sender", "party_name"),
    "receiver": ("receiver", "receiver_name"),
}

CURRENCY_CODES = {"THB", "USD", "EUR", "JPY", "GBP", "CNY", "SGD", "MYR", "HKD", "VND"}


def endpoint_root(url: str) -> str:
    return url.rsplit("/api/", 1)[0]


def check_services() -> None:
    checks = [("OCR", endpoint_root(OCR_URL) + "/api/health"), ("SLM", endpoint_root(SLM_URL) + "/api/slm/health")]
    for name, url in checks:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()
        print(f"[{name}] {data}")
        if name == "OCR" and data.get("status") != "ready":
            raise RuntimeError(f"OCR service is not ready: {data}")
        if name == "SLM" and data.get("status") not in {"ready", "missing-model"}:
            raise RuntimeError(f"SLM service is not ready: {data}")


def copy_path(src: pathlib.Path, dst: pathlib.Path) -> None:
    if not src.exists():
        return
    if src.is_dir():
        shutil.copytree(src, dst)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def backup_existing() -> pathlib.Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_ROOT / stamp
    dest.mkdir(parents=True, exist_ok=False)
    copy_path(LABELS_DIR, dest / "labels_json")
    copy_path(MASTER_JSON, dest / MASTER_JSON.name)
    copy_path(MASTER_CSV, dest / MASTER_CSV.name)
    copy_path(BACKEND_GT_FILE, dest / "backend_ground_truth_dataset.json")
    print(f"[backup] {dest}")
    return dest


def load_json(path: pathlib.Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else default
    except Exception:
        return default


def old_label_for(stem: str) -> dict[str, Any]:
    return load_json(LABELS_DIR / f"{stem}.json", {})


def value_from(schema: dict[str, Any], field: str) -> Any:
    for key in ALIASES.get(field, (field,)):
        value = schema.get(key)
        if value not in (None, "", [], {}):
            return value
    return schema.get(field)


def clean_text(value: Any) -> str:
    if value is None:
        return "-"
    text = str(value).strip()
    return text if text and text.lower() not in {"none", "null", "n/a"} else "-"


def clean_number(value: Any) -> float | str:
    if value in (None, "", "-", "N/A"):
        return "-"
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    text = str(value).strip().replace("$", "").replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return round(float(match.group(0)), 2) if match else "-"


def clean_currency(value: Any) -> str:
    text = clean_text(value).upper()
    if text == "-":
        return "-"
    if text in CURRENCY_CODES:
        return text
    if "$" in text or "DOLLAR" in text:
        return "USD"
    if "BAHT" in text or "บาท" in text or "฿" in text:
        return "THB"
    return text[:3] if len(text) >= 3 else text


def clean_date(value: Any) -> str:
    text = clean_text(value)
    if text == "-":
        return "-"
    iso = re.search(r"(19\d{2}|20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})", text)
    if iso:
        return f"{iso.group(1)}-{int(iso.group(2)):02d}-{int(iso.group(3)):02d}"
    dmy = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})", text)
    if dmy:
        year = int(dmy.group(3))
        if year < 100:
            year = 1900 + year if year > 40 else 2000 + year
        if year > 2400:
            year -= 543
        return f"{year}-{int(dmy.group(2)):02d}-{int(dmy.group(1)):02d}"
    return text


def canonicalize(schema: dict[str, Any]) -> dict[str, Any]:
    doc_type = clean_text(value_from(schema, "document_type")).lower().replace(" ", "_")
    if doc_type in {"commercial_invoice", "tax_invoice"}:
        doc_type = "invoice"
    result = {
        "document_type": doc_type if doc_type != "-" else "invoice",
        "document_number": clean_text(value_from(schema, "document_number")),
        "document_date": clean_date(value_from(schema, "document_date")),
        "sender": clean_text(value_from(schema, "sender")),
        "receiver": clean_text(value_from(schema, "receiver")),
        "origin": clean_text(value_from(schema, "origin")),
        "destination": clean_text(value_from(schema, "destination")),
        "reference_number": clean_text(value_from(schema, "reference_number")),
        "unit_price": clean_number(value_from(schema, "unit_price")),
        "total_amount": clean_number(value_from(schema, "total_amount")),
        "currency": clean_currency(value_from(schema, "currency")),
    }
    return result


def filled_count(gt: dict[str, Any]) -> int:
    count = 0
    for field in CORE_FIELDS:
        value = gt.get(field)
        if value not in (None, "", "-", "N/A"):
            count += 1
    return count


def request_ocr(image_path: pathlib.Path) -> dict[str, Any]:
    with image_path.open("rb") as fh:
        response = requests.post(
            OCR_URL,
            files={"file": (image_path.name, fh, "image/png")},
            data={"lang": "en"},
            headers=HEADERS,
            timeout=float(os.environ.get("LOGIAI_OCR_TIMEOUT", "300")),
        )
    response.raise_for_status()
    return response.json()


def request_slm(image_path: pathlib.Path, old: dict[str, Any], ocr: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "document_type_hint": old.get("category", "Invoice"),
        "source_file": image_path.name,
        "ocr_text": ocr.get("text") or "-",
        "ocr_lines": ocr.get("lines") or [],
        "benchmark_prompt_variant": "zero-shot",
    }
    response = requests.post(
        SLM_URL,
        json=payload,
        headers=HEADERS,
        timeout=float(os.environ.get("LOGIAI_SLM_TIMEOUT", "300")),
    )
    response.raise_for_status()
    return response.json()


def build_entry(image_path: pathlib.Path, rank: int, old: dict[str, Any], schema: dict[str, Any], confidence: dict[str, Any]) -> dict[str, Any]:
    gt = canonicalize(schema)
    fill = filled_count(gt)
    completeness = round(fill / len(CORE_FIELDS) * 100)
    overall = confidence.get("overall") if isinstance(confidence, dict) else None
    if not isinstance(overall, (int, float)):
        overall = completeness
    return {
        "id": old.get("id") or f"DOC-{rank:03d}",
        "rank": int(old.get("rank") or rank),
        "file_name": image_path.name,
        "category": old.get("category") or "commercial_invoice",
        "ground_truth": gt,
        "confidence": {
            "overall": round(float(overall), 2),
            "ocr": confidence.get("ocr", 95) if isinstance(confidence, dict) else 95,
            "slm": confidence.get("slm", overall) if isinstance(confidence, dict) else overall,
            "mapping": confidence.get("mapping", overall) if isinstance(confidence, dict) else overall,
            "completeness": completeness,
        },
        "annotated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def changed_fields(old: dict[str, Any], new: dict[str, Any]) -> list[str]:
    old_gt = old.get("ground_truth", {}) if isinstance(old, dict) else {}
    return [field for field in CORE_FIELDS if str(old_gt.get(field, "-")) != str(new.get("ground_truth", {}).get(field, "-"))]


def load_existing_results(images: list[pathlib.Path]) -> dict[str, dict[str, Any]]:
    results = {}
    for rank, image_path in enumerate(images, start=1):
        old = old_label_for(image_path.stem)
        if old:
            results[image_path.name] = old
        else:
            results[image_path.name] = build_entry(image_path, rank, {}, {}, {})
    return results


def write_outputs(results: dict[str, dict[str, Any]]) -> None:
    items = sorted(results.values(), key=lambda item: int(item.get("rank", 0)))
    LABELS_DIR.mkdir(parents=True, exist_ok=True)
    for item in items:
        stem = pathlib.Path(item["file_name"]).stem
        (LABELS_DIR / f"{stem}.json").write_text(json.dumps(item, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    master = {
        "dataset_name": "Logistics Invoice Ground Truth Dataset (300 Documents - 11 Core Fields)",
        "version": "1.0",
        "total_documents": len(items),
        "core_fields": CORE_FIELDS,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "documents": items,
    }
    MASTER_JSON.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    BACKEND_GT_FILE.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with MASTER_CSV.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.writer(fh)
        writer.writerow(["rank", "id", "file_name", *CORE_FIELDS, "overall_confidence", "completeness"])
        for item in items:
            gt = item["ground_truth"]
            conf = item.get("confidence", {})
            writer.writerow([item["rank"], item["id"], item["file_name"], *[gt.get(field, "-") for field in CORE_FIELDS], conf.get("overall", 0), conf.get("completeness", 0)])


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild To_Testing labels from live OCR + SLM")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N images")
    parser.add_argument("--start", type=int, default=1, help="Start rank, 1-based")
    parser.add_argument("--force", action="store_true", help="Ignore corrected checkpoint and rebuild selected range")
    parser.add_argument("--no-backup", action="store_true", help="Skip backup only for controlled dry runs")
    args = parser.parse_args()

    images = sorted(DATASET_DIR.glob("*.png"))
    if not images:
        raise SystemExit(f"No PNG images found in {DATASET_DIR}")
    selected = [(idx, path) for idx, path in enumerate(images, start=1) if idx >= args.start]
    if args.limit:
        selected = selected[: args.limit]
    print(f"[dataset] {DATASET_DIR} | images={len(images)} | selected={len(selected)}")

    check_services()
    if not args.no_backup:
        backup_existing()

    checkpoint = {} if args.force else load_json(CHECKPOINT_FILE, {})
    results = load_existing_results(images)
    corrected_keys = set()
    for key, item in checkpoint.items() if isinstance(checkpoint, dict) else []:
        if isinstance(item, dict):
            results[str(key)] = item
            corrected_keys.add(str(key))
    report = {"started_at": datetime.now().isoformat(), "processed": [], "failed": []}

    for rank, image_path in selected:
        old = old_label_for(image_path.stem)
        key = image_path.name
        if key in corrected_keys and not args.force:
            print(f"[{rank:03d}] skip checkpoint {key}")
            continue
        t0 = time.time()
        print(f"[{rank:03d}/{len(images)}] {key} ... ", end="", flush=True)
        try:
            ocr = request_ocr(image_path)
            if not (ocr.get("text") or ocr.get("lines")):
                raise RuntimeError("OCR returned empty text and lines")
            slm = request_slm(image_path, old, ocr)
            schema = slm.get("json_schema")
            if not isinstance(schema, dict) or not schema:
                raise RuntimeError("SLM returned empty json_schema")
            entry = build_entry(image_path, rank, old, schema, slm.get("confidence", {}))
            changes = changed_fields(old, entry)
            results[key] = entry
            corrected_keys.add(key)
            CHECKPOINT_FILE.write_text(json.dumps({k: results[k] for k in sorted(corrected_keys)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            elapsed = round(time.time() - t0, 2)
            report["processed"].append({"file_name": key, "rank": rank, "seconds": elapsed, "changed_fields": changes, "filled": filled_count(entry["ground_truth"])})
            print(f"ok {elapsed}s | filled {filled_count(entry['ground_truth'])}/11 | changed {len(changes)}")
        except Exception as exc:
            elapsed = round(time.time() - t0, 2)
            if old:
                results[key] = old
            report["failed"].append({"file_name": key, "rank": rank, "seconds": elapsed, "error": str(exc)})
            print(f"failed: {exc}")

    write_outputs(results)
    report["finished_at"] = datetime.now().isoformat()
    report["total_results"] = len(results)
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[done] labels={len(results)} report={REPORT_FILE}")


if __name__ == "__main__":
    main()
