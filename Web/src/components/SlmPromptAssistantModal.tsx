import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Languages,
  Layers,
  ListChecks,
  MessageSquareQuote,
  PencilLine,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { PROMPT_PRESETS } from "../data/promptPresets";
import { executeSlmPrompt } from "../services/slmApi";
import type { JsonSchemaOutput, SlmPromptPreset } from "../types";

interface SlmPromptAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrText: string;
  jsonSchema: JsonSchemaOutput;
  onShowToast: (msg: string) => void;
}

type CategoryType = "synonym" | "summary" | "validation" | "translation" | "custom";

const CATEGORIES: { id: CategoryType; label: string; icon: typeof Sparkles }[] = [
  { id: "synonym", label: "คำความหมายเดียวกัน", icon: Layers },
  { id: "summary", label: "สรุปกระชับเข้าใจง่าย", icon: MessageSquareQuote },
  { id: "validation", label: "ตรวจสอบตัวเลข", icon: ListChecks },
  { id: "translation", label: "แปลภาษา & รูปแบบสากล", icon: Languages },
  { id: "custom", label: "พิมพ์คำสั่งอิสระ", icon: PencilLine },
];

export function SlmPromptAssistantModal({
  isOpen,
  onClose,
  ocrText,
  jsonSchema,
  onShowToast,
}: SlmPromptAssistantModalProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("synonym");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("synonym_party");
  const [customPrompt, setCustomPrompt] = useState<string>(PROMPT_PRESETS[0].prompt);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string>("");
  const [modelInfo, setModelInfo] = useState<string>("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCategoryPresets = PROMPT_PRESETS.filter((p) => p.category === activeCategory);

  function handleSelectPreset(preset: SlmPromptPreset) {
    setSelectedPresetId(preset.id);
    setCustomPrompt(preset.prompt);
  }

  async function handleRunPrompt(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customPrompt.trim()) return;

    setLoading(true);
    setResultText("");
    try {
      const res = await executeSlmPrompt({
        promptTemplateId: selectedPresetId,
        userInstruction: customPrompt,
        ocrText,
        jsonSchema,
      });
      setResultText(res.resultText);
      setModelInfo(res.model || "Qwen2.5-1.5B (CUDA)");
      onShowToast("SLM วิเคราะห์ข้อมูลเสร็จสมบูรณ์");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการประมวลผล";
      onShowToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyResult() {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      onShowToast("คัดลอกผลลัพธ์แล้ว");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast("ไม่สามารถคัดลอกได้");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[90vh] max-h-[850px] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy flex items-center gap-2">
                ระบบคำสั่งอัจฉริยะต่อยอดด้วย SLM (Smart Prompt Assistant)
                <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 border border-cyan-200">
                  Qwen2.5 1.5B
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                วิเคราะห์คำความหมายเดียวกัน สรุปกระชับ ตรวจสอบตัวเลข และสั่งการแบบละเอียด
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (cat.id === "custom") {
                      setSelectedPresetId("custom");
                      setCustomPrompt("วิเคราะห์เอกสารนี้และสรุปข้อมูลสำคัญ...");
                    } else {
                      const firstInCat = PROMPT_PRESETS.find((p) => p.category === cat.id);
                      if (firstInCat) {
                        setSelectedPresetId(firstInCat.id);
                        setCustomPrompt(firstInCat.prompt);
                      }
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-navy"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preset Cards (if not custom) */}
          {activeCategory !== "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentCategoryPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                        {isSelected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Sparkles className="h-3.5 w-3.5 text-slate-400" />}
                        {preset.title}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                <PencilLine className="h-3.5 w-3.5 text-primary" />
                ข้อความคำสั่ง Prompt (สามารถแก้ไขเพิ่มเติมได้อิสระ):
              </label>
              <span className="text-[11px] text-slate-400">
                {customPrompt.length} ตัวอักษร
              </span>
            </div>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="พิมพ์คำสั่งเพิ่มเติมที่ต้องการให้ SLM ช่วยวิเคราะห์..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 leading-relaxed placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
            />
          </div>

          {/* Action Run Button */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || !customPrompt.trim()}
              onClick={() => handleRunPrompt()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>SLM กำลังวิเคราะห์ข้อมูล...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>สั่งให้ SLM ประมวลผลคำสั่งนี้</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Result Output Area */}
          {resultText && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 animate-fadeIn shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-navy">
                    ผลลัพธ์จากการวิเคราะห์ของ SLM
                  </span>
                  {modelInfo && (
                    <span className="rounded bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {modelInfo}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
                </button>
              </div>

              <div className="whitespace-pre-wrap rounded-lg bg-white p-3.5 text-xs text-slate-800 leading-relaxed font-sans border border-slate-100 shadow-inner">
                {resultText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <span>พร้อมใช้งานร่วมกับเอกสาร OCR และ 7 ฟิลด์หลัก</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-4 py-1.5 font-bold text-slate-700 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
