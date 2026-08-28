import { OcrProcessingAnimation } from "./OcrProcessingAnimation";
import {
  AlignLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Code2,
  Filter,
  Info,
  LayoutGrid,
  MapPin,
  ScanText,
  Search,
  Sparkles,
  Table,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OcrLine } from "../services/ocrApi";
import { Card } from "./Card";

interface OCRResultPanelProps {
  text: string;
  spatialText?: string;
  lines?: OcrLine[];
  onCopy: () => void;
}

export function OCRResultPanel({ text, spatialText, lines = [], onCopy }: OCRResultPanelProps) {
  const [viewMode, setViewMode] = useState<"table" | "json" | "raw">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterConfidence, setFilterConfidence] = useState<"all" | "high" | "review">("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const isLoading = text === "กำลังส่งไฟล์ไปยัง PaddleOCR Backend..." || text === "กำลังส่งไฟล์ไปยัง PaddleOCR GPU...";

  // Format exact standard OCR JSON structure with text, confidence, bounding_box
  const ocrJsonObjects = useMemo(() => {
    return lines.map((line) => ({
      text: line.text,
      confidence: Number((line.confidence ?? 0.95).toFixed(2)),
      bounding_box: line.bounding_box || line.box || [],
    }));
  }, [lines]);

  const ocrJsonString = useMemo(() => {
    return JSON.stringify(ocrJsonObjects, null, 2);
  }, [ocrJsonObjects]);

  // Filtered lines according to search and confidence filter
  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      const rawConf = line.confidence ?? 0.95;
                    const conf = rawConf > 1.0 ? rawConf / 100.0 : rawConf;
      const matchesSearch = !searchQuery.trim() || line.text.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterConfidence === "high") return conf >= 0.9;
      if (filterConfidence === "review") return conf < 0.85;
      return true;
    });
  }, [lines, searchQuery, filterConfidence]);

  // Overall OCR summary statistics
  const stats = useMemo(() => {
    if (lines.length === 0) return { count: 0, avgConf: 0, highCount: 0, reviewCount: 0 };
    const confs = lines.map((l) => l.confidence ?? 0.95);
    const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
    const high = confs.filter((c) => c >= 0.9).length;
    const review = confs.filter((c) => c < 0.85).length;
    return {
      count: lines.length,
      avgConf: Math.round(avg * 100),
      highCount: high,
      reviewCount: review,
    };
  }, [lines]);

  function handleCopy() {
    let textToCopy = text;
    if (viewMode === "json") {
      textToCopy = ocrJsonString;
    } else if (viewMode === "raw") {
      textToCopy = text;
    } else {
      textToCopy = lines
        .map(
          (l, i) =>
            `#${i + 1} [${Math.round((l.confidence ?? 0.95) * 100)}%]: ${l.text} (ตำแหน่ง: ${l.position?.region || "body"})`,
        )
        .join("\n");
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  }

  function getHumanRegion(region?: string) {
    switch (region) {
      case "top-left":
        return { label: "มุมบนซ้าย (Top-Left)", color: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800" };
      case "top-center":
        return { label: "แถวบนกลาง (Top-Center)", color: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800" };
      case "top-right":
        return { label: "แถวบนขวา (Top-Right)", color: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800" };
      case "middle-left":
        return { label: "กึ่งกลางซ้าย (Middle-Left)", color: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800" };
      case "middle-right":
        return { label: "กึ่งกลางขวา (Middle-Right)", color: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800" };
      case "bottom-left":
        return { label: "ด้านล่างซ้าย (Bottom-Left)", color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" };
      case "bottom-right":
        return { label: "ด้านล่างขวา (Bottom-Right)", color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" };
      case "bottom-center":
        return { label: "ด้านล่างกลาง (Bottom-Center)", color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" };
      default:
        return { label: "ตัวเนื้อหาเอกสาร (Body)", color: "bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" };
    }
  }

  function getHumanBoxInfo(box?: number[][]) {
    if (!box || box.length < 4) return { summary: "ไม่พบพิกัด", x: 0, y: 0, w: 0, h: 0 };
    const xs = box.map((p) => p[0]);
    const ys = box.map((p) => p[1]);
    const minX = Math.round(Math.min(...xs));
    const minY = Math.round(Math.min(...ys));
    const maxX = Math.round(Math.max(...xs));
    const maxY = Math.round(Math.max(...ys));
    const w = maxX - minX;
    const h = maxY - minY;
    return {
      summary: `(X: ${minX}, Y: ${minY}) · กว้าง ${w}px · สูง ${h}px`,
      x: minX,
      y: minY,
      w,
      h,
    };
  }

  function getConfidenceBadge(conf: number) {
    const pct = Math.round(conf * 100);
    const isBelowThreshold = conf < 0.85;

    if (conf >= 0.90) {
      return {
        pct: `${pct}%`,
        score: conf.toFixed(2),
        label: "มั่นใจสูงมาก",
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        bar: "bg-emerald-500",
        dot: "bg-emerald-500",
        isLow: false,
      };
    }
    if (conf >= 0.85) {
      return {
        pct: `${pct}%`,
        score: conf.toFixed(2),
        label: "ผ่านเกณฑ์ (ปกติ)",
        badge: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        bar: "bg-blue-500",
        dot: "bg-blue-500",
        isLow: false,
      };
    }
    // Below 85% threshold -> High-contrast RED highlight
    return {
      pct: `${pct}%`,
      score: conf.toFixed(2),
      label: "ต่ำกว่าเกณฑ์ (รอตรวจ)",
      badge: "bg-rose-100 text-rose-900 border-rose-400 font-extrabold ring-1 ring-rose-400/50 shadow-xs dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700",
      bar: "bg-rose-600",
      dot: "bg-rose-600",
      isLow: true,
    };
  }

  return (
    <Card
      title="ผลลัพธ์การสกัด OCR & ค่า Confidence ทุกฟิลด์"
      icon={<ScanText className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!isLoading && lines.length > 0 ? (
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">


              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "table"
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-navy dark:text-slate-400"
                }`}
                title="โหมดตารางสรุปรายการ (Structured Table View)"
              >
                <Table className="h-3.5 w-3.5" />
                <span>ตารางแจกแจง</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("json")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "json"
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-navy dark:text-slate-400"
                }`}
                title="โหมดโครงสร้าง JSON สำหรับนักพัฒนา (Raw JSON Code)"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>JSON Code</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "raw"
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-navy dark:text-slate-400"
                }`}
                title="แสดงข้อความดิบต่อเนื่อง"
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <span>ข้อความดิบ</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="คัดลอก OCR Text"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5 text-slate-500" />}
            <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
          </button>
        </div>
      }
      className="h-full"
    >
      {isLoading ? (
        <OcrProcessingAnimation isProcessing={true} />
      ) : lines.length > 0 ? (
        <div className="space-y-3">
          {/* Summary Dashboard Banner (Human Readable) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-3 text-xs dark:border-blue-900/50 dark:from-slate-800/80 dark:to-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-navy dark:text-white">
                <Sparkles className="h-4 w-4 text-primary" />
                สกัดทั้งหมด <b>{stats.count} ฟิลด์</b>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-black text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                ความมั่นใจเฉลี่ย: {stats.avgConf}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                (🟢 สมบูรณ์ {stats.highCount} · 🔴 รอตรวจ {stats.reviewCount})
              </span>
            </div>

            {/* Quick Search & Filter Inputs */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาข้อความ OCR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-36 rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs font-medium placeholder-slate-400 transition focus:w-48 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <select
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value as "all" | "high" | "review")}
                className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 transition focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">ความมั่นใจทั้งหมด</option>
                <option value="high">🟢 สูงมาก (≥90%)</option>
                <option value="review">🔴 ตรวจสอบ (&lt;85%)</option>
              </select>
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW MODE 2: STRUCTURED TABLE VIEW (โหมดตารางแจกแจง) */}
          {/* ========================================================= */}
          {viewMode === "table" ? (
            <div className="h-[385px] min-h-[385px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 font-extrabold text-navy dark:border-slate-800 dark:bg-slate-800 dark:text-white">
                  <tr>
                    <th className="px-3 py-2.5">ลำดับ</th>
                    <th className="px-3 py-2.5">ข้อความที่สกัดได้ (Text)</th>
                    <th className="px-3 py-2.5 text-center">ความมั่นใจ (Confidence)</th>
                    <th className="px-3 py-2.5">ตำแหน่ง (Region)</th>
                    <th className="px-3 py-2.5">พิกัด Bounding Box</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium dark:divide-slate-800">
                  {filteredLines.map((line, idx) => {
                    const rawConf = line.confidence ?? 0.95;
                    const conf = rawConf > 1.0 ? rawConf / 100.0 : rawConf;
                    const confBadge = getConfidenceBadge(conf);
                    const regionInfo = getHumanRegion(line.position?.region);
                    const boxInfo = getHumanBoxInfo(line.bounding_box || line.box);

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          confBadge.isLow
                            ? "bg-rose-50/85 hover:bg-rose-100/80 border-l-4 border-l-rose-500 dark:bg-rose-950/50 dark:border-l-rose-500"
                            : "hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-500">#{idx + 1}</td>
                        <td className={`px-3 py-2.5 font-bold ${confBadge.isLow ? "text-rose-900 dark:text-rose-200" : "text-navy dark:text-white"}`}>
                          <div className="flex items-center gap-1.5">
                            {confBadge.isLow && <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="ต่ำกว่าเกณฑ์" />}
                            <span>{line.text}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-black ${confBadge.badge}`}>
                            {confBadge.isLow ? "🔴 " : ""}{confBadge.pct} ({confBadge.score})
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${regionInfo.color}`}>
                            {regionInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                          {boxInfo.summary}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* ========================================================= */}
          {/* VIEW MODE 3: RAW JSON FORMAT (สำหรับโปรแกรมเมอร์/API) */}
          {/* ========================================================= */}
          {viewMode === "json" ? (
            <div className="relative h-[385px] min-h-[385px] overflow-auto rounded-xl border border-slate-700 bg-[#0F172A] p-4 font-mono text-xs leading-6 shadow-inner">
              <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>โครงสร้าง JSON มาตรฐานพร้อม <code>text</code>, <code>confidence</code>, <code>bounding_box</code></span>
                </span>
                <span className="rounded border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  {lines.length} ฟิลด์
                </span>
              </div>
              <pre className="whitespace-pre font-medium text-emerald-400">{ocrJsonString}</pre>
            </div>
          ) : null}

          {/* ========================================================= */}
          {/* VIEW MODE 4: RAW TEXT CONTINUOUS */}
          {/* ========================================================= */}
          {viewMode === "raw" ? (
            <pre className="h-[385px] min-h-[385px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-5 font-mono text-xs leading-6 text-emerald-400 shadow-inner whitespace-pre-wrap">
              {text}
            </pre>
          ) : null}
        </div>
      ) : (
        <pre className="h-[430px] min-h-[430px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-5 font-mono text-xs leading-6 text-emerald-400 shadow-inner whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </Card>
  );
}
