import { CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import type { OcrLanguage } from "../services/ocrApi";
import { Card } from "./Card";

interface DocumentUploaderProps {
  fileName?: string;
  fileSize?: string;
  progress?: number;
  batchCount?: number;
  language: OcrLanguage;
  onLanguageChange: (language: OcrLanguage) => void;
  onFileSelect?: (file: File | null) => void;
  onFilesSelect: (files: File[]) => void;
}

export function DocumentUploader({
  fileName,
  fileSize,
  progress = 0,
  batchCount = 0,
  language,
  onLanguageChange,
  onFilesSelect,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileKind = fileName?.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG";

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesSelect(files);
    }
    event.target.value = "";
  }

  return (
    <Card
      title="อัปโหลดเอกสาร (แทรกได้หลายรูปพร้อมกัน)"
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
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragging
            ? "border-primary bg-blue-50/90 ring-4 ring-primary/20 scale-[1.01]"
            : "border-blue-300 bg-white hover:border-primary hover:bg-blue-50/40 dark:bg-slate-800/80"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.jpg,.jpeg,.png,.tif,.tiff"
          className="sr-only"
          id="document-upload"
          onChange={handleInputChange}
        />
        <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-primary shadow-sm dark:border-blue-900/50 dark:bg-blue-950/40">
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-base font-bold text-navy dark:text-slate-200">
          คลิกที่นี่ หรือลากไฟล์รูปภาพ/PDF มาวาง
        </p>
        <p className="mt-1 text-xs font-semibold text-primary">
          (สามารถเลือกได้หลายรูปพร้อมกันเพื่อรันเป็นแบทช์)
        </p>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          รองรับ: JPG, JPEG, PNG, TIFF/TIF, PDF · ระบบจะ OCR ทุกรูปบน GPU แล้วส่งเข้า SLM ต่อเนื่อง
        </p>

        {batchCount > 0 && fileName ? (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-line bg-slate-50 p-3 text-left dark:border-slate-700 dark:bg-slate-800">
            <span className={`grid h-9 w-9 place-items-center rounded text-[10px] font-bold text-white ${fileKind === "PDF" ? "bg-red-600" : "bg-primary"}`}>
              {fileKind}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-extrabold text-ink dark:text-white">{fileName}</p>
                {batchCount > 1 ? (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    +{batchCount - 1} ไฟล์ในแบทช์
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500">OCR: {language === "th" ? "ไทย + English" : "English"}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300">{fileSize}</span>
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
