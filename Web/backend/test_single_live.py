"""Live test single document with PaddleOCR on GPU and Qwen SLM on CUDA."""

import json
import pathlib
import sys
import time
import requests

from kfold_evaluator import GT_FILE, compare_field_values, CORE_FIELDS, FIELD_LABELS_TH

# Select doc index (default 0 -> DOC-001)
doc_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0

gt_data = json.loads(GT_FILE.read_text(encoding="utf-8"))
doc = gt_data["documents"][doc_idx]
img_path = pathlib.Path(r"E:\Logistics To JSON\To_Testing") / doc["file_name"]

print("=" * 70)
print(f"  Live End-to-End Test: {doc.get('id')} ({doc.get('file_name')})")
print("=" * 70)

# 1. Fresh OCR via PaddleOCR
print("\n[Step 1] Running PaddleOCR on GPU (POST /api/ocr)...")
t0 = time.time()
with img_path.open("rb") as f:
    ocr_resp = requests.post(
        "http://127.0.0.1:8000/api/ocr",
        files={"file": (img_path.name, f, "image/png")},
        data={"lang": "th"},
        headers={"X-LogiAI-Token": "logiai_secret_token_123"},
        timeout=60,
    )
ocr_time = time.time() - t0
ocr_data = ocr_resp.json()
ocr_lines = ocr_data.get("lines", [])
ocr_text = ocr_data.get("text", "")
print(f"  PaddleOCR Completed in {ocr_time:.2f}s")
print(f"  Detected lines: {len(ocr_lines)}")
print(f"  Detected characters: {len(ocr_text)}")
print(f"  OCR Text snippet: {ocr_text[:120]}...")

# 2. Fresh SLM Extraction via Qwen2.5-1.5B
print("\n[Step 2] Running Qwen2.5-1.5B SLM on CUDA (POST /api/slm/extract)...")
t1 = time.time()
slm_resp = requests.post(
    "http://127.0.0.1:8001/api/slm/extract",
    json={
        "document_type_hint": doc.get("category", "Invoice"),
        "source_file": doc.get("file_name"),
        "ocr_text": ocr_text,
        "ocr_lines": ocr_lines,
        "benchmark_prompt_variant": "zero-shot",
        "benchmark_examples": [],
    },
    timeout=60,
)
slm_time = time.time() - t1
slm_data = slm_resp.json()
pred_schema = slm_data.get("json_schema", {})
print(f"  Qwen SLM Completed in {slm_time:.2f}s")

# 3. K-Fold Scoring Comparison against Ground Truth
print("\n[Step 3] K-Fold Scoring vs Ground Truth (11 Core Logistics Fields):")
print("-" * 70)
truth = doc.get("ground_truth", {})
matches = 0
results_table = []

for field in CORE_FIELDS:
    res = compare_field_values(pred_schema.get(field), truth.get(field))
    is_match = res["exact_match"]
    if is_match:
        matches += 1
    mark = "PASS" if is_match else "FAIL"
    label = FIELD_LABELS_TH.get(field, field)
    results_table.append({
        "field": field,
        "label": label,
        "pred": str(res["pred"]),
        "truth": str(res["truth"]),
        "match": mark,
        "similarity": res["similarity"],
    })
    print(f"  [{mark:4}] {label:<35} | Pred: {str(res['pred']):<20} | Truth: {str(res['truth']):<20} | Sim: {res['similarity']*100:.1f}%")

print("-" * 70)
acc_pct = matches / len(CORE_FIELDS) * 100
total_time = ocr_time + slm_time
print(f"  Exact Match Accuracy: {matches}/{len(CORE_FIELDS)} ({acc_pct:.1f}%)")
print(f"  Total Live Inference Time: {total_time:.2f}s (OCR: {ocr_time:.2f}s + SLM: {slm_time:.2f}s)")
print("=" * 70)
