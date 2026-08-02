import { CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import type { OcrLanguage } from "../services/ocrApi";
import { Card } from "./Card";

interface DocumentUploaderProps {
  fileName: string;
  fileSize: string;
  progress: number;
  language: OcrLanguage;
  onLanguageChange: (language: OcrLanguage) => void;
  onFileSelect: (file: File | null) => void;
}

export function DocumentUploader({ fileName, fileSize, progress, language, onLanguageChange, onFileSelect }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileKind = fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG";

  return (
    <Card
      title="อัปโหลดเอกสาร"
      actions={
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
          OCR
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as OcrLanguage)}
            className="rounded-md border border-line bg-white px-2 py-1 text-xs font-extrabold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="เลือกภาษา OCR"
          >
            <option value="th">ไทย + English</option>
            <option value="en">English</option>
          </select>
        </label>
      }
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFileSelect(event.dataTransfer.files.item(0));
        }}
        className={`rounded-lg border border-dashed p-5 text-center transition ${
          dragging ? "border-primary bg-blue-50" : "border-blue-300 bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          id="document-upload"
          onChange={(event) => onFileSelect(event.target.files?.item(0) ?? null)}
        />
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-blue-200 bg-blue-50 text-primary">
          <UploadCloud className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-slate-600">
          ลากไฟล์มาวางที่นี่ หรือ{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-extrabold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            คลิกเพื่อเลือกไฟล์
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-500">รองรับไฟล์: PDF, JPG, PNG (ขนาดไม่เกิน 20MB)</p>

        {fileName ? (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-line bg-slate-50 p-3 text-left">
            <span className={`grid h-9 w-9 place-items-center rounded text-[10px] font-bold text-white ${fileKind === "PDF" ? "bg-red-600" : "bg-primary"}`}>
              {fileKind}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-ink">{fileName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">OCR: {language === "th" ? "ไทย + English" : "English"}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-xs text-slate-600">{fileSize}</span>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="อัปโหลดสำเร็จ" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function SmallFileIcon() {
  return <FileText className="h-4 w-4 text-primary" aria-hidden="true" />;
}
