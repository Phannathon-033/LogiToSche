import { Braces, Clipboard, Download } from "lucide-react";
import type { JsonSchemaOutput } from "../types";
import { Card } from "./Card";

interface JSONOutputPanelProps {
  json: JsonSchemaOutput;
  onCopy: () => void;
  onDownload: () => void;
}

const tokenColors = {
  key: "text-sky-300",
  string: "text-amber-300",
  number: "text-orange-300",
  punctuation: "text-slate-400",
};

export function JSONOutputPanel({ json, onCopy, onDownload }: JSONOutputPanelProps) {
  const lines = JSON.stringify(json, null, 2).split("\n");

  return (
    <Card
      title="JSON Schema Output"
      icon={<Braces className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <button type="button" onClick={onCopy} className="rounded p-1.5 text-navy hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="คัดลอก JSON">
          <Clipboard className="h-5 w-5" aria-hidden="true" />
        </button>
      }
      className="h-full"
    >
      <div className="min-h-[400px] h-[400px] min-w-0 overflow-auto rounded-xl bg-[#0F172A] p-4 font-mono text-xs leading-6 text-slate-100 shadow-inner">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="grid grid-cols-[38px_1fr] gap-2">
            <span className="select-none border-r border-slate-700/60 pr-2.5 text-right text-slate-500">{index + 1}</span>
            <code>{highlightJsonLine(line)}</code>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Schema Version: <b className="text-navy">1.0.0</b></span>
          <span className="rounded bg-green-50 px-2 py-1 font-bold text-success">Valid JSON</span>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex max-w-full items-center gap-2 truncate rounded border border-blue-300 px-4 py-2 text-sm font-extrabold text-primary hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
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
  const valueClass = value.includes('"') ? tokenColors.string : /\d/.test(value) ? tokenColors.number : tokenColors.punctuation;
  return (
    <>
      <span>{space}</span>
      <span className={tokenColors.key}>"{key}"</span>
      <span className={tokenColors.punctuation}>: </span>
      <span className={valueClass}>{value}</span>
    </>
  );
}
