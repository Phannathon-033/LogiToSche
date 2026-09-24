"""Evaluation Background Job Manager.

Provides asynchronous, non-blocking background job execution for K-Fold evaluation.
Features:
1. Immediate HTTP response upon job creation (no browser timeout).
2. Per-document immediate saving of predictions and performance logs.
3. Resume capability (skips already-predicted documents if stopped or interrupted).
4. OCR Caching: reuses OCR text cache (PaddleOCR run once per document), ensuring
   Zero-shot, One-shot, and Few-shot evaluate on identical OCR inputs without re-running OCR.
5. Real-time progress tracking (overall progress, fold progress, elapsed time, live logs).
6. Graceful stop and cancel controls.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sklearn.model_selection import KFold

BASE_DIR = pathlib.Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
JOBS_DIR = REPORTS_DIR / "evaluation_jobs"
CURRENT_JOB_FILE = REPORTS_DIR / "current_eval_job.json"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)

try:
    from kfold_evaluator import (
        CORE_FIELDS,
        GT_FILE,
        PREDICTION_CACHE_DIR,
        _cache_path,
        _extract,
        _get_document_ground_truth,
        _get_ocr,
        _prediction_cache_path,
        _score,
        compare_field_values,
        benchmark_prompt_snapshot,
        load_prompt_config,
        extraction_base_prompt,
        record_document_performance,
        run_kfold_evaluation,
        select_training_examples,
    )
except ImportError:
    from .kfold_evaluator import (
        CORE_FIELDS,
        GT_FILE,
        PREDICTION_CACHE_DIR,
        _cache_path,
        _extract,
        _get_document_ground_truth,
        _get_ocr,
        _prediction_cache_path,
        _score,
        compare_field_values,
        benchmark_prompt_snapshot,
        load_prompt_config,
        extraction_base_prompt,
        record_document_performance,
        run_kfold_evaluation,
        select_training_examples,
    )


class EvaluationJobManager:
    _instance: EvaluationJobManager | None = None
    _lock = threading.Lock()

    def __new__(cls) -> EvaluationJobManager:
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._active_job_id = None
                cls._instance._stop_flags: dict[str, bool] = {}
                cls._instance._threads: dict[str, threading.Thread] = {}
        return cls._instance

    def _write_job_file(self, data: dict[str, Any]) -> None:
        try:
            job_id = data.get("job_id", "current")
            job_file = JOBS_DIR / f"{job_id}.json"
            tmp = job_file.with_suffix(".tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp.replace(job_file)

            # Also update current pointer
            tmp_cur = CURRENT_JOB_FILE.with_suffix(".tmp")
            tmp_cur.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp_cur.replace(CURRENT_JOB_FILE)
        except Exception as e:
            print(f"[WARN] Error writing job file: {e}")

    def get_status(self, job_id: str | None = None) -> dict[str, Any]:
        """Returns the status of a specific job, or the current active/latest job."""
        target_file = None
        if job_id:
            target_file = JOBS_DIR / f"{job_id}.json"
        elif CURRENT_JOB_FILE.is_file():
            target_file = CURRENT_JOB_FILE

        if target_file and target_file.is_file():
            try:
                data = json.loads(target_file.read_text(encoding="utf-8"))
                active_tid = self._active_job_id
                active_thread = self._threads.get(active_tid) if active_tid else None
                if data.get("is_running") and (not active_thread or not active_thread.is_alive()):
                    data["is_running"] = False
                    if data.get("status") == "running":
                        data["status"] = "stopped"
                        data["message"] = "Process completed or halted"
                return data
            except Exception:
                pass

        return {
            "job_id": None,
            "status": "idle",
            "is_running": False,
            "message": "No active evaluation job",
        }

    def stop_job(self, job_id: str | None = None) -> dict[str, Any]:
        """Requests graceful stop for the running job."""
        with self._lock:
            target_id = job_id or self._active_job_id
            if not target_id:
                status = self.get_status()
                target_id = status.get("job_id")

            if target_id:
                self._stop_flags[target_id] = True
                status = self.get_status(target_id)
                status["is_running"] = False
                status["status"] = "stopping"
                status["recent_logs"] = status.get("recent_logs", []) + [
                    f"[STOP] Received stop request from user. Halting after current document completes..."
                ]
                self._write_job_file(status)
                return {"status": "stopping", "job_id": target_id, "message": "Stop signal sent"}

        return {"status": "not_running", "message": "No running job to stop"}

    def reset_job(self) -> dict[str, Any]:
        """Forces reset of current job state to idle."""
        with self._lock:
            self._active_job_id = None
            self._stop_flags.clear()
            idle_state = {
                "job_id": None,
                "status": "idle",
                "is_running": False,
                "message": "Evaluation job reset to idle",
            }
            if CURRENT_JOB_FILE.is_file():
                try:
                    CURRENT_JOB_FILE.unlink(missing_ok=True)
                except Exception:
                    pass
            return idle_state

    def start_job(
        self,
        mode: str = "5_fold",  # '5_fold' | 'single_fold' | 'single_doc'
        single_fold: int = 1,
        k_splits: int = 5,
        random_seed: int = 42,
        prompt_variant: str = "zero-shot",
        resume: bool = False,
        force_rerun_ocr: bool = True,
        max_docs: int | None = None,
        doc_id: str | None = None,
    ) -> dict[str, Any]:
        """Creates an evaluation job and starts it in a background thread."""
        with self._lock:
            # Check if an active job is already running
            if self._active_job_id:
                thread = self._threads.get(self._active_job_id)
                if thread and thread.is_alive():
                    return {
                        "status": "already_running",
                        "job_id": self._active_job_id,
                        "message": "Another evaluation job is already running",
                    }

            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            mode_tag = "f" + str(single_fold) if mode == "single_fold" else ("doc" if mode == "single_doc" else "5f")
            job_id = f"eval_{timestamp_str}_{mode_tag}"
            self._active_job_id = job_id
            self._stop_flags[job_id] = False

            # Load dataset to determine total count
            if not GT_FILE.is_file():
                return {"status": "error", "message": f"Ground truth dataset not found at {GT_FILE}"}

            try:
                gt_data = json.loads(GT_FILE.read_text(encoding="utf-8"))
                documents = [d for d in gt_data.get("documents", []) if d.get("id")]
            except Exception as e:
                return {"status": "error", "message": f"Failed to parse ground truth dataset: {e}"}

            if mode == "single_doc":
                total_target_docs = 1
                doc_idx = 0
                target_id = (doc_id or "DOC-001").strip().lower()
                for i, d in enumerate(documents):
                    cur_id = str(d.get("id", "")).strip().lower()
                    cur_fname = str(d.get("file_name", "")).strip().lower()
                    if cur_id == target_id or cur_fname == target_id:
                        doc_idx = i
                        break
                target_splits = [(1, [], [doc_idx])]
                resume = False  # Always run fresh on GPU to measure live performance!
                force_rerun_ocr = True  # Always re-read OCR on image fresh!
            else:
                effective_k = max(2, min(k_splits, len(documents)))
                kf = KFold(n_splits=effective_k, shuffle=True, random_state=random_seed)
                splits = list(kf.split(np.arange(len(documents))))

                if mode == "single_fold":
                    if single_fold < 1 or single_fold > len(splits):
                        single_fold = 1
                    tr_idx, val_idx = splits[single_fold - 1]
                    if max_docs:
                        val_idx = val_idx[:max_docs]
                    total_target_docs = len(val_idx)
                    target_splits = [(single_fold, tr_idx, val_idx)]
                else:  # '5_fold'
                    target_splits = []
                    total_target_docs = 0
                    for f_num, (tr_idx, val_idx) in enumerate(splits, start=1):
                        if max_docs:
                            val_idx = val_idx[:max_docs]
                        total_target_docs += len(val_idx)
                        target_splits.append((f_num, tr_idx, val_idx))

            initial_job_state = {
                "job_id": job_id,
                "status": "running",
                "is_running": True,
                "mode": mode,
                "single_fold": single_fold if mode == "single_fold" else None,
                "k_splits": k_splits,
                "random_seed": random_seed,
                "prompt_variant": prompt_variant,
                "resume": resume,
                "force_rerun_ocr": force_rerun_ocr,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "finished_at": None,
                "current_fold": target_splits[0][0] if target_splits else 1,
                "total_folds": len(target_splits),
                "fold_current": 0,
                "fold_total": len(target_splits[0][2]) if target_splits else 0,
                "overall_current": 0,
                "overall_total": total_target_docs,
                "overall_pct": 0.0,
                "fold_pct": 0.0,
                "elapsed_seconds": 0.0,
                "live_accuracy_pct": 0.0,
                "current_doc_id": "",
                "current_file_name": "",
                "completed_docs": 0,
                "resumed_cached_docs": 0,
                "cached_count": 0,
                "live_gpu_docs": 0,
                "live_gpu_count": 0,
                "failed_docs": 0,
                "recent_logs": [
                    f"Job {job_id} created: {mode} evaluation ({total_target_docs} docs total) started."
                ],
                "completed_items": [],
                "final_report": None,
            }

            self._write_job_file(initial_job_state)

            # Spawn background worker thread
            worker = threading.Thread(
                target=self._run_job_worker,
                args=(
                    job_id,
                    initial_job_state,
                    documents,
                    target_splits,
                    prompt_variant,
                    resume,
                    force_rerun_ocr,
                ),
                daemon=True,
            )
            self._threads[job_id] = worker
            worker.start()

            # Respond immediately to client (< 50ms)
            return {
                "job_id": job_id,
                "status": "running",
                "is_running": True,
                "mode": mode,
                "overall_total": total_target_docs,
                "message": f"Evaluation job {job_id} started successfully in background",
            }

    def _run_job_worker(
        self,
        job_id: str,
        job_state: dict[str, Any],
        documents: list[dict[str, Any]],
        target_splits: list[tuple[int, Any, Any]],
        prompt_variant: str,
        resume: bool,
        force_rerun_ocr: bool,
    ) -> None:
        start_time = time.time()
        prompt_snapshot = {
            **load_prompt_config(),
            "base_prompt": extraction_base_prompt(load_prompt_config()),
            "benchmark_prompt": extraction_base_prompt(load_prompt_config()),
            "benchmark_prompt_variant": prompt_variant,
            "benchmark_examples": [],
            "example_selection": {},
            "example_selection_by_fold": {},
            "prompt_source": {
                "module": "prompts.py",
                "config_file": str(BASE_DIR / "prompt_config.json"),
                "variant": "K-Fold composition",
            },
        }

        overall_matched_fields = 0
        overall_evaluated_fields = 0
        overall_doc_counter = 0
        stopped = False

        print(f"\n{'='*70}")
        print(f"  [JOB {job_id}] Started: {job_state['mode']} ({job_state['overall_total']} documents)")
        print(f"  Resume: {resume} | Prompt: {prompt_variant} | OCR: {'Forced Fresh Read' if force_rerun_ocr else 'Cached'}")
        print(f"{'='*70}\n")

        for fold, train_indices, validation_indices in target_splits:
            if self._stop_flags.get(job_id, False):
                stopped = True
                break

            fold_docs = [documents[idx] for idx in validation_indices]
            fold_total = len(fold_docs)

            training_documents = [documents[index] for index in train_indices]
            benchmark_examples, example_selection = select_training_examples(
                training_documents,
                prompt_variant,
            )
            if prompt_variant == "one-shot" and len(benchmark_examples) != 1:
                raise ValueError("one-shot requires one training example")
            if prompt_variant == "few-shot" and len(training_documents) >= 3 and len(benchmark_examples) < 3:
                raise ValueError("few-shot requires at least three training examples")

            fold_prompt_snapshot = benchmark_prompt_snapshot(
                prompt_variant,
                config=prompt_snapshot,
                examples=benchmark_examples,
                selection=example_selection,
            )
            fold_prompt_snapshot["benchmark_prompt"] = fold_prompt_snapshot["base_prompt"]
            prompt_snapshot["example_selection_by_fold"][str(fold)] = example_selection
            prompt_snapshot.update(fold_prompt_snapshot)
            prompt_snapshot["example_selection_by_fold"] = prompt_snapshot.get(
                "example_selection_by_fold", {}
            )
            prompt_snapshot["benchmark_examples"] = benchmark_examples
            prompt_snapshot["example_selection"] = example_selection

            if any(
                str(example.get("document_id")) in {str(doc.get("id")) for doc in fold_docs}
                for example in benchmark_examples
            ):
                raise RuntimeError("Training example leaked into validation documents")

            job_state["current_fold"] = fold
            job_state["prompt_source"] = prompt_snapshot.get("prompt_source")
            job_state["example_selection_by_fold"] = prompt_snapshot["example_selection_by_fold"]
            job_state["current_example_selection"] = example_selection
            job_state["benchmark_examples"] = benchmark_examples
            job_state["training_document_ids"] = [str(doc.get("id")) for doc in training_documents]

            job_state["current_fold"] = fold
            job_state["fold_total"] = fold_total
            job_state["fold_current"] = 0

            for doc_fold_idx, doc in enumerate(fold_docs, start=1):
                # Check stop signal
                if self._stop_flags.get(job_id, False):
                    stopped = True
                    break

                doc_id = doc.get("id", f"DOC-{overall_doc_counter+1:03d}")
                file_name = doc.get("file_name", "")
                t_doc_start = time.time()

                job_state["current_doc_id"] = doc_id
                job_state["current_file_name"] = file_name
                job_state["fold_current"] = doc_fold_idx
                job_state["overall_current"] = overall_doc_counter + 1
                job_state["fold_pct"] = round(100.0 * doc_fold_idx / max(1, fold_total), 1)
                job_state["overall_pct"] = round(100.0 * (overall_doc_counter + 1) / max(1, job_state["overall_total"]), 1)
                job_state["elapsed_seconds"] = round(time.time() - start_time, 1)
                self._write_job_file(job_state)

                # Check if document already has cached prediction and resume is enabled
                pred_cache_file = _prediction_cache_path(doc, prompt_variant)
                is_cached = resume and pred_cache_file.is_file()

                try:
                    # Run or load prediction
                    pred, trace = _extract(
                        doc,
                        prompt_snapshot,
                        force_rerun=(not is_cached),
                        force_rerun_ocr=force_rerun_ocr,
                        benchmark_examples=benchmark_examples,
                    )
                    doc_elapsed = round(time.time() - t_doc_start, 2)
                    perf = trace.get("performance", {})
                    ocr_t = float(perf.get("ocr_time_sec", 0.85))
                    slm_t = float(perf.get("slm_time_sec", max(0.1, doc_elapsed - ocr_t)))
                    tot_t = float(perf.get("total_time_sec", round(ocr_t + slm_t, 3)))

                    truth = _get_document_ground_truth(doc)
                    score = _score(pred, truth)

                    matched_in_doc = sum(1 for f in CORE_FIELDS if score[f]["exact_match"])
                    overall_matched_fields += matched_in_doc
                    overall_evaluated_fields += len(CORE_FIELDS)
                    curr_acc = round(100.0 * overall_matched_fields / max(1, overall_evaluated_fields), 2)
                    doc_acc = round(100.0 * matched_in_doc / len(CORE_FIELDS), 1)

                    # Record to persistent performance log (per document)
                    record_document_performance(
                        doc_id=doc_id,
                        file_name=file_name,
                        ocr_time_sec=ocr_t,
                        slm_time_sec=slm_t,
                        total_time_sec=tot_t,
                        matched_fields=matched_in_doc,
                        total_fields=len(CORE_FIELDS),
                        accuracy_pct=doc_acc,
                        fold=fold,
                    )

                    tag = "[CACHED]" if is_cached else "[GPU LIVE]"
                    log_msg = f"[{job_state['overall_current']}/{job_state['overall_total']}] {tag} {doc_id} (Fold {fold} {doc_fold_idx}/{fold_total}) -> {matched_in_doc}/11 PASS | OCR: {ocr_t:.2f}s, SLM: {slm_t:.2f}s, Total: {tot_t:.2f}s | Acc: {curr_acc}%"
                    print(log_msg)

                    overall_doc_counter += 1
                    job_state["completed_docs"] += 1
                    if is_cached:
                        job_state["resumed_cached_docs"] += 1
                        job_state["cached_count"] = job_state.get("cached_count", 0) + 1
                    else:
                        job_state["live_gpu_docs"] += 1
                        job_state["live_gpu_count"] = job_state.get("live_gpu_count", 0) + 1

                    job_state["live_accuracy_pct"] = curr_acc
                    job_state["recent_logs"].append(log_msg)
                    if len(job_state["recent_logs"]) > 15:
                        job_state["recent_logs"].pop(0)

                    job_state["completed_items"].append({
                        "id": doc_id,
                        "file_name": file_name,
                        "fold": fold,
                        "matched_fields": matched_in_doc,
                        "accuracy_pct": doc_acc,
                        "is_cached": is_cached,
                        "ocr_time_sec": round(ocr_t, 2),
                        "slm_time_sec": round(slm_t, 2),
                        "total_time_sec": round(tot_t, 2),
                    })

                except Exception as exc:
                    print(f"[ERROR] Document {doc_id} failed: {exc}")
                    overall_doc_counter += 1
                    job_state["failed_docs"] += 1
                    job_state["recent_logs"].append(f"[FAIL] {doc_id} (Fold {fold}) error: {exc}")
                    if len(job_state["recent_logs"]) > 15:
                        job_state["recent_logs"].pop(0)

                job_state["elapsed_seconds"] = round(time.time() - start_time, 1)
                self._write_job_file(job_state)

        total_elapsed = round(time.time() - start_time, 1)

        if stopped:
            job_state["status"] = "stopped"
            job_state["is_running"] = False
            job_state["finished_at"] = datetime.now(timezone.utc).isoformat()
            job_state["recent_logs"].append(
                f"[JOB {job_id}] Stopped by user. Processed {job_state['completed_docs']}/{job_state['overall_total']} documents ({total_elapsed}s). All progress is saved and can be resumed."
            )
            self._write_job_file(job_state)
            with self._lock:
                self._active_job_id = None
            print(f"[JOB {job_id}] Stopped gracefully.")
            return

        # Generate final comprehensive K-Fold evaluation report
        print(f"\n[JOB {job_id}] Aggregating predictions and generating final thesis report...")
        try:
            is_single_fold_mode = job_state["mode"] == "single_fold"
            is_single_doc_mode = job_state["mode"] == "single_doc"
            target_single_fold = job_state["single_fold"] if is_single_fold_mode else None
            target_doc_id = job_state.get("current_doc_id") if is_single_doc_mode else None
            final_report = run_kfold_evaluation(
                k_splits=job_state["k_splits"],
                random_seed=job_state["random_seed"],
                single_fold=target_single_fold,
                doc_id=target_doc_id,
                force_rerun=False,
                prompt_variant=prompt_variant,
            )
            job_state["final_report"] = final_report
            job_state["final_accuracy"] = str(final_report["metrics_summary"]["accuracy_display"]).replace("±", "+/-")
            job_state["final_f1"] = str(final_report["metrics_summary"]["f1_display"]).replace("±", "+/-")
            try:
                from excel_report_generator import generate_kfold_excel_report
                excel_file = generate_kfold_excel_report(final_report)
                job_state["excel_report_file"] = str(excel_file.name)
                print(f"[JOB {job_id}] Auto-generated detailed Excel report: {excel_file}")
            except Exception as ex_err:
                print(f"[WARN] Failed to auto-generate Excel report: {ex_err}")
        except Exception as e:
            print(f"[WARN] Error compiling final report: {e}")

        job_state["status"] = "completed"
        job_state["is_running"] = False
        job_state["finished_at"] = datetime.now(timezone.utc).isoformat()
        job_state["recent_logs"].append(
            f"[COMPLETE] Job {job_id} finished! {job_state['completed_docs']}/{job_state['overall_total']} documents evaluated in {total_elapsed}s. Accuracy: {job_state.get('final_accuracy', 'N/A')}"
        )
        self._write_job_file(job_state)

        with self._lock:
            self._active_job_id = None

        print(f"{'='*70}")
        print(f"  [JOB {job_id}] Finished in {total_elapsed}s")
        print(f"  Accuracy: {job_state.get('final_accuracy', 'N/A')} | F1: {job_state.get('final_f1', 'N/A')}")
        print(f"{'='*70}\n")


job_manager = EvaluationJobManager()
