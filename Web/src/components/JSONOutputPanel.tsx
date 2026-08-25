import { ArrowRight, ArrowUpRight, Braces, Clipboard, Download, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { CORE_FIELDS_DEF, type JsonSchemaOutput } from "../types";
import { Card } from "./Card";

interface JSONOutputPanelProps {
  json: JsonSchemaOutput;
  onCopy: () => void;
  onDownload: () => void;
  onMoveOtherToCore?: (sourceOtherKey: string, targetCoreKey: string, removeFromOther: boolean) => void;
}

const tokenColors = {
  key: "text-sky-300",
  string: "text-amber-300",
  number: "text-orange-300",
  punctuation: "text-slate-400",
};

export function JSONOutputPanel({ json, onCopy, onDownload, onMoveOtherToCore }: JSONOutputPanelProps) {
  const [showMoveForm, setShowMoveForm] = useState(false);
  const otherKeys = json.other ? Object.keys(json.other).filter((k) => json.other[k] !== undefined && json.other[k] !== "") : [];
  const [sourceKey, setSourceKey] = useState<string>(otherKeys[0] || "");
  const [targetKey, setTargetKey] = useState<string>("party_name");
  const [removeFromOther, setRemoveFromOther] = useState(true);

  const lines = JSON.stringify(json, null, 2).split("\n");

  function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceKey || !targetKey) return;
    if (onMoveOtherToCore) {
      onMoveOtherToCore(sourceKey, targetKey, removeFromOther);
    }
    setShowMoveForm(false);
  }

  return (
    <Card
      title="JSON Schema Output (7 ฟิลด์หลัก + Other)"
      icon={<Braces className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-1.5">
          {onMoveOtherToCore && otherKeys.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!sourceKey && otherKeys.length > 0) setSourceKey(otherKeys[0]);
                setShowMoveForm(!showMoveForm);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
              title="ย้ายค่าจาก other ไปใส่ใน 7 ฟิลด์หลัก"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>ย้ายจาก other เข้าฟิลด์หลัก</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="rounded p-1.5 text-navy hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="คัดลอก JSON"
          >
            <Clipboard className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      }
      className="h-full"
    >
      {showMoveForm && (
        <form
          onSubmit={handleMove}
          className="mb-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/75 space-y-2.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between text-xs font-bold text-navy">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              ย้ายข้อมูลจาก other เข้าสู่ 7 ฟิลด์หลัก
            </span>
            <button
              type="button"
              onClick={() => setShowMoveForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ฟิลด์ต้นทางใน other
              </label>
              <select
                value={sourceKey}
                onChange={(e) => setSourceKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                required
              >
                {otherKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}: {String(json.other?.[k]).slice(0, 25)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                7 ฟิลด์หลักเป้าหมาย
              </label>
              <select
                value={targetKey}
                onChange={(e) => setTargetKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                required
              >
                {CORE_FIELDS_DEF.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={removeFromOther}
                onChange={(e) => setRemoveFromOther(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>ลบออกจาก other หลังจากย้าย</span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <ArrowRight className="h-3 w-3" />
              <span>ยืนยันการย้าย</span>
            </button>
          </div>
        </form>
      )}

      <div className="min-h-[400px] h-[400px] min-w-0 overflow-auto rounded-xl bg-[#0F172A] p-4 font-mono text-xs leading-6 text-slate-100 shadow-inner">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="grid grid-cols-[38px_1fr] gap-2">
            <span className="select-none border-r border-slate-700/60 pr-2.5 text-right text-slate-500">
              {index + 1}
            </span>
            <code>{highlightJsonLine(line)}</code>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-600">
            Schema Version: <b className="text-navy">2.0.0 (7 Core + Other)</b>
          </span>
          <span className="rounded bg-green-50 px-2 py-1 font-bold text-success border border-green-200">
            Valid JSON
          </span>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex max-w-full items-center gap-2 truncate rounded-xl border border-cyan-600 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 shadow-sm"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          ดาวน์โหลด JSON
        </button>
      </div>
    </Card>
  );
}

function highlightJsonLine(line: string) {
  const keyMatch = line.match(/^(\s*)"([^"]+)":\s?(.*)$/);
  if (!keyMatch) {
    return <span className={tokenColors.punctuation}>{line}</span>;
  }

  const [, space, key, value] = keyMatch;
  const valueClass = value.includes('"')
    ? tokenColors.string
    : /\d/.test(value)
    ? tokenColors.number
    : tokenColors.punctuation;
  return (
    <>
      <span>{space}</span>
      <span className={tokenColors.key}>"{key}"</span>
      <span className={tokenColors.punctuation}>: </span>
      <span className={valueClass}>{value}</span>
    </>
  );
}
