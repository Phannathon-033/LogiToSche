import { AlertCircle, CheckCircle2, FileText, Loader2, Play, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/apiClient";
import { processDocumentWithOcrAndSlm } from "../../services/documentProcessingPipeline";
import type { JsonSchemaOutput } from "../../types";

type FileKind = "PDF" | "JPG" | "PNG";
type RowStatus = "idle" | "running" | "done" | "error";

interface GroundTruthDoc {
  id: string;
  file_name: string;
  category?: string;
  ground_truth: Record<string, unknown>;
}

interface FieldDetail {
  fileName: string;
  docId: string;
  field: string;
  predicted: string;
  expected: string;
  matched: boolean;
  similarity: number;
}

interface RowState {
  files: File[];
  status: RowStatus;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  avgTimeSec: number | null;
  doneCount: number;
  messages: string[];
  details: FieldDetail[];
}

interface AdminFileTypeLiveTestProps {
  showToast: (message: string) => void;
}

const FILE_KINDS: Array<{ kind: FileKind; accept: string; extensions: string[] }> = [
  { kind: "PDF", accept: ".pdf,application/pdf", extensions: [".pdf"] },
  { kind: "JPG", accept: ".jpg,.jpeg,image/jpeg", extensions: [".jpg", ".jpeg"] },
  { kind: "PNG", accept: ".png,image/png", extensions: [".png"] },
];

const CORE_FIELDS = [
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
] as const;

function emptyRow(): RowState {
  return { files: [], status: "idle", precision: null, recall: null, f1: null, avgTimeSec: null, doneCount: 0, messages: [], details: [] };
}

function percent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function seconds(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function compactValue(value: unknown): string {
  return normalizeValue(value).replace(/[\s.,\-_/()]+/g, "");
}

function levenshteinSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right || left === "-" || right === "-") return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current.push(Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)));
    }
    previous = current;
  }
  return Math.max(0, 1 - previous[right.length] / Math.max(left.length, right.length));
}

function compareValues(left: unknown, right: unknown) {
  const a = normalizeValue(left);
  const b = normalizeValue(right);
  const an = Number(a.replace(/[$,]/g, ""));
  const bn = Number(b.replace(/[$,]/g, ""));
  if (a && b && Number.isFinite(an) && Number.isFinite(bn)) {
    const exact = Math.abs(an - bn) < 0.01;
    const similarity = exact ? 1 : Math.max(0, 1 - Math.abs(an - bn) / (Math.abs(bn) + 1e-6));
    return { matched: exact, similarity };
  }
  if (a === b || (compactValue(a) && compactValue(a) === compactValue(b))) return { matched: true, similarity: 1 };
  const similarity = levenshteinSimilarity(a, b);
  // ponytail: 0.82 mirrors fuzzy thesis scoring; tune only if official backend thresholds change.
  return { matched: similarity >= 0.82, similarity };
}

function docKey(fileName: string): string | null {
  const doc = fileName.match(/DOC[-_ ]?(\d{1,3})/i)?.[1];
  if (doc) return doc.padStart(3, "0");
  return fileName.match(/^(\d{3})/)?.[1] ?? null;
}

function fieldValue(schema: JsonSchemaOutput, field: (typeof CORE_FIELDS)[number]): unknown {
  if (field === "document_number") return schema.document_number || schema.document_no || schema.invoice_no;
  if (field === "sender") return schema.sender || schema.party_name;
  if (field === "receiver") return schema.receiver || schema.receiver_name;
  return schema[field];
}

function scorePrediction(prediction: JsonSchemaOutput, truth: Record<string, unknown>, fileName: string, docId: string) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const details: FieldDetail[] = [];

  for (const field of CORE_FIELDS) {
    const predicted = fieldValue(prediction, field);
    const expected = truth[field];
    const predText = normalizeValue(predicted);
    const truthText = normalizeValue(expected);
    const hasPredicted = predText !== "" && predText !== "-" && predText !== "n/a";
    const hasExpected = truthText !== "" && truthText !== "-" && truthText !== "n/a";
    const comparison = compareValues(predicted, expected);

    if (!hasPredicted && !hasExpected) {
      tp += 1;
    } else if (hasPredicted && hasExpected && comparison.matched) {
      tp += 1;
    } else {
      if (hasPredicted) fp += 1;
      if (hasExpected) fn += 1;
    }

    details.push({
      fileName,
      docId,
      field,
      predicted: predicted === null || predicted === undefined || predicted === "" ? "-" : String(predicted),
      expected: expected === null || expected === undefined || expected === "" ? "-" : String(expected),
      matched: (!hasPredicted && !hasExpected) || (hasPredicted && hasExpected && comparison.matched),
      similarity: comparison.similarity,
    });
  }

  return { tp, fp, fn, details };
}

