import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Languages,
  Layers,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { PROMPT_PRESETS } from "../data/promptPresets";
import { executeSlmPrompt } from "../services/slmApi";
import type { JsonSchemaOutput } from "../types";
import { Card } from "./Card";

interface SlmPromptAssistantPanelProps {
  ocrText: string;
  jsonSchema: JsonSchemaOutput;
  onOpenFullAssistant: () => void;
  onShowToast: (msg: string) => void;
}

export function SlmPromptAssistantPanel({
  ocrText,
  jsonSchema,
  onOpenFullAssistant,
  onShowToast,
}: SlmPromptAssistantPanelProps) {
  const [activePromptId, setActivePromptId] = useState<string>("synonym_party");
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const quickPresets = [
    { id: "synonym_party", label: "🔍 วิเคราะห์คำความหมายเดียวกัน (คู่ค้า)", icon: Layers },
    { id: "summarize_short", label: "📝 สรุปย่อ 1-2 ประโยค", icon: MessageSquareQuote },
    { id: "validate_numbers", label: "🔢 ตรวจสอบผลรวมเงิน (Subtotal+VAT)", icon: ListChecks },
    { id: "translate_format", label: "🌐 แปลและจัดฟอร์แมตสากล", icon: Languages },
  ];

  async function handleQuickRun(presetId: string) {
    setActivePromptId(presetId);
    const preset = PROMPT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setLoading(true);
    setResultText("");
    try {
      const res = await executeSlmPrompt({
        promptTemplateId: presetId,
        userInstruction: preset.prompt,
        ocrText,
        jsonSchema,
      });
      setResultText(res.resultText);
      onShowToast("SLM วิเคราะห์ข้อมูลเสร็จสิ้น");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      onShowToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
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
    <Card
      title="SLM Prompt Assistant (คำสั่งสำเร็จรูป & วิเคราะห์ต่อยอด)"
      icon={<Bot className="h-5 w-5 text-primary" />}
      actions={
        <button
          type="button"
          onClick={onOpenFullAssistant}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>เปิดระบบ Prompt เต็มรูปแบบ</span>
        </button>
      }
      className="h-full"
    >
      <div className="space-y-3.5">
        <p className="text-xs text-slate-600">
          เลือกคำสั่ง Prompt สำเร็จรูปด้านล่างเพื่อให้ AI SLM วิเคราะห์คำที่มีความหมายเดียวกัน สรุปย่อข้อความให้สั้นกระชับ หรือตรวจสอบความถูกต้อง:
        </p>

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-2">
          {quickPresets.map((qp) => {
            const Icon = qp.icon;
            const isSelected = activePromptId === qp.id;
            return (
              <button
                key={qp.id}
                type="button"
                disabled={loading}
                onClick={() => handleQuickRun(qp.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                } disabled:opacity-50`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs font-bold text-primary animate-pulse">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Qwen SLM กำลังวิเคราะห์เอกสาร...</span>
          </div>
        )}

        {/* Result Box */}
        {resultText && !loading && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                ผลการวิเคราะห์จาก SLM
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
              </button>
            </div>
            <div className="whitespace-pre-wrap rounded-lg bg-white p-3.5 text-xs text-slate-800 leading-relaxed font-sans border border-slate-100 shadow-inner">
              {resultText}
            </div>
          </div>
        )}

        {!resultText && !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
            <Bot className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-xs font-bold text-slate-600">กดปุ่มคำสั่งลัดด้านบน หรือเปิดระบบ Prompt เต็มรูปแบบ</span>
            <span className="text-[11px] text-slate-400 mt-0.5">SLM พร้อมประมวลผลต่อยอดทันทีด้วยโมเดล Qwen2.5-1.5B</span>
            <button
              type="button"
              onClick={onOpenFullAssistant}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
            >
              <span>เปิดระบบคำสั่งเต็มรูปแบบ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
