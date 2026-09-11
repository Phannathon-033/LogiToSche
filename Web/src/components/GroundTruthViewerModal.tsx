import {
  AlertCircle,
  Award,
  BookmarkCheck,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Sparkles,
  Table,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface GroundTruthViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroundTruthDoc {
  id: string;
  file_name: string;
  category: string;
  annotated_at?: string;
  status?: string;
  ground_truth: Record<string, any>;
}

interface KFoldReport {
  method: string;
  dataset: string;
  total_documents: number;
  k_splits: number;
  metrics_summary: {
    mean_accuracy_pct: number;
    accuracy_std_dev: number;
    accuracy_display: string;
    mean_f1_score_pct: number;
    f1_std_dev: number;
    f1_display: string;
    mean_similarity_pct: number;
    similarity_std_dev: number;
    similarity_display: string;
  };
  field_performance: Record<
    string,
    {
      mean_accuracy_pct: number;
      std_dev: number;
      display: string;
      scores_per_fold: number[];
    }
  >;
  folds: Array<{
    fold: number;
    val_samples_count: number;
    overall_accuracy_pct: number;
    precision_pct: number;
    recall_pct: number;
    f1_score_pct: number;
    field_accuracies: Record<string, number>;
  }>;
}

const FIELD_LABELS: Record<string, string> = {
  document_type: "1. ประเภทเอกสาร (document_type)",
  document_number: "2. เลขที่เอกสาร (document_number)",
  document_date: "3. วันที่เอกสาร (document_date)",
  sender: "4. ผู้ส่ง / ผู้ขาย (sender)",
  receiver: "5. ผู้รับ / ผู้ซื้อ (receiver)",
  origin: "6. ต้นทาง (origin)",
  destination: "7. ปลายทาง (destination)",
  reference_number: "8. เลขที่อ้างอิง (reference_number)",
  unit_price: "9. ราคาต่อหน่วย (unit_price)",
  total_amount: "10. มูลค่ารวม (total_amount)",
  currency: "11. สกุลเงิน (currency)",
};

export function GroundTruthViewerModal({ isOpen, onClose }: GroundTruthViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"dataset" | "kfold">("dataset");
  const [documents, setDocuments] = useState<GroundTruthDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GroundTruthDoc | null>(null);
  const [kfoldReport, setKfoldReport] = useState<KFoldReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRerunningKFold, setIsRerunningKFold] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch Ground Truth Dataset
      const gtResp = await fetch("http://127.0.0.1:8001/api/benchmark/ground-truth");
      if (gtResp.ok) {
        const data = await gtResp.json();
        const docs = data.documents || [];
        setDocuments(docs);
        if (docs.length > 0 && !selectedDoc) {
          setSelectedDoc(docs[0]);
        }
      }

      // 2. Fetch K-Fold Report
      const kfResp = await fetch("http://127.0.0.1:8001/api/benchmark/kfold");
      if (kfResp.ok) {
        const kfData = await kfResp.json();
        setKfoldReport(kfData);
      }
    } catch (err) {
      console.error("Failed to fetch benchmark data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRerunKFold() {
    setIsRerunningKFold(true);
    try {
      const resp = await fetch("http://127.0.0.1:8001/api/benchmark/kfold?rerun=true");
      if (resp.ok) {
        const data = await resp.json();
        setKfoldReport(data);
      }
    } catch (err) {
      console.error("Failed to rerun K-Fold:", err);
    } finally {
      setIsRerunningKFold(false);
    }
  }

  function handleDownloadDataset() {
    const jsonStr = JSON.stringify(
      {
        description: "LogiSchema Benchmark Ground Truth Dataset (11 Core Fields)",
        total_documents: documents.length,
        exported_at: new Date().toISOString(),
        documents,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ground_truth_dataset.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopyThesisTable() {
    if (!kfoldReport) return;
    const lines: string[] = [];
    lines.push(`### ตารางผลการทดสอบ ${kfoldReport.k_splits}-Fold Cross-Validation ของระบบ LogiSchema`);
    lines.push(`*การประเมินความแม่นยำในการแปลงเอกสารโลจิสติกส์สู่ 11 ฟิลด์มาตรฐาน (ชุดข้อมูล N=${kfoldReport.total_documents} ฉบับ)*
`);

    const header =
      `| ฟิลด์ข้อมูล (Core Fields) | ` +
      kfoldReport.folds.map((f) => `Fold ${f.fold} (%)`).join(" | ") +
      ` | ค่าเฉลี่ยรวม (Mean ± Std) |`;
    const sep = `| :--- | ` + kfoldReport.folds.map(() => `:---:`).join(" | ") + ` | :---: |`;
    lines.push(header);
    lines.push(sep);

    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      const perf = kfoldReport.field_performance[key];
      if (perf) {
        const scores = perf.scores_per_fold.map((s) => `${s.toFixed(1)}%`).join(" | ");
        lines.push(`| ${label} | ${scores} | **${perf.display}** |`);
      }
    }

    const foldAccs = kfoldReport.folds.map((f) => `**${f.overall_accuracy_pct.toFixed(1)}%**`).join(" | ");
    lines.push(`| **ความแม่นยำภาพรวม (Overall Accuracy)** | ${foldAccs} | **${kfoldReport.metrics_summary.accuracy_display}** |`);

    const foldF1s = kfoldReport.folds.map((f) => `${f.f1_score_pct.toFixed(1)}%`).join(" | ");
    lines.push(`| **F1-Score รวม (Overall F1-Score)** | ${foldF1s} | **${kfoldReport.metrics_summary.f1_display}** |`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  }

  if (!isOpen) return null;

  const filteredDocs = documents.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.file_name.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      (d.ground_truth.sender && String(d.ground_truth.sender).toLowerCase().includes(q)) ||
      (d.ground_truth.document_number && String(d.ground_truth.document_number).toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100 text-purple-700 shadow-xs dark:bg-purple-950/70 dark:text-purple-300">
              <BookmarkCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>คลังข้อมูลเฉลย Ground Truth & สถิติ K-Fold Benchmark</span>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {documents.length} เอกสาร
                </span>
              </h2>
              <p className="text-xs font-medium text-slate-500">
                ชุดข้อมูลค่าจริงที่ได้รับการตรวจยืนยัน สำหรับประเมินความแม่นยำของโมเดล SLM ในเล่มวิทยานิพนธ์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadDataset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="ดาวน์โหลดไฟล์ JSON Ground Truth Dataset"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>ดาวน์โหลด JSON</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("dataset")}
              className={`flex items-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === "dataset"
                  ? "border-purple-600 text-purple-700 dark:text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>1. รายการเอกสาร Ground Truth ({documents.length} ฉบับ)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kfold")}
              className={`flex items-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === "kfold"
                  ? "border-purple-600 text-purple-700 dark:text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>2. รายงานผล 5-Fold Cross-Validation (Thesis Benchmark)</span>
            </button>
          </div>

          {activeTab === "kfold" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyThesisTable}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                title="คัดลอกตารางผลทดสอบเป็น Markdown สำหรับแปะในเล่มวิทยานิพนธ์"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copySuccess ? "คัดลอกสำเร็จ!" : "คัดลอกตาราง Markdown"}</span>
              </button>
              <button
                type="button"
                onClick={handleRerunKFold}
                disabled={isRerunningKFold}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRerunningKFold ? "animate-spin" : ""}`} />
                <span>{isRerunningKFold ? "กำลังคำนวณ..." : "รัน K-Fold ใหม่"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Dataset List & Side-by-side Inspection */}
        {activeTab === "dataset" && (
          <div className="grid flex-1 grid-cols-1 md:grid-cols-[400px_1fr] overflow-hidden">
            {/* Left: Document Table List */}
            <div className="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไฟล์, เลขที่, บริษัท..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const gt = doc.ground_truth;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className={`w-full text-left p-3.5 transition-all ${
                        isSelected
                          ? "bg-purple-50/90 ring-1 ring-purple-400/40 dark:bg-purple-950/60"
                          : "hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black text-purple-700 dark:text-purple-400">
                          {doc.id}
                        </span>
                        <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300 uppercase">
                          {doc.category || gt.document_type || "document"}
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-xs text-slate-900 dark:text-white truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>เลขที่: <b className="text-slate-700 dark:text-slate-300">{gt.document_number || "-"}</b></span>
                        <span className="font-bold text-emerald-600">
                          {gt.total_amount ? `${Number(gt.total_amount).toLocaleString()} ${gt.currency || "THB"}` : "-"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Full 11-Core-Fields Ground Truth Detail */}
            <div className="flex flex-col p-6 overflow-y-auto bg-white dark:bg-slate-900">
              {selectedDoc ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-purple-600">{selectedDoc.id}</span>
                        <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> ตรวจยืนยันแล้ว (Human-Verified Ground Truth)
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {selectedDoc.file_name}
                      </h3>
                      {selectedDoc.annotated_at && (
                        <p className="text-xs text-slate-500">บันทึกเมื่อ: {selectedDoc.annotated_at}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                      ค่าเฉลยจริงทั้ง 11 ฟิลด์มาตรฐาน (Ground Truth Core Fields)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(FIELD_LABELS).map(([key, label]) => {
                        const val = selectedDoc.ground_truth[key];
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-950/40"
                          >
                            <span className="block text-[11px] font-bold text-slate-500">{label}</span>
                            <span className="block text-sm font-bold text-slate-900 dark:text-white mt-0.5 break-words font-mono">
                              {val !== undefined && val !== null && String(val) !== "" ? String(val) : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center text-slate-400 text-sm font-bold">
                  เลือกเอกสารทางซ้ายเพื่อดูค่าเฉลย Ground Truth
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: 5-Fold Cross-Validation Report */}
        {activeTab === "kfold" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40 dark:bg-slate-950">
            {kfoldReport ? (
              <>
                {/* Hero Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 p-4 shadow-sm">
                    <span className="text-xs font-bold text-slate-500">ความแม่นยำภาพรวม (Overall Accuracy)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        {kfoldReport.metrics_summary.accuracy_display}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">ค่าเฉลี่ย 5 รอบ ± ส่วนเบี่ยงเบนมาตรฐาน</span>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/40 p-4 shadow-sm">
                    <span className="text-xs font-bold text-slate-500">คะแนน F1-Score เฉลี่ย (Overall F1)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-600 font-mono">
                        {kfoldReport.metrics_summary.f1_display}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Harmonic Mean ของ Precision & Recall</span>
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/40 p-4 shadow-sm">
                    <span className="text-xs font-bold text-slate-500">ความเหมือนตัวอักษร (Avg Similarity)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-purple-600 font-mono">
                        {kfoldReport.metrics_summary.similarity_display}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Levenshtein Token Distance</span>
                  </div>
                </div>

                {/* 5-Fold Benchmark Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      ตารางเปรียบเทียบความแม่นยำรายฟิลด์ในแต่ละ Fold (Fold 1 ถึง Fold 5)
                    </h3>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      K={kfoldReport.k_splits} Folds
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-100 text-slate-600 font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="p-3">ฟิลด์ข้อมูล (Core Field)</th>
                          {kfoldReport.folds.map((f) => (
                            <th key={f.fold} className="p-3 text-center">Fold {f.fold}</th>
                          ))}
                          <th className="p-3 text-center bg-purple-50 text-purple-900 font-black">
                            ค่าเฉลี่ยรวม (Mean ± Std)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(FIELD_LABELS).map(([key, label]) => {
                          const perf = kfoldReport.field_performance[key];
                          return (
                            <tr key={key} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-bold text-slate-900 dark:text-white">{label}</td>
                              {perf ? (
                                perf.scores_per_fold.map((score, sIdx) => (
                                  <td key={sIdx} className="p-3 text-center font-mono font-bold text-emerald-600">
                                    {score.toFixed(1)}%
                                  </td>
                                ))
                              ) : (
                                <td colSpan={kfoldReport.folds.length} className="text-center text-slate-400">-</td>
                              )}
                              <td className="p-3 text-center font-mono font-black text-purple-800 bg-purple-50/60">
                                {perf?.display || "-"}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Summary Rows */}
                        <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                          <td className="p-3 text-slate-900 font-extrabold">ความแม่นยำภาพรวม (Overall Accuracy)</td>
                          {kfoldReport.folds.map((f) => (
                            <td key={f.fold} className="p-3 text-center font-mono text-emerald-700 font-black">
                              {f.overall_accuracy_pct.toFixed(1)}%
                            </td>
                          ))}
                          <td className="p-3 text-center font-mono text-purple-900 bg-purple-100/70 font-bold text-sm">
                            <Award className="inline h-3.5 w-3.5 mr-1 text-purple-700" />
                            {kfoldReport.metrics_summary.accuracy_display}
                          </td>
                        </tr>
                        <tr className="bg-indigo-50/40 font-bold">
                          <td className="p-3 text-indigo-950 font-semibold">F1-Score รวม (Overall F1-Score)</td>
                          {kfoldReport.folds.map((f) => (
                            <td key={f.fold} className="p-3 text-center font-mono text-indigo-700 font-bold">
                              {f.f1_score_pct.toFixed(1)}%
                            </td>
                          ))}
                          <td className="p-3 text-center font-mono text-indigo-900 bg-indigo-100/70 font-bold text-sm">
                            <Award className="inline h-3.5 w-3.5 mr-1 text-indigo-700" />
                            {kfoldReport.metrics_summary.f1_display}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid h-64 place-items-center text-slate-400 font-bold text-sm">
                กำลังโหลดข้อมูลรายงาน K-Fold Cross-Validation...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