function calcMetrics(tp: number, fp: number, fn: number) {
  const precision = tp + fp ? (tp / (tp + fp)) * 100 : 0;
  const recall = tp + fn ? (tp / (tp + fn)) * 100 : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

export function AdminFileTypeLiveTest({ showToast }: AdminFileTypeLiveTestProps) {
  const [rows, setRows] = useState<Record<FileKind, RowState>>({ PDF: emptyRow(), JPG: emptyRow(), PNG: emptyRow() });
  const [groundTruth, setGroundTruth] = useState<GroundTruthDoc[]>([]);
  const [groundTruthLoading, setGroundTruthLoading] = useState(true);
  const [runningKind, setRunningKind] = useState<FileKind | "all" | null>(null);
  const language = "th" as const;

  const groundTruthByKey = useMemo(() => {
    const map = new Map<string, GroundTruthDoc>();
    groundTruth.forEach((doc) => {
      const key = docKey(doc.file_name) || docKey(doc.id);
      if (key) map.set(key, doc);
    });
    return map;
  }, [groundTruth]);

  useEffect(() => {
    let active = true;
    apiFetch("/api/benchmark/ground-truth")
      .then((response) => {
        if (!response.ok) throw new Error(`Ground truth failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (active) setGroundTruth(Array.isArray(data?.documents) ? data.documents : []);
      })
      .catch((error) => showToast(error instanceof Error ? error.message : "โหลด ground truth ไม่สำเร็จ"))
      .finally(() => {
        if (active) setGroundTruthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  function setFiles(kind: FileKind, files: File[]) {
    const allowed = FILE_KINDS.find((item) => item.kind === kind)?.extensions ?? [];
    const filtered = files.filter((file) => allowed.some((ext) => file.name.toLowerCase().endsWith(ext)));
    setRows((current) => ({
      ...current,
      [kind]: { ...emptyRow(), files: filtered, messages: filtered.length === files.length ? [] : ["ข้ามไฟล์ที่นามสกุลไม่ตรงกับแถวนี้"] },
    }));
  }

  async function runKind(kind: FileKind) {
    const row = rows[kind];
    if (!row.files.length) {
      showToast(`กรุณาเลือกไฟล์ ${kind} ก่อน`);
      return;
    }

    setRunningKind(kind);
    setRows((current) => ({ ...current, [kind]: { ...current[kind], status: "running", messages: [], doneCount: 0 } }));

    let tp = 0;
    let fp = 0;
    let fn = 0;
    let matched = 0;
    let totalTime = 0;
    const messages: string[] = [];
    const details: FieldDetail[] = [];

    for (const file of row.files) {
      const key = docKey(file.name);
      const truth = key ? groundTruthByKey.get(key) : undefined;
      if (!truth) {
        messages.push(`${file.name}: ไม่พบ ground truth ที่ตรงกัน`);
        continue;
      }

      try {
        const start = performance.now();
        const { normalizedSchema } = await processDocumentWithOcrAndSlm({
          file,
          documentTypeHint: truth.category || "Invoice",
          sourceFile: file.name,
          language,
        });
        const elapsed = (performance.now() - start) / 1000;
        const score = scorePrediction(normalizedSchema, truth.ground_truth, file.name, truth.id);
        tp += score.tp;
        fp += score.fp;
        fn += score.fn;
        details.push(...score.details);
        matched += 1;
        totalTime += elapsed;
        setRows((current) => ({ ...current, [kind]: { ...current[kind], doneCount: matched } }));
      } catch (error) {
        messages.push(`${file.name}: ${error instanceof Error ? error.message : "ประมวลผลไม่สำเร็จ"}`);
      }
    }

    const metrics = matched ? calcMetrics(tp, fp, fn) : { precision: null, recall: null, f1: null };
    setRows((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        status: matched ? "done" : "error",
        precision: metrics.precision,
        recall: metrics.recall,
        f1: metrics.f1,
        avgTimeSec: matched ? totalTime / matched : null,
        doneCount: matched,
        messages,
        details,
      },
    }));
    setRunningKind(null);
    showToast(matched ? `ทดสอบ ${kind} เสร็จ ${matched} ฉบับ` : `ทดสอบ ${kind} ไม่สำเร็จ`);
  }

  async function runAll() {
    setRunningKind("all");
    for (const item of FILE_KINDS) {
      if (rows[item.kind].files.length) await runKind(item.kind);
    }
    setRunningKind(null);
  }

  const isRunning = runningKind !== null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Live OCR / SLM Evaluation</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">ตารางที่ 4.8 ผลการทดสอบแยกตามชนิดไฟล์เอกสาร</h2>
            <p className="mt-1 text-sm text-slate-500">อัปโหลด PDF, JPG และ PNG แล้วรัน PaddleOCR + Qwen SLM สด เทียบกับชุด Ground Truth เดิม</p>
          </div>
          <button
            type="button"
            disabled={isRunning || groundTruthLoading || !FILE_KINDS.some((item) => rows[item.kind].files.length)}
            onClick={runAll}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningKind === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            รันทดสอบทั้งหมด
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-panel">
        <table className="w-full min-w-[900px] border-collapse text-center text-sm">
          <thead className="bg-slate-50 text-slate-900">
            <tr>
              <th className="border border-slate-300 px-4 py-4 font-black">ชนิดไฟล์</th>
              <th className="border border-slate-300 px-4 py-4 font-black">จำนวนเอกสาร<br />(ฉบับ)</th>
              <th className="border border-slate-300 px-4 py-4 font-black">Precision</th>
              <th className="border border-slate-300 px-4 py-4 font-black">Recall</th>
              <th className="border border-slate-300 px-4 py-4 font-black">F1-Score</th>
              <th className="border border-slate-300 px-4 py-4 font-black">Processing Time<br />เฉลี่ย (วินาที/ฉบับ)</th>
              <th className="border border-slate-300 px-4 py-4 font-black">ไฟล์ / รันสด</th>
            </tr>
          </thead>
          <tbody>
            {FILE_KINDS.map(({ kind, accept }) => {
              const row = rows[kind];
              const rowRunning = runningKind === kind;
              return (
                <tr key={kind} className="bg-white">
                  <td className="border border-slate-300 px-4 py-5 text-base font-semibold text-slate-800">{kind}</td>
                  <td className="border border-slate-300 px-4 py-5 font-mono text-slate-700">{row.files.length || "—"}</td>
                  <td className="border border-slate-300 px-4 py-5 font-mono text-slate-700">{percent(row.precision)}</td>
                  <td className="border border-slate-300 px-4 py-5 font-mono text-slate-700">{percent(row.recall)}</td>
                  <td className="border border-slate-300 px-4 py-5 font-mono text-slate-700">{percent(row.f1)}</td>
                  <td className="border border-slate-300 px-4 py-5 font-mono text-slate-700">{seconds(row.avgTimeSec)}</td>
                  <td className="border border-slate-300 px-4 py-4">
                    <div className="flex flex-col items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100">
                        <UploadCloud className="h-4 w-4 text-blue-600" />
                        เลือกไฟล์ {kind}
                        <input
                          type="file"
                          accept={accept}
                          multiple
                          disabled={isRunning}
                          className="hidden"
                          onChange={(event) => setFiles(kind, Array.from(event.target.files || []))}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isRunning || groundTruthLoading || !row.files.length}
                        onClick={() => runKind(kind)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {rowRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : row.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {rowRunning ? `กำลังรัน ${row.doneCount}/${row.files.length}` : "รันแถวนี้"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {FILE_KINDS.map(({ kind }) => {
          const row = rows[kind];
          return (
            <div key={kind} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-black text-slate-900"><FileText className="h-4 w-4 text-blue-600" /> {kind}</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${row.status === "done" ? "bg-emerald-50 text-emerald-700" : row.status === "error" ? "bg-rose-50 text-rose-700" : row.status === "running" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                  {row.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">ไฟล์: {row.files.map((file) => file.name).join(", ") || "ยังไม่ได้เลือก"}</p>
              {row.details.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="font-black text-slate-700">
                    ตรง {row.details.filter((detail) => detail.matched).length}/{row.details.length} ฟิลด์
                  </p>
                  <div className="mt-2 max-h-44 space-y-1 overflow-auto pr-1">
                    {row.details.filter((detail) => !detail.matched).slice(0, 12).map((detail) => (
                      <p key={`${detail.fileName}-${detail.field}`} className="text-slate-600">
                        <span className="font-bold text-rose-700">{detail.field}</span>: ได้ “{detail.predicted}” / เฉลย “{detail.expected}” ({Math.round(detail.similarity * 100)}%)
                      </p>
                    ))}
                    {row.details.filter((detail) => !detail.matched).length === 0 && <p className="text-emerald-700">ทุกฟิลด์ตรงกับ ground truth</p>}
                  </div>
                </div>
              )}
              {row.messages.length > 0 && (
                <div className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {row.messages.map((message) => (
                    <p key={message} className="flex gap-1.5"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {message}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
