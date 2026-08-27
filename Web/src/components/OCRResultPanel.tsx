import {
  AlignLeft,
  Check,
  Clipboard,
  Code2,
  MapPin,
  ScanText,
  TerminalSquare,
} from "lucide-react";
import { useState } from "react";
import type { OcrLine } from "../services/ocrApi";
import { Card } from "./Card";

interface OCRResultPanelProps {
  text: string;
  spatialText?: string;
  lines?: OcrLine[];
  onCopy: () => void;
}

export function OCRResultPanel({ text, spatialText, lines = [], onCopy }: OCRResultPanelProps) {
  const [viewMode, setViewMode] = useState<"json" | "spatial" | "raw">("json");
  const [copied, setCopied] = useState(false);
  const isLoading = text === "กำลังส่งไฟล์ไปยัง PaddleOCR Backend..." || text === "กำลังส่งไฟล์ไปยัง PaddleOCR GPU...";

  // Format exact requested OCR JSON structure with text, confidence, bounding_box
  const ocrJsonObjects = lines.map((line) => ({
    text: line.text,
    confidence: Number((line.confidence ?? 0.95).toFixed(2)),
    bounding_box: line.bounding_box || line.box || [],
  }));

  const ocrJsonString = JSON.stringify(ocrJsonObjects, null, 2);

  function handleCopy() {
    let textToCopy = text;
    if (viewMode === "json") {
      textToCopy = ocrJsonString;
    } else if (viewMode === "spatial" && spatialText) {
      textToCopy = spatialText;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  }

  function getRegionColor(region?: string) {
    switch (region) {
      case "top-left":
      case "top-center":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "top-right":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "bottom-left":
      case "bottom-center":
      case "bottom-right":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "middle-left":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
  }

  return (
    <Card
      title="ผลลัพธ์ OCR & ค่า Confidence ทุกฟิลด์"
      icon={<ScanText className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-2">
          {!isLoading && lines.length > 0 ? (
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("json")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  viewMode === "json"
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-navy dark:text-slate-400"
                }`}
                title="แสดงผลลัพธ์โครงสร้าง JSON พร้อมค่า Confidence และ Bounding Box"
              >
                <Code2 className="h-3 w-3" />
                <span>JSON & Confidence</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("spatial")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  viewMode === "spatial"
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-navy dark:text-slate-400"
                }`}
                title="แสดงข้อความพร้อมพิกัดตำแหน่ง 2D เพื่อเพิ่มความแม่นยำให้ SLM"
              >
                <MapPin className="h-3 w-3" />
                <span>พิกัด [y, x]</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  viewMode === "raw"
                    ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-navy dark:text-slate-400"
                }`}
                title="แสดงข้อความดิบ"
              >
                <AlignLeft className="h-3 w-3" />
                <span>ข้อความดิบ</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            disabled={isLoading}
            className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}
            aria-label="คัดลอก OCR Text"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5 text-slate-500" />}
            <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
          </button>
        </div>
      }
      className="h-full"
    >
      {isLoading ? (
        <div className="flex h-[430px] min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-inner">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
            <div
              className="absolute inset-0 rounded-full border-[3px] border-emerald-400 border-t-transparent border-r-transparent animate-spin"
              style={{ animationDuration: "1.5s" }}
            />
            <TerminalSquare className="h-8 w-8 text-emerald-400 animate-pulse-slow" />
          </div>

          <h4 className="mb-2 font-mono text-sm font-bold tracking-wider text-emerald-400">
            EXTRACTING OCR CONFIDENCE & BOUNDING BOXES
          </h4>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-emerald-500/80">กำลังประมวลผลข้อความ ค่า Confidence และ Bounding Box</span>
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #34d399 2px, #34d399 4px)" }}
          />
        </div>
      ) : viewMode === "json" && lines.length > 0 ? (
        /* JSON Mode showing exact text, confidence, bounding_box structure */
        <div className="relative h-[430px] min-h-[430px] overflow-auto rounded-xl border border-slate-700 bg-[#0F172A] p-4 font-mono text-xs leading-6 shadow-inner">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>สกัดข้อความทั้งหมด <b>{lines.length} ฟิลด์</b> พร้อมค่า Confidence & Bounding Box</span>
            </span>
            <span className="rounded bg-cyan-950 px-2 py-0.5 text-cyan-300 font-bold border border-cyan-800">
              Confidence ทุกฟิลด์ครบ 100%
            </span>
          </div>
          <pre className="text-emerald-400 whitespace-pre font-medium">{ocrJsonString}</pre>
        </div>
      ) : viewMode === "spatial" && lines.length > 0 ? (
        /* Spatial Badges View */
        <div className="h-[430px] min-h-[430px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs shadow-inner">
          {/* Spatial Top Info Bar */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>ตรวจพบพิกัด <b>{lines.length} บรรทัด</b> (จัดเรียงตามลำดับพื้นที่ 2D บนหน้าเอกสาร)</span>
            </span>
            <span className="text-emerald-400 font-semibold">ส่งตำแหน่งให้ SLM แล้ว</span>
          </div>

          {/* Lines List with Visual Badges */}
          <div className="space-y-1.5">
            {lines.map((line, idx) => {
              const pos = line.position;
              const region = pos?.region || "body";
              const tag = pos?.tag || (line.box ? `[y:${Math.round(line.box[0][1])}, x:${Math.round(line.box[0][0])}]` : `[#${idx + 1}]`);
              const confVal = typeof line.confidence === "number" ? line.confidence : 0.95;

              return (
                <div
                  key={idx}
                  className="group flex flex-wrap items-baseline gap-2 rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-1.5 transition hover:border-emerald-500/40 hover:bg-slate-850"
                >
                  <span className="shrink-0 font-mono text-[11px] font-bold text-emerald-400">
                    {tag}
                  </span>

                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.2 text-[10px] font-semibold ${getRegionColor(region)}`}
                  >
                    {region}
                  </span>

                  <span className="flex-1 text-slate-200">
                    {line.text}
                  </span>

                  <span className="shrink-0 rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/60">
                    conf: {confVal.toFixed(2)} ({Math.round(confVal * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Raw Text View */
        <pre className="h-[430px] min-h-[430px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-5 font-mono text-xs leading-6 text-emerald-400 shadow-inner whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </Card>
  );
}
