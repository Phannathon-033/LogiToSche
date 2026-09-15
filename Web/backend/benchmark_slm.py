import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import requests

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_IMAGE_DIR = Path(r"E:\Logistics To JSON\archive\invoices_images")
OCR_ENDPOINT = "http://127.0.0.1:8000/api/ocr"
SLM_ENDPOINT = "http://127.0.0.1:8001/api/slm/extract"


def run_benchmark(
    image_dir: Path,
    num_samples: int = 5,
    language: str = "th",
) -> dict[str, Any]:
    images = [
        f for f in image_dir.iterdir()
        if f.suffix.lower() in {".tif", ".tiff", ".png", ".jpg", ".jpeg"}
    ][:num_samples]

    if not images:
        print(f"❌ No images found in {image_dir}")
        return {}

    print(f"\n🚀 Starting SLM & OCR Accuracy Benchmark on {len(images)} sample document(s)...")
    print("=" * 75)

    results: list[dict[str, Any]] = []
    total_ocr_time = 0.0
    total_slm_time = 0.0
    json_valid_count = 0

    field_fill_counts = {
        "document_type": 0,
        "document_no": 0,
        "document_date": 0,
        "party_name": 0,
        "source_file": 0,
        "quantity": 0,
        "total_amount": 0,
        "other_fields": 0,
    }

    discrepancies: list[str] = []

    for index, img_path in enumerate(images, start=1):
        print(f"[{index}/{len(images)}] Testing: {img_path.name}")
        sample_res: dict[str, Any] = {
            "file": img_path.name,
            "ocr_status": "error",
            "slm_status": "error",
            "ocr_lines": 0,
            "ocr_time_sec": 0.0,
            "slm_time_sec": 0.0,
            "extracted_fields": {},
            "issues": [],
        }

        # Step 1: OCR
        ocr_start = time.time()
        try:
            with open(img_path, "rb") as f:
                content_type = "image/tiff" if img_path.suffix.lower() in {".tif", ".tiff"} else "image/png"
                files = {"file": (img_path.name, f, content_type)}
                ocr_resp = requests.post(
                    OCR_ENDPOINT,
                    files=files,
                    data={"language": language},
                    timeout=90,
                )
            ocr_duration = time.time() - ocr_start
            sample_res["ocr_time_sec"] = round(ocr_duration, 2)
            total_ocr_time += ocr_duration

            if ocr_resp.status_code == 200:
                ocr_data = ocr_resp.json()
                sample_res["ocr_status"] = "ok"
                ocr_lines = ocr_data.get("lines", [])
                ocr_text = ocr_data.get("text", "")
                sample_res["ocr_lines"] = len(ocr_lines)
            else:
                sample_res["issues"].append(f"OCR HTTP {ocr_resp.status_code}")
                ocr_text = ""
                ocr_lines = []
        except Exception as e:
            sample_res["issues"].append(f"OCR Error: {e}")
            ocr_text = ""
            ocr_lines = []

        # Step 2: SLM Extraction
        if sample_res["ocr_status"] == "ok" and ocr_text:
            slm_start = time.time()
            try:
                slm_payload = {
                    "document_type_hint": "Invoice",
                    "source_file": img_path.name,
                    "ocr_text": ocr_text,
                    "ocr_lines": ocr_lines,
                }
                slm_resp = requests.post(SLM_ENDPOINT, json=slm_payload, timeout=60)
                slm_duration = time.time() - slm_start
                sample_res["slm_time_sec"] = round(slm_duration, 2)
                total_slm_time += slm_duration

                if slm_resp.status_code == 200:
                    slm_data = slm_resp.json()
                    sample_res["slm_status"] = "ok"
                    json_valid_count += 1

                    schema = slm_data.get("json_schema", {})
                    sample_res["extracted_fields"] = schema

                    # Track 7 Core Fields Fill Rate
                    if schema.get("document_type") and schema["document_type"] != "unknown":
                        field_fill_counts["document_type"] += 1
                    if schema.get("document_no"):
                        field_fill_counts["document_no"] += 1
                    else:
                        sample_res["issues"].append("Missing document_no")

                    if schema.get("document_date"):
                        field_fill_counts["document_date"] += 1
                    else:
                        sample_res["issues"].append("Missing document_date")

                    if schema.get("party_name"):
                        field_fill_counts["party_name"] += 1
                    else:
                        sample_res["issues"].append("Missing party_name")

                    if schema.get("source_file"):
                        field_fill_counts["source_file"] += 1

                    if schema.get("quantity") and schema["quantity"] > 0:
                        field_fill_counts["quantity"] += 1

                    if schema.get("total_amount") and schema["total_amount"] > 0:
                        field_fill_counts["total_amount"] += 1
                    else:
                        sample_res["issues"].append("Zero or missing total_amount")

                    other = schema.get("other", {})
                    if other and isinstance(other, dict) and len(other) > 0:
                        field_fill_counts["other_fields"] += 1

                else:
                    sample_res["issues"].append(f"SLM HTTP {slm_resp.status_code}")
            except Exception as e:
                sample_res["issues"].append(f"SLM Error: {e}")

        # Summary line for sample
        status_sym = "✅ PASS" if sample_res["slm_status"] == "ok" and not sample_res["issues"] else "⚠️ ATTENTION"
        print(f"  └─ Result: {status_sym} | OCR: {sample_res['ocr_time_sec']}s ({sample_res['ocr_lines']} lines) | SLM: {sample_res['slm_time_sec']}s")
        if sample_res["issues"]:
            print(f"  └─ Notes: {', '.join(sample_res['issues'])}")
            discrepancies.extend([f"[{img_path.name}] {iss}" for iss in sample_res["issues"]])

        results.append(sample_res)

    print("=" * 75)
    total_samples = len(images)
    avg_ocr = total_ocr_time / total_samples if total_samples else 0
    avg_slm = total_slm_time / total_samples if total_samples else 0

    print("\n📊 === BENCHMARK & ACCURACY SUMMARY ===")
    print(f"Total Documents Tested: {total_samples}")
    print(f"JSON Output Valid Rate: {json_valid_count}/{total_samples} ({json_valid_count/total_samples*100:.1f}%)")
    print(f"Average OCR Latency:    {avg_ocr:.2f} sec/doc")
    print(f"Average SLM Latency:    {avg_slm:.2f} sec/doc")
    print("\n🎯 7 CORE FIELDS EXTRACTION RATES:")
    for field, count in field_fill_counts.items():
        pct = (count / total_samples) * 100 if total_samples else 0
        bar = "█" * int(pct // 5) + "░" * (20 - int(pct // 5))
        print(f"  • {field:<16} : {count:>3}/{total_samples} ({pct:>5.1f}%) [{bar}]")

    summary_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_samples": total_samples,
        "json_valid_rate_pct": round((json_valid_count / total_samples) * 100, 1),
        "avg_ocr_latency_sec": round(avg_ocr, 2),
        "avg_slm_latency_sec": round(avg_slm, 2),
        "field_accuracy_rates": {
            k: f"{v}/{total_samples} ({(v/total_samples)*100:.1f}%)"
            for k, v in field_fill_counts.items()
        },
        "discrepancies_count": len(discrepancies),
        "results": results,
    }

    report_file = BASE_DIR / "benchmark_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Full detailed benchmark report saved to: {report_file}")
    return summary_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Logistics SLM & OCR Accuracy Benchmark Suite")
    parser.add_argument("--samples", type=int, default=5, help="Number of sample documents to test")
    parser.add_argument("--dir", type=str, default=str(DEFAULT_IMAGE_DIR), help="Path to image directory")
    args = parser.parse_args()

    run_benchmark(image_dir=Path(args.dir), num_samples=args.samples)
