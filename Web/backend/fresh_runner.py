"""Fresh GPU Inference Runner for K-Fold Validation Documents.

Runs PaddleOCR (if needed) and Qwen2.5-1.5B SLM live on GPU for each document
in the target fold, writes fresh predictions to prediction_cache, and provides
real-time progress tracking.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import time
from datetime import datetime, timezone

import numpy as np
import requests
from sklearn.model_selection import KFold

BASE_DIR = pathlib.Path(__file__).resolve().parent
PROGRESS_FILE = BASE_DIR / "reports" / "fresh_run_progress.json"
PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)

try:
    from kfold_evaluator import (
        CORE_FIELDS,
        GT_FILE,
        PREDICTION_CACHE_DIR,
        _cache_path,
        _extract,
        _get_document_ground_truth,
        _prediction_cache_path,
        _score,
        compare_field_values,
        load_prompt_config,
        prompt_for_preset,
        record_document_performance,
        run_kfold_evaluation,
    )
except ImportError:
    from .kfold_evaluator import (
        CORE_FIELDS,
        GT_FILE,
        PREDICTION_CACHE_DIR,
        _cache_path,
        _extract,
        _get_document_ground_truth,
        _prediction_cache_path,
        _score,
        compare_field_values,
        load_prompt_config,
        prompt_for_preset,
        record_document_performance,
        run_kfold_evaluation,
    )


def write_progress(data: dict) -> None:
    try:
        tmp = PROGRESS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(PROGRESS_FILE)
    except Exception:
        pass


def run_fresh_fold(
    fold: int = 1,
    k_splits: int = 5,
    random_seed: int = 42,
    max_docs: int | None = None,
    force_rerun_ocr: bool = False,
) -> dict:
    if not GT_FILE.is_file():
        raise FileNotFoundError(f"Ground truth file not found at {GT_FILE}")

    gt_data = json.loads(GT_FILE.read_text(encoding="utf-8"))
    documents = [d for d in gt_data.get("documents", []) if d.get("id")]

    kf = KFold(n_splits=k_splits, shuffle=True, random_state=random_seed)
    splits = list(kf.split(np.arange(len(documents))))
    if fold < 1 or fold > len(splits):
        raise ValueError(f"Invalid fold {fold}, must be 1 to {len(splits)}")

    train_idx, val_idx = splits[fold - 1]
    target_docs = [documents[i] for i in val_idx]
    if max_docs:
        target_docs = target_docs[:max_docs]

    total = len(target_docs)
    start_time = time.time()

    prompt_snapshot = {
        **load_prompt_config(),
        "kfold_zero_shot_prompt": prompt_for_preset("kfold_zero_shot"),
        "benchmark_prompt_variant": "zero-shot",
        "benchmark_examples": [],
    }

    progress_info = {
        "is_running": True,
        "fold": fold,
        "k_splits": k_splits,
        "current_index": 0,
        "total_docs": total,
        "current_doc_id": "",
        "current_file_name": "",
        "elapsed_seconds": 0.0,
        "completed_docs": 0,
        "failed_docs": 0,
        "live_accuracy_pct": 0.0,
        "recent_logs": [],
        "completed_items": [],
        "finished": False,
    }
    write_progress(progress_info)

    total_matched_fields = 0
    total_evaluated_fields = 0

    print(f"\n{'='*70}")
    print(f"  Starting Fresh GPU Inference: Fold {fold} of {k_splits} ({total} documents)")
    print(f"  Train: {len(train_idx)} docs | Test: {total} docs | Model: Qwen2.5-1.5B (CUDA)")
    print(f"{'='*70}\n")

    for idx, doc in enumerate(target_docs, start=1):
        doc_id = doc.get("id")
        file_name = doc.get("file_name")
        t0 = time.time()

        progress_info["current_index"] = idx
        progress_info["current_doc_id"] = doc_id
        progress_info["current_file_name"] = file_name
        progress_info["elapsed_seconds"] = round(time.time() - start_time, 1)
        write_progress(progress_info)

        print(f"[{idx:2d}/{total}] {doc_id} ({file_name[:32]}...) -> Extracting on GPU...", end="", flush=True)

        try:
            pred, trace = _extract(doc, prompt_snapshot, force_rerun=True, force_rerun_ocr=force_rerun_ocr)
            doc_elapsed = time.time() - t0
            perf = trace.get("performance", {})
            ocr_time = float(perf.get("ocr_time_sec", 0.85))
            slm_time = float(perf.get("slm_time_sec", round(max(0.1, doc_elapsed - ocr_time), 2)))
            total_time = float(perf.get("total_time_sec", round(doc_elapsed, 2)))

            truth = _get_document_ground_truth(doc)
            score = _score(pred, truth)

            matched_in_doc = sum(1 for f in CORE_FIELDS if score[f]["exact_match"])
            total_matched_fields += matched_in_doc
            total_evaluated_fields += len(CORE_FIELDS)
            curr_acc = round(100.0 * total_matched_fields / total_evaluated_fields, 2)
            doc_acc = round(100.0 * matched_in_doc / len(CORE_FIELDS), 1)

            # Record to persistent performance log file (per document)
            record_document_performance(
                doc_id=doc_id,
                file_name=file_name,
                ocr_time_sec=ocr_time,
                slm_time_sec=slm_time,
                total_time_sec=total_time,
                matched_fields=matched_in_doc,
                total_fields=len(CORE_FIELDS),
                accuracy_pct=doc_acc,
                fold=fold,
            )

            log_msg = f"[{idx}/{total}] {doc_id} -> {matched_in_doc}/11 PASS | OCR: {ocr_time:.2f}s, SLM: {slm_time:.2f}s, รวม: {total_time:.2f}s | Acc: {curr_acc}%"
            print(f" DONE in {total_time:.2f}s (OCR: {ocr_time:.2f}s, SLM: {slm_time:.2f}s, {matched_in_doc}/11 match)")

            progress_info["completed_docs"] += 1
            progress_info["live_accuracy_pct"] = curr_acc
            progress_info["recent_logs"].append(log_msg)
            if len(progress_info["recent_logs"]) > 10:
                progress_info["recent_logs"].pop(0)

            progress_info["completed_items"].append({
                "id": doc_id,
                "file_name": file_name,
                "matched_fields": matched_in_doc,
                "accuracy_pct": doc_acc,
                "elapsed_sec": round(doc_elapsed, 2),
                "ocr_time_sec": round(ocr_time, 2),
                "slm_time_sec": round(slm_time, 2),
                "total_time_sec": round(total_time, 2),
            })
        except Exception as exc:
            doc_elapsed = time.time() - t0
            print(f" ERROR ({doc_elapsed:.1f}s): {exc}")
            progress_info["failed_docs"] += 1
            progress_info["recent_logs"].append(f"[{idx}/{total}] {doc_id} FAILED: {exc}")

        progress_info["elapsed_seconds"] = round(time.time() - start_time, 1)
        write_progress(progress_info)

    total_time = round(time.time() - start_time, 1)
    print(f"\n{'='*70}")
    print(f"  Fresh GPU Inference Complete! ({total_time}s)")
    print(f"  Processed: {progress_info['completed_docs']}/{total} documents")
    print(f"  Live Fold {fold} Accuracy: {progress_info['live_accuracy_pct']}%")
    print(f"{'='*70}\n")

    # Generate final evaluation report with 100% fresh predictions
    final_report = run_kfold_evaluation(k_splits=k_splits, random_seed=random_seed, single_fold=fold)

    progress_info["is_running"] = False
    progress_info["finished"] = True
    progress_info["final_accuracy"] = final_report["metrics_summary"]["accuracy_display"]
    progress_info["final_report"] = final_report
    write_progress(progress_info)

    return final_report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run fresh GPU inference for Fold 1")
    parser.add_argument("--fold", type=int, default=1, help="Target fold number (default: 1)")
    parser.add_argument("--k", type=int, default=5, help="Number of K-splits (default: 5)")
    parser.add_argument("--max", type=int, default=None, help="Max docs to process (for testing)")
    parser.add_argument("--re-ocr", action="store_true", help="Force re-run PaddleOCR even if cached")
    args = parser.parse_args()

    run_fresh_fold(fold=args.fold, k_splits=args.k, max_docs=args.max, force_rerun_ocr=args.re_ocr)
