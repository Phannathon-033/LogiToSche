"""
Batch Ground Truth Label Generator for 300 Logistics Invoices
------------------------------------------------------------
Processes 300 images in E:\\Logistics To JSON\\To_Testing:
  1. OCR via PaddleOCR (port 8000)
  2. Extraction via SLM Engine (port 8001)
  3. Saves:
     - E:\\Logistics To JSON\\To_Testing\\ground_truth_300.json (Master Dataset)
     - E:\\Logistics To JSON\\To_Testing\\ground_truth_300.csv (Excel / Tabular format)
     - E:\\Logistics To JSON\\To_Testing\\labels_json/<doc_name>.json (Individual JSON per image)
     - Updates Web\\backend\\ground_truth_dataset.json (for Web UI & K-Fold Benchmark)
"""

import os
import sys
import glob
import json
import time
import base64
import csv
import pathlib
import requests

# Ensure UTF-8 output on Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_DIR = pathlib.Path(__file__).resolve().parent
TEST_DIR = pathlib.Path(r"E:\Logistics To JSON\To_Testing")
LABELS_JSON_DIR = TEST_DIR / "labels_json"
LABELS_JSON_DIR.mkdir(parents=True, exist_ok=True)

MASTER_JSON = TEST_DIR / "ground_truth_300.json"
MASTER_CSV = TEST_DIR / "ground_truth_300.csv"
CHECKPOINT_FILE = TEST_DIR / "checkpoint_progress.json"
BACKEND_GT_FILE = BASE_DIR / "ground_truth_dataset.json"

OCR_URL = "http://127.0.0.1:8000/api/ocr"
SLM_URL = "http://127.0.0.1:8001/api/slm/extract"

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
    "currency"
]


def load_checkpoint() -> dict:
    if CHECKPOINT_FILE.exists():
        try:
            return json.loads(CHECKPOINT_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_checkpoint(data: dict):
    CHECKPOINT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def export_master_files(results_dict: dict):
    # Sort by rank
    items = sorted(results_dict.values(), key=lambda x: x["rank"])
    
    # 1. Master JSON
    master_obj = {
        "dataset_name": "Logistics Invoice Ground Truth Dataset (300 Documents - 11 Core Fields)",
        "version": "1.0",
        "total_documents": len(items),
        "core_fields": CORE_FIELDS,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "documents": items
    }
    MASTER_JSON.write_text(json.dumps(master_obj, indent=2, ensure_ascii=False), encoding="utf-8")

    # 2. Master CSV
    with open(MASTER_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        header = ["rank", "id", "file_name"] + CORE_FIELDS + ["overall_confidence", "completeness"]
        writer.writerow(header)
        for doc in items:
            gt = doc.get("ground_truth", {})
            conf = doc.get("confidence", {})
            row = [
                doc.get("rank", 0),
                doc.get("id", ""),
                doc.get("file_name", ""),
            ] + [gt.get(field, "") for field in CORE_FIELDS] + [
                conf.get("overall", 0),
                conf.get("completeness", 0)
            ]
            writer.writerow(row)

    # 3. Also update backend ground_truth_dataset.json for the Web UI
    BACKEND_GT_FILE.write_text(json.dumps(master_obj, indent=2, ensure_ascii=False), encoding="utf-8")


def process_image(img_path: pathlib.Path, rank: int) -> dict:
    doc_id = f"DOC-{rank:03d}"
    file_name = img_path.name
    
    # Read image bytes
    img_bytes = img_path.read_bytes()
    b64_str = base64.b64encode(img_bytes).decode("utf-8")

    # 1. OCR Request
    ocr_text = ""
    try:
        resp = requests.post(
            OCR_URL,
            data={"lang": "en"},
            files={"file": (file_name, img_bytes, "image/png")},
            timeout=60
        )
        if resp.status_code == 200:
            ocr_text = resp.json().get("text", "")
    except Exception as exc:
        print(f"  [!] OCR error on {file_name}: {exc}")

    # 2. SLM Extraction Request
    ground_truth = {f: "-" for f in CORE_FIELDS}
    confidence = {"overall": 0, "completeness": 0}
    try:
        slm_payload = {
            "ocr_text": ocr_text,
            "image_base64": b64_str
        }
        slm_resp = requests.post(SLM_URL, json=slm_payload, timeout=60)
        if slm_resp.status_code == 200:
            res_data = slm_resp.json()
            schema = res_data.get("json_schema", {})
            for f in CORE_FIELDS:
                ground_truth[f] = schema.get(f, "-")
            confidence = res_data.get("confidence", {})
    except Exception as exc:
        print(f"  [!] SLM error on {file_name}: {exc}")

    # 3. Individual JSON file
    doc_entry = {
        "id": doc_id,
        "rank": rank,
        "file_name": file_name,
        "category": "commercial_invoice",
        "ground_truth": ground_truth,
        "confidence": confidence,
        "annotated_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    indiv_file = LABELS_JSON_DIR / f"{img_path.stem}.json"
    indiv_file.write_text(json.dumps(doc_entry, indent=2, ensure_ascii=False), encoding="utf-8")

    return doc_entry


def main():
    print("=" * 70)
    print("🚀 STARTING AUTOMATED 300-INVOICE GROUND TRUTH LABEL GENERATION")
    print(f"📁 Target Folder: {TEST_DIR}")
    print(f"📋 11 Core Fields: {', '.join(CORE_FIELDS)}")
    print("=" * 70)

    # Find all 300 images
    all_pngs = sorted(glob.glob(str(TEST_DIR / "*.png")))
    total_imgs = len(all_pngs)
    print(f"🔍 Found {total_imgs} images to process.")

    checkpoint = load_checkpoint()
    print(f"💾 Checkpoint: {len(checkpoint)} images already processed previously.")

    start_time = time.time()

    for idx, png_str in enumerate(all_pngs, start=1):
        png_path = pathlib.Path(png_str)
        fname = png_path.name

        if fname in checkpoint:
            continue

        t0 = time.time()
        print(f"[{idx:03d}/{total_imgs}] Processing {fname}...", end="", flush=True)
        
        entry = process_image(png_path, rank=idx)
        checkpoint[fname] = entry
        
        # Save checkpoint periodically
        if idx % 5 == 0 or idx == total_imgs:
            save_checkpoint(checkpoint)
            export_master_files(checkpoint)
        
        elapsed = time.time() - t0
        print(f" Done in {elapsed:.2f}s | DocNo: {entry['ground_truth'].get('document_number')} | Total: {entry['ground_truth'].get('total_amount')}")

    # Final export
    save_checkpoint(checkpoint)
    export_master_files(checkpoint)

    total_time = time.time() - start_time
    print("=" * 70)
    print(f"✅ COMPLETED ALL {len(checkpoint)} INVOICE GROUND TRUTH LABELS!")
    print(f"⏱ Total time: {total_time/60:.2f} minutes")
    print(f"📄 Master JSON: {MASTER_JSON}")
    print(f"📊 Master CSV:  {MASTER_CSV}")
    print(f"📂 Labels dir:  {LABELS_JSON_DIR}")
    print(f"🌐 Synced to:   {BACKEND_GT_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    main()
