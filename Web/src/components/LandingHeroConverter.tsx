import {
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Code2,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Layers,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import type { OcrLanguage } from "../services/ocrApi";

interface LandingHeroConverterProps {
  language: OcrLanguage;
  onLanguageChange: (language: OcrLanguage) => void;
  onFilesSelect: (files: File[]) => void;
  onOpenPricing?: () => void;
  onOpenFeatures?: () => void;
  onOpenWorkflow?: () => void;
}

export function LandingHeroConverter({
  language,
  onLanguageChange,
  onFilesSelect,
  onOpenPricing,
  onOpenFeatures,
  onOpenWorkflow,
}: LandingHeroConverterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [batchUploadEnabled, setBatchUploadEnabled] = useState(true);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      onFilesSelect(batchUploadEnabled ? files : files.slice(0, 1));
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesSelect(batchUploadEnabled ? files : files.slice(0, 1));
    }
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-10 py-2 sm:py-6">
      {/* ========================================================================= */}
      {/* 1. TOP HERO: HEADLINE (LEFT) + VISUAL FLOW CARDS (RIGHT)                  */}
      {/* ========================================================================= */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
        {/* Left Headline & Description */}
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Logistics Document{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 bg-clip-text text-transparent">
              Converter
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            แปลงเอกสารโลจิสติกส์ เช่น Invoice, Bill of Lading, Purchase Order และ Packing List
            เป็นข้อมูลมาตรฐานในรูปแบบ JSON Schema ด้วย OCR + AI
          </p>

          {/* Badges */}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-xs">
              <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3]" />
              Supports batch conversion
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Ready
            </span>
          </div>
        </div>

        {/* Right Visual File Converter Graphic (PDF/JPG/PNG -> JSON) */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 lg:justify-end">
          {/* Card 1: Input Formats (PDF / JPG / PNG) */}
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition hover:shadow-md">
            <span className="mb-3 text-xs font-black tracking-wider text-slate-500 uppercase">
              PDF / JPG / PNG
            </span>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* PDF Icon */}
              <div className="flex h-16 w-12 flex-col items-center justify-between rounded-xl border border-red-200 bg-red-50 p-2 shadow-xs transition hover:scale-105">
                <FileText className="h-6 w-6 text-red-600" />
                <span className="rounded bg-red-600 px-1 py-0.2 text-[9px] font-black text-white">
                  PDF
                </span>
              </div>

              {/* JPG Icon */}
              <div className="flex h-16 w-12 flex-col items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-2 shadow-xs transition hover:scale-105">
                <FileText className="h-6 w-6 text-blue-600" />
                <span className="rounded bg-blue-600 px-1 py-0.2 text-[9px] font-black text-white">
                  JPG
                </span>
              </div>

              {/* PNG Icon */}
              <div className="flex h-16 w-12 flex-col items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2 shadow-xs transition hover:scale-105">
                <FileText className="h-6 w-6 text-emerald-600" />
                <span className="rounded bg-emerald-600 px-1 py-0.2 text-[9px] font-black text-white">
                  PNG
                </span>
              </div>
            </div>
          </div>

          {/* Animated Arrow */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner">
            <ArrowRight className="h-5 w-5 text-indigo-600 animate-pulse" />
          </div>

          {/* Card 2: JSON Output */}
          <div className="flex flex-col items-center rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-panel transition hover:shadow-md ring-1 ring-indigo-500/20">
            <span className="mb-3 text-xs font-black tracking-wider text-indigo-600 uppercase">
              JSON
            </span>
            <div className="flex h-16 w-14 flex-col items-center justify-center gap-1 rounded-xl border border-indigo-300 bg-white p-2 shadow-xs transition hover:scale-105">
              <span className="text-base font-black text-indigo-600 font-mono">{"{ }"}</span>
              <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                JSON
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN CENTER CONVERTER DROPZONE CARD                                    */}
      {/* ========================================================================= */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-3xl border-2 transition-all duration-300 p-8 sm:p-12 shadow-panel ${
          dragging
            ? "border-primary bg-blue-50/90 ring-4 ring-primary/20 scale-[1.01]"
            : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-lg"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={batchUploadEnabled}
          accept="image/*,.pdf,.jpg,.jpeg,.png,.tif,.tiff"
          className="sr-only"
          id="hero-file-upload"
          onChange={handleInputChange}
        />

        {/* Cloud Upload Icon in Circular Dashed Ring */}
        <div
          onClick={() => inputRef.current?.click()}
          className="group relative cursor-pointer"
        >
          <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-blue-400 bg-blue-50/80 text-blue-600 shadow-sm transition group-hover:scale-110 group-hover:bg-blue-100">
            <UploadCloud className="h-9 w-9 text-blue-600 transition group-hover:scale-110" />
          </div>
        </div>

        {/* Title and Subtitle */}
        <h2 className="mt-5 text-xl font-black text-slate-900 sm:text-2xl">
          Select your files to convert
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">
          Drag & drop PDF, JPG, PNG, TIFF files here
        </p>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-rose-500/25 transition duration-200 hover:from-rose-600 hover:to-red-600 hover:scale-105 active:scale-95"
        >
          <UploadCloud className="h-5 w-5" />
          <span>Select Files</span>
        </button>

        {/* Bottom Toolbar: OCR Language & Batch Upload Switch */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-slate-100 bg-slate-50/80 px-6 py-3">
          {/* OCR Language Dropdown */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Globe className="h-4 w-4 text-slate-500" />
            <span>OCR Language:</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as OcrLanguage)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="th">TH + EN / EN</option>
              <option value="en">EN Only</option>
            </select>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          {/* Batch Upload Toggle */}
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
            <Layers className="h-4 w-4 text-slate-500" />
            <span>Batch Upload:</span>
            <button
              type="button"
              role="switch"
              aria-checked={batchUploadEnabled}
              onClick={() => setBatchUploadEnabled((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                batchUploadEnabled ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  batchUploadEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs font-extrabold text-slate-800">
              {batchUploadEnabled ? "On" : "Off"}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. BOTTOM 4-STEP WORKFLOW STEPPER                                         */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {/* Step 1: Upload */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">1. Upload</p>
            <p className="text-[11px] font-semibold text-slate-500">อัปโหลดเอกสาร</p>
          </div>
        </div>

        {/* Step 2: OCR */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">2. OCR</p>
            <p className="text-[11px] font-semibold text-slate-500">ดึงข้อความจากเอกสาร</p>
          </div>
        </div>

        {/* Step 3: AI Reasoning */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">3. AI Reasoning</p>
            <p className="text-[11px] font-semibold text-slate-500">วิเคราะห์และจัดโครงสร้างข้อมูล</p>
          </div>
        </div>

        {/* Step 4: JSON Output */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">4. JSON Output</p>
            <p className="text-[11px] font-semibold text-slate-500">ส่งออกเป็น JSON Schema</p>
          </div>
        </div>
      </section>
    </div>
  );
}
