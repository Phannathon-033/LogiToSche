import { Clipboard, ScanText, TerminalSquare } from "lucide-react";
import { Card } from "./Card";

interface OCRResultPanelProps {
  text: string;
  onCopy: () => void;
}

export function OCRResultPanel({ text, onCopy }: OCRResultPanelProps) {
  const isLoading = text === "กำลังส่งไฟล์ไปยัง PaddleOCR Backend...";

  return (
    <Card
      title="OCR Result"
      icon={<ScanText className="h-5 w-5 text-primary" aria-hidden="true" />}
      actions={
        <button
          type="button"
          onClick={onCopy}
          disabled={isLoading}
          className={`rounded p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            isLoading ? "text-slate-400 opacity-50 cursor-not-allowed" : "text-navy hover:bg-blue-50"
          }`}
          aria-label="คัดลอก OCR Text"
        >
          <Clipboard className="h-5 w-5" aria-hidden="true" />
        </button>
      }
      className="h-full"
    >
      {isLoading ? (
        <div className="flex h-[400px] min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-inner">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
            {/* Spinning glowing ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20"></div>
            <div className="absolute inset-0 rounded-full border-[3px] border-emerald-400 border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
            {/* Inner pulsing icon */}
            <TerminalSquare className="h-8 w-8 text-emerald-400 animate-pulse-slow" />
          </div>
          
          <h4 className="mb-2 font-mono text-sm font-bold tracking-wider text-emerald-400">
            CONNECTING TO ENGINE
          </h4>
          
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-emerald-500/80">กำลังส่งไฟล์ไปยัง PaddleOCR Backend</span>
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
          </div>

          {/* Fake scanning background lines */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #34d399 2px, #34d399 4px)' }}></div>
        </div>
      ) : (
        <pre className="min-h-[400px] h-[400px] overflow-auto rounded-xl border border-line bg-slate-900 p-5 font-mono text-xs leading-6 text-emerald-400 shadow-inner whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </Card>
  );
}
