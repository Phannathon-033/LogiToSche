"""Run K-Fold evaluation against OCR and SLM services."""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import numpy as np
import requests
from sklearn.model_selection import KFold

try:
    from .prompts import load_prompt_config as read_prompt_config, prompt_config_snapshot
except ImportError:
    from prompts import load_prompt_config as read_prompt_config, prompt_config_snapshot

try:
    from .logistics_field_parser import evaluate_11_fields
except ImportError:
    from logistics_field_parser import evaluate_11_fields

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_DIR = pathlib.Path(__file__).resolve().parent
GT_FILE = pathlib.Path(os.environ.get("LOGIAI_GROUND_TRUTH_PATH", BASE_DIR / "ground_truth_dataset.json"))
DATASET_DIR = pathlib.Path(os.environ.get("LOGIAI_DATASET_DIR", BASE_DIR))
CACHE_DIR = pathlib.Path(os.environ.get("LOGIAI_OCR_CACHE_DIR", BASE_DIR / "ocr_cache"))
REPORT_DIR = pathlib.Path(os.environ.get("LOGIAI_REPORT_DIR", BASE_DIR / "reports"))
OCR_ENDPOINT = os.environ.get("LOGIAI_OCR_ENDPOINT", "http://127.0.0.1:8000/api/ocr")
SLM_ENDPOINT = os.environ.get("LOGIAI_SLM_ENDPOINT", "http://127.0.0.1:8000/api/slm/extract")
API_TOKEN = os.environ.get("LOGIAI_GATEWAY_TOKEN", "").strip()
REQUEST_HEADERS = {"X-LogiAI-Token": API_TOKEN} if API_TOKEN else {}
MANIFEST_FILE = pathlib.Path(os.environ.get("LOGIAI_BASELINE_MANIFEST", ""))

CORE_FIELDS = [
    "document_type", "document_number", "document_date", "sender", "receiver",
    "origin", "destination", "reference_number", "unit_price", "total_amount", "currency",
]
FIELD_LABELS_TH = {
    "document_type": "1. ประเภทเอกสาร (document_type)",
    "document_number": "2. เลขที่เอกสาร (document_number)",
    "document_date": "3. วันที่เอกสาร (document_date)",
    "sender": "4. ผู้ส่ง / ผู้ขาย (sender)",
    "receiver": "5. ผู้รับ / ผู้ซื้อ (receiver)",
    "origin": "6. ต้นทาง (origin)",
    "destination": "7. ปลายทาง (destination)",
    "reference_number": "8. เลขที่อ้างอิง (reference_number)",
    "unit_price": "9. ราคาต่อหน่วย (unit_price)",
    "total_amount": "10. มูลค่ารวม (total_amount)",
    "currency": "11. สกุลเงิน (currency)",
}


def load_prompt_config() -> dict[str, Any]:
    return prompt_config_snapshot(read_prompt_config())


def levenshtein_similarity(s1: str, s2: str) -> float:
    left, right = str(s1).strip().lower(), str(s2).strip().lower()
    if left == right:
        return 1.0
    if not left or not right or left == "-" or right == "-":
        return 0.0
    previous = list(range(len(right) + 1))
    for i, left_char in enumerate(left, start=1):
        current = [i]
        for j, right_char in enumerate(right, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (left_char != right_char),
                )
            )
        previous = current
    return round(max(0.0, 1.0 - previous[-1] / max(len(left), len(right))), 4)


def compare_field_values(pred_val: Any, true_val: Any) -> dict[str, Any]:
    pred = "" if pred_val is None else str(pred_val).strip()
    truth = "" if true_val is None else str(true_val).strip()
    if not pred or pred.lower() in {"-", "n/a", "null"}:
        return {"exact_match": False, "similarity": 0.0, "pred": pred, "truth": truth}
    try:
        predicted_number = float(pred.replace(",", "").replace("$", ""))
        truth_number = float(truth.replace(",", "").replace("$", ""))
    except ValueError:
        predicted_number = truth_number = None
    if predicted_number is not None and truth_number is not None:
        exact = abs(predicted_number - truth_number) < 0.01
        similarity = 1.0 if exact else max(0.0, 1.0 - abs(predicted_number - truth_number) / (abs(truth_number) + 1e-6))
        return {"exact_match": exact, "similarity": round(similarity, 4), "pred": pred, "truth": truth}
    exact = pred.lower() == truth.lower()
    return {"exact_match": exact, "similarity": levenshtein_similarity(pred, truth), "pred": pred, "truth": truth}


