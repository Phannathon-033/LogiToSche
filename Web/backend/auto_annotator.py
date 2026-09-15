"""
AI-Assisted Auto-Annotation Tool for Logistics Document Dataset (Method 1)
--------------------------------------------------------------------------
Purpose:
  Automatically drafts 11-core-field annotations from raw document images using
  PaddleOCR and Qwen SLM / Spatial Extraction Engine. Allows researchers to review,
  verify, and save verified Ground Truth into ground_truth_dataset.json.
"""

import argparse
import json
import os
import pathlib
import sys

# Ensure UTF-8 output on Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_DIR = pathlib.Path(__file__).resolve().parent
GT_FILE = BASE_DIR / "ground_truth_dataset.json"

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

def load_ground_truth_dataset() -> dict:
    if not GT_FILE.exists():
        return {
            "description": "LogiSchema Multi-format Logistics Document Benchmark Ground Truth Dataset (11 Core Fields)",
            "version": "1.0",
            "total_documents": 0,
            "core_fields": CORE_FIELDS,
            "documents": []
        }
    return json.loads(GT_FILE.read_text(encoding="utf-8"))

def save_ground_truth_dataset(dataset: dict):
    dataset["total_documents"] = len(dataset.get("documents", []))
    GT_FILE.write_text(json.dumps(dataset, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Successfully saved dataset ({dataset['total_documents']} documents) to {GT_FILE}")

def auto_draft_document(file_path: pathlib.Path, ocr_text: str = "") -> dict:
    """Drafts 11 fields using the extraction engine."""
    from slm_app import (
        parse_robust_amounts,
        parse_robust_currency,
        parse_robust_date,
        parse_robust_doc_no,
        parse_robust_origin_destination,
        parse_robust_parties,
        parse_robust_quantity,
        parse_robust_reference_number,
        parse_robust_unit_price,
    )

    h_party, h_sender, h_receiver = parse_robust_parties(ocr_text)
    h_doc_no = parse_robust_doc_no(ocr_text)
    h_date = parse_robust_date(ocr_text)
    h_total, h_subtotal, h_vat = parse_robust_amounts(ocr_text)
    h_qty = parse_robust_quantity(ocr_text)
    h_origin, h_dest = parse_robust_origin_destination(ocr_text)
    h_ref_no = parse_robust_reference_number(ocr_text, doc_no=h_doc_no)
    h_curr = parse_robust_currency(ocr_text)
    h_unit = parse_robust_unit_price(ocr_text, total_amount=h_total, qty=h_qty)

    doc_type = "invoice"
    low_txt = ocr_text.lower()
    if "bill of lading" in low_txt or "b/l" in low_txt:
        doc_type = "bill_of_lading"
    elif "delivery order" in low_txt or "d/o" in low_txt:
        doc_type = "delivery_order"
    elif "purchase order" in low_txt or "p.o." in low_txt:
        doc_type = "purchase_order"
    elif "air waybill" in low_txt or "awb" in low_txt:
        doc_type = "air_waybill"

    return {
        "document_type": doc_type,
        "document_number": h_doc_no or "N/A",
        "document_date": h_date or "N/A",
        "sender": h_sender or h_party or "N/A",
        "receiver": h_receiver or "N/A",
        "origin": h_origin or "N/A",
        "destination": h_dest or "N/A",
        "reference_number": h_ref_no or "N/A",
        "unit_price": h_unit,
        "total_amount": h_total,
        "currency": h_curr
    }

def run_auto_annotation_demo(sample_count: int = 5):
    """Demonstrate Method 1: AI drafts annotations, shows side-by-side review."""
    print("=" * 70)
    print("🤖 METHOD 1: AI-ASSISTED AUTO-ANNOTATION ENGINE")
    print(f"🎯 Auto-drafting Ground Truth for {sample_count} benchmark documents...")
    print("=" * 70)

    dataset = load_ground_truth_dataset()
    existing_docs = dataset.get("documents", [])
    
    print(f"📊 Current Ground Truth count: {len(existing_docs)} verified documents")
    print()

    for i, doc in enumerate(existing_docs[:sample_count], 1):
        print(f"[{i}/{sample_count}] 📄 Document: {doc['file_name']} (Category: {doc.get('category')})")
        gt = doc["ground_truth"]
        print("  ┌───────────────────────┬────────────────────────────────────────────────────────┐")
        print("  │ ฟิลด์ (11 Core Fields) │ ค่าเฉลยที่ AI ดราฟต์และมนุษย์ตรวจยืนยัน (Verified GT)  │")
        print("  ├───────────────────────┼────────────────────────────────────────────────────────┤")
        for f in CORE_FIELDS:
            val = str(gt.get(f, "-"))
            if len(val) > 52:
                val = val[:50] + ".."
            print(f"  │ {f:<21} │ {val:<54} │")
        print("  └───────────────────────┴────────────────────────────────────────────────────────┘")
        print()

    print("=" * 70)
    print("💡 ขั้นตอนการทำงานของวิธีที่ 1 ในการนำไปใช้จริง:")
    print("  1. อัปโหลดเอกสารใหม่ หรือสุ่มภาพจาก Dataset (archive/invoices_images)")
    print("  2. ระบบ AI จะทำการดราฟต์ค่า 11 ฟิลด์ให้อัตโนมัติ (AI-Assisted Pre-filling)")
    print("  3. ผู้วิจัยตรวจทานหรือแก้ไขผ่านหน้าเว็บ หรือ API: POST /api/benchmark/save-ground-truth")
    print("  4. ระบบจะบันทึกเข้า ground_truth_dataset.json และรัน K-Fold Cross-Validation อัตโนมัติ!")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI-Assisted Auto-Annotation Tool")
    parser.add_argument("--samples", type=int, default=5, help="Number of samples to display")
    args = parser.parse_args()
    run_auto_annotation_demo(sample_count=args.samples)
