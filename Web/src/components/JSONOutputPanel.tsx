import { Braces, Clipboard, Download, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { JsonSchemaOutput } from "../types";
import { Card } from "./Card";

interface JSONOutputPanelProps {
  json: JsonSchemaOutput;
  onCopy: () => void;
  onDownload: () => void;
  onAddFieldToOther?: (key: string, value: string) => void;
}

const tokenColors = {
  key: "text-sky-300",
  string: "text-amber-300",
  number: "text-orange-300",
  punctuation: "text-slate-400",
};

export function JSONOutputPanel({ json, onCopy, onDownload, onAddFieldToOther }: JSONOutputPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const lines = JSON.stringify(json, null, 2).split("\n");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    if (onAddFieldToOther) {
      onAddFieldToOther(newKey.trim(), newValue.trim());
    }
    setNewKey("");
    setNewValue("");
    setShowAddForm(false);
  }

  return (
    <Card
      title="JSON Schema Output (7 ฟิลด์หลัก + Other)"
      icon={<Braces className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-1.5">
          {onAddFieldToOther && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700 hover:bg-cyan-100 transition-colors"
              title="เพิ่มฟิลด์ลงใน json_schema.other"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ เพิ่มใน other</span>
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
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="mb-3 p-3 rounded-xl border border-cyan-200 bg-cyan-50/70 space-y-2 animate-fadeIn"
        >
          <div className="flex items-center justify-between text-xs font-bold text-cyan-900">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
              เพิ่มฟิลด์ใหม่ลงใน json_schema.other
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="ชื่อฟิลด์ (เช่น carrier, notes)"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="ค่าของฟิลด์ (เช่น Kerry, จัดส่งด่วน)"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white transition-colors"
            >
              บันทึก
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