def _document_path(document: dict[str, Any]) -> pathlib.Path:
    candidates = []
    file_path = document.get("file_path")
    if file_path:
        candidates.append(pathlib.Path(str(file_path)).expanduser())
    filename = str(document.get("file_name", ""))
    if filename:
        candidates.append(pathlib.Path(filename).expanduser() if pathlib.Path(filename).is_absolute() else DATASET_DIR / filename)
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"Dataset file not found for {document.get('id') or filename}: {candidates}")


def _cache_path(document: dict[str, Any]) -> pathlib.Path:
    key = str(document.get("id") or pathlib.Path(str(document.get("file_name", "document"))).stem)
    return CACHE_DIR / f"{re.sub(r'[^A-Za-z0-9_.-]+', '_', key)}.json"


def _write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def _get_ocr(document: dict[str, Any]) -> dict[str, Any]:
    cache_path = _cache_path(document)
    if cache_path.is_file():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        if cached.get("document_id") == document.get("id") and "ocr_text" in cached and "ocr_lines" in cached:
            return cached
    image_path = _document_path(document)
    with image_path.open("rb") as image_file:
        response = requests.post(
            OCR_ENDPOINT,
            files={"file": (image_path.name, image_file, "application/octet-stream")},
            data={"lang": os.environ.get("LOGIAI_OCR_LANGUAGE", "th")},
            headers=REQUEST_HEADERS,
            timeout=float(os.environ.get("LOGIAI_OCR_TIMEOUT", "300")),
        )
    response.raise_for_status()
    result = response.json()
    cached = {
        "document_id": document.get("id"),
        "filename": document.get("file_name"),
        "ocr_text": result.get("text", ""),
        "ocr_lines": result.get("lines", []),
        "engine": result.get("engine", "PaddleOCR"),
        "device": result.get("device", "unknown"),
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_json(cache_path, cached)
    return cached


def _extract(document: dict[str, Any], prompt_snapshot: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    ocr = _get_ocr(document)
    response = requests.post(
        SLM_ENDPOINT,
        json={
            "document_type_hint": document.get("category", "Invoice"),
            "source_file": document.get("file_name", "document"),
            "ocr_text": ocr["ocr_text"],
            "ocr_lines": ocr["ocr_lines"],
            "prompt_config": prompt_snapshot,
        },
        headers=REQUEST_HEADERS,
        timeout=float(os.environ.get("LOGIAI_SLM_TIMEOUT", "300")),
    )
    response.raise_for_status()
    result = response.json()
    return result.get("json_schema", {}), {"ocr": ocr, "slm": result}


def _baseline_prediction(ocr_text: str, baseline: dict[str, Any]) -> dict[str, Any]:
    if baseline:
        return baseline
    try:
        return dict(evaluate_11_fields(ocr_text).get("extracted_values", {}))
    except Exception:
        return {}


def _score(prediction: dict[str, Any], truth: dict[str, Any]) -> dict[str, Any]:
    scores: dict[str, dict[str, Any]] = {}
    for field in CORE_FIELDS:
        comparison = compare_field_values(prediction.get(field), truth.get(field))
        predicted = bool(comparison["pred"] and comparison["pred"].lower() not in {"-", "n/a", "null"})
        actual = bool(comparison["truth"] and comparison["truth"].lower() not in {"-", "n/a", "null"})
        scores[field] = {**comparison, "tp": int(predicted and comparison["exact_match"]), "fp": int(predicted and not comparison["exact_match"]), "fn": int(actual and not comparison["exact_match"])}
    return scores


def _aggregate(scores: list[dict[str, dict[str, Any]]]) -> dict[str, Any]:
    total = len(scores) * len(CORE_FIELDS)
    matches = sum(item[field]["exact_match"] for item in scores for field in CORE_FIELDS)
    similarities = [item[field]["similarity"] for item in scores for field in CORE_FIELDS]
    tp = sum(item[field]["tp"] for item in scores for field in CORE_FIELDS)
    fp = sum(item[field]["fp"] for item in scores for field in CORE_FIELDS)
    fn = sum(item[field]["fn"] for item in scores for field in CORE_FIELDS)
    precision = 100 * tp / (tp + fp) if tp + fp else 0.0
    recall = 100 * tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "accuracy_pct": round(100 * matches / total, 2) if total else 0.0,
        "similarity_pct": round(100 * float(np.mean(similarities)), 2) if similarities else 0.0,
        "precision_pct": round(precision, 2),
        "recall_pct": round(recall, 2),
        "f1_score_pct": round(f1, 2),
        "field_accuracies": {
            field: round(100 * sum(item[field]["exact_match"] for item in scores) / len(scores), 2) if scores else 0.0
            for field in CORE_FIELDS
        },
    }


def _fold_result(fold: int, documents: list[dict[str, Any]], scores: list[dict[str, dict[str, Any]]]) -> dict[str, Any]:
    aggregate = _aggregate(scores)
    return {"fold": fold, "test_docs_count": len(documents), **aggregate}


def run_kfold_evaluation(
    k_splits: int = 5,
    random_seed: int = 42,
    document_limit: int | None = None,
) -> dict[str, Any]:
    if not GT_FILE.is_file():
        raise FileNotFoundError(f"Ground truth dataset not found: {GT_FILE}")
    data = json.loads(GT_FILE.read_text(encoding="utf-8"))
    documents = data.get("documents", [])
    if document_limit:
        documents = documents[:document_limit]
    if len(documents) < k_splits:
        raise ValueError(f"K-Fold requires at least {k_splits} documents, found {len(documents)}")

    prompt_snapshot = load_prompt_config()
    run_id = datetime.now(timezone.utc).strftime("run_%Y%m%d_%H%M%S")
    kfold = KFold(n_splits=k_splits, shuffle=True, random_state=random_seed)
    baseline_map: dict[str, Any] = {}
    if MANIFEST_FILE.is_file():
        manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        baseline_map = {item.get("ranked_filename", item.get("file_name", "")): item for item in manifest.get("documents", [])}

    slm_folds = []
    baseline_folds = []
    slm_field_scores = {field: [] for field in CORE_FIELDS}
    baseline_field_scores = {field: [] for field in CORE_FIELDS}
    predictions: list[dict[str, Any]] = []
    indices = np.arange(len(documents))

    for fold, (_, validation_indices) in enumerate(kfold.split(indices), start=1):
        validation_documents = [documents[index] for index in validation_indices]
        slm_scores = []
        baseline_scores = []
        for document in validation_documents:
            prediction, trace = _extract(document, prompt_snapshot)
            truth = document.get("ground_truth", {})
            baseline = _baseline_prediction(trace["ocr"]["ocr_text"], baseline_map.get(document.get("file_name", ""), {}))
            slm_score = _score(prediction, truth)
            baseline_score = _score(baseline, truth)
            slm_scores.append(slm_score)
            baseline_scores.append(baseline_score)
            predictions.append({"run_id": run_id, "fold": fold, "id": document.get("id"), "file_name": document.get("file_name"), "prediction": deepcopy(prediction), "ground_truth": None})

        slm_fold = _fold_result(fold, validation_documents, slm_scores)
        baseline_fold = _fold_result(fold, validation_documents, baseline_scores)
        slm_folds.append(slm_fold)
        baseline_folds.append(baseline_fold)
        for field in CORE_FIELDS:
            slm_field_scores[field].append(slm_fold["field_accuracies"][field])
            baseline_field_scores[field].append(baseline_fold["field_accuracies"][field])

    def field_report(scores: dict[str, list[float]]) -> dict[str, Any]:
        return {
            field: {
                "mean": round(float(np.mean(values)), 2),
                "std": round(float(np.std(values)), 2),
                "per_fold": values,
            }
            for field, values in scores.items()
        }

    slm_accuracy = [fold["accuracy_pct"] for fold in slm_folds]
    slm_similarity = [fold["similarity_pct"] for fold in slm_folds]
    slm_f1 = [fold["f1_score_pct"] for fold in slm_folds]
    baseline_accuracy = [fold["accuracy_pct"] for fold in baseline_folds]
    baseline_f1 = [fold["f1_score_pct"] for fold in baseline_folds]
    report = {
        "run_id": run_id,
        "method": f"Standard {k_splits}-Fold Cross-Validation",
        "dataset": data.get("dataset_name", "Logistics Invoice Benchmark Dataset"),
        "total_documents": len(documents),
        "k_splits": k_splits,
        "random_seed": random_seed,
        "metrics_summary": {
            "mean_accuracy_pct": round(float(np.mean(slm_accuracy)), 2),
            "accuracy_std_dev": round(float(np.std(slm_accuracy)), 2),
            "accuracy_display": f"{np.mean(slm_accuracy):.2f}% ± {np.std(slm_accuracy):.2f}%",
            "mean_f1_score_pct": round(float(np.mean(slm_f1)), 2),
            "f1_std_dev": round(float(np.std(slm_f1)), 2),
            "f1_display": f"{np.mean(slm_f1):.2f}% ± {np.std(slm_f1):.2f}%",
            "mean_similarity_pct": round(float(np.mean(slm_similarity)), 2),
            "similarity_std_dev": round(float(np.std(slm_similarity)), 2),
            "similarity_display": f"{np.mean(slm_similarity):.2f}% ± {np.std(slm_similarity):.2f}%",
        },
        "model": prompt_snapshot.get("selected_model", "unknown"),
        "device": os.environ.get("LOGIAI_SLM_DEVICE", "cuda:0"),
        "ocr_cache_dir": str(CACHE_DIR),
        "report_dir": str(REPORT_DIR),
        "prediction_count": len(predictions),
        "prediction_ground_truth_separated": True,
        "field_performance": {
            field: {
                "mean_accuracy_pct": value["mean"],
                "std_dev": value["std"],
                "display": f"{value['mean']}% ± {value['std']}%",
                "scores_per_fold": value["per_fold"],
            }
            for field, value in field_report(slm_field_scores).items()
        },
        "folds": [{"fold": fold["fold"], "val_samples_count": fold["test_docs_count"], "overall_accuracy_pct": fold["accuracy_pct"], "precision_pct": fold["precision_pct"], "recall_pct": fold["recall_pct"], "f1_score_pct": fold["f1_score_pct"], "field_accuracies": fold["field_accuracies"]} for fold in slm_folds],
        "prompt_config": {"source": "prompts.json", "snapshot": prompt_snapshot},
        "sample_size_verification": {"calculated_n0": 246, "actual_dataset_size": len(documents), "is_statistically_significant": len(documents) >= 246},
        "proposed_slm": {"mean_accuracy_pct": round(float(np.mean(slm_accuracy)), 2), "std_accuracy": round(float(np.std(slm_accuracy)), 2), "mean_f1_score_pct": round(float(np.mean(slm_f1)), 2), "std_f1": round(float(np.std(slm_f1)), 2), "mean_similarity_pct": round(float(np.mean(slm_similarity)), 2), "std_similarity": round(float(np.std(slm_similarity)), 2), "folds": slm_folds, "field_scores": field_report(slm_field_scores)},
        "baseline_model": {"mean_accuracy_pct": round(float(np.mean(baseline_accuracy)), 2), "std_accuracy": round(float(np.std(baseline_accuracy)), 2), "mean_f1_score_pct": round(float(np.mean(baseline_f1)), 2), "std_f1": round(float(np.std(baseline_f1)), 2), "folds": baseline_folds, "field_scores": field_report(baseline_field_scores)},
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORT_DIR / f"{run_id}_evaluation.json"
    prediction_file = REPORT_DIR / f"{run_id}_predictions.json"
    _write_json(prediction_file, {"run_id": run_id, "prompt_config": prompt_snapshot, "predictions": predictions})
    report["prediction_file"] = str(prediction_file)
    _write_json(report_file, report)
    _write_json(REPORT_DIR / "kfold_evaluation_report.json", report)
    _write_json(BASE_DIR / "kfold_evaluation_report.json", report)
    (REPORT_DIR / "kfold_thesis_table.md").write_text(generate_markdown_thesis_table(report), encoding="utf-8")
    (BASE_DIR / "kfold_thesis_table.md").write_text(generate_markdown_thesis_table(report), encoding="utf-8")
    return report


def generate_markdown_thesis_table(report: dict[str, Any]) -> str:
    slm = report["proposed_slm"]
    base = report["baseline_model"]
    lines = [
        f"## ตารางผลการทดลอง {report['k_splits']}-Fold Cross-Validation ระบบแปลงเอกสารสู่ JSON Schema",
        f"**จำนวนเอกสาร:** {report['total_documents']} ฉบับ | **Prompt version:** {report['prompt_config']['snapshot'].get('version', 'unknown')} | **Run ID:** `{report['run_id']}`",
        "",
        "| ฟิลด์ข้อมูลหลัก | Baseline | Qwen SLM | Δ |",
        "| :--- | :---: | :---: | :---: |",
    ]
    for field in CORE_FIELDS:
        slm_field = slm["field_scores"][field]
        base_field = base["field_scores"][field]
        delta = slm_field["mean"] - base_field["mean"]
        lines.append(f"| {FIELD_LABELS_TH[field]} | {base_field['mean']:.1f}% ± {base_field['std']:.1f}% | {slm_field['mean']:.1f}% ± {slm_field['std']:.1f}% | {delta:+.1f}% |")
    lines.extend([
        "",
        f"**Overall Accuracy:** {slm['mean_accuracy_pct']:.2f}% ± {slm['std_accuracy']:.2f}%",
        f"**F1-Score:** {slm['mean_f1_score_pct']:.2f}% ± {slm['std_f1']:.2f}%",
        f"**Predictions:** `{report['prediction_file']}`",
    ])
    return "\n".join(lines)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    run_kfold_evaluation(k_splits=args.k, random_seed=args.seed, document_limit=args.limit)
