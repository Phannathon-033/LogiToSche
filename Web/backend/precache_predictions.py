"""Batch pre-cache predictions for all ground truth documents using Qwen SLM."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import time

BASE_DIR = pathlib.Path(__file__).resolve().parent

try:
    from kfold_evaluator import (
        GT_FILE,
        PREDICTION_CACHE_DIR,
        _extract,
        _prediction_cache_path,
        extraction_base_prompt,
        load_prompt_config,
        run_kfold_evaluation,
    )
except ImportError:
    from .kfold_evaluator import (
        GT_FILE,
        PREDICTION_CACHE_DIR,
        _extract,
        _prediction_cache_path,
        extraction_base_prompt,
        load_prompt_config,
        run_kfold_evaluation,
    )


def precache(start_index: int = 0, limit: int | None = None, update_report: bool = True) -> None:
    if not GT_FILE.is_file():
        print(f"Error: Ground truth file not found at {GT_FILE}")
        sys.exit(1)

    data = json.loads(GT_FILE.read_text(encoding="utf-8"))
    documents = data.get("documents", [])
    total_docs = len(documents)
    print(f"[Pre-Cache] Total documents in dataset: {total_docs}")

    if start_index > 0:
        documents = documents[start_index:]
    if limit is not None:
        documents = documents[:limit]

    print(f"[Pre-Cache] Processing {len(documents)} documents (start={start_index}, limit={limit})...")
    config = load_prompt_config()
    prompt_snapshot = {
        **config,
        "base_prompt": extraction_base_prompt(config),
        "benchmark_prompt": extraction_base_prompt(config),
        "benchmark_prompt_variant": "zero-shot",
        "benchmark_examples": [],
        "example_selection": {
            "method": "none",
            "requested_count": 0,
            "actual_count": 0,
            "training_document_ids": [],
            "selected": [],
        },
        "prompt_source": {
            "module": "prompts.py",
            "config_file": str(BASE_DIR / "prompt_config.json"),
            "variant": "K-Fold composition",
        },
    }

    cached_count = 0
    new_extracted = 0
    failed_count = 0

    for idx, doc in enumerate(documents, start=start_index + 1):
        doc_id = doc.get("id", f"DOC-{idx:03d}")
        cache_file = _prediction_cache_path(doc, "zero-shot")

        if cache_file.is_file():
            cached_count += 1
            print(f"[{idx}/{total_docs}] {doc_id} -> ALREADY CACHED ({cache_file.name})")
            continue

        t0 = time.time()
        try:
            print(f"[{idx}/{total_docs}] {doc_id} -> Extracting via SLM...", end="", flush=True)
            pred, trace = _extract(doc, prompt_snapshot, force_rerun=False)
            elapsed = time.time() - t0
            new_extracted += 1
            print(f" DONE in {elapsed:.2f}s (fields={len([k for k, v in pred.items() if v not in ('', '-', None, 0)])}/11)")
        except Exception as exc:
            failed_count += 1
            print(f" FAILED: {exc}")

    print(f"\n[Pre-Cache Complete]")
    print(f"  Already cached : {cached_count}")
    print(f"  Newly extracted: {new_extracted}")
    print(f"  Failed         : {failed_count}")

    if update_report and (new_extracted > 0 or cached_count >= 5):
        print("\n[Pre-Cache] Updating 5-Fold evaluation report and thesis table...")
        report = run_kfold_evaluation(k_splits=5, random_seed=42, document_limit=limit)
        print(f"  5-Fold Accuracy: {report['metrics_summary']['accuracy_display']}")
        print(f"  5-Fold F1-Score: {report['metrics_summary']['f1_display']}")
        print(f"  Thesis Table   : {BASE_DIR / 'kfold_thesis_table.md'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pre-cache Qwen SLM predictions for K-Fold evaluation")
    parser.add_argument("--start", type=int, default=0, help="Start index (0-indexed)")
    parser.add_argument("--limit", type=int, default=None, help="Max number of documents to process")
    parser.add_argument("--no-report", action="store_true", help="Skip updating report after caching")
    args = parser.parse_args()

    precache(start_index=args.start, limit=args.limit, update_report=not args.no_report)
