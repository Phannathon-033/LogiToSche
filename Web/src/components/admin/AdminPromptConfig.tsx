import { BrainCircuit, Save, Settings } from "lucide-react";
import type { AdminDocumentRecord, AdminPromptLabState } from "../../types";

interface AdminPromptConfigProps {
  value: AdminPromptLabState;
  documents: AdminDocumentRecord[];
  onChange: (nextState: AdminPromptLabState) => void;
  onSave: () => void;
}

export function AdminPromptConfig({ value, documents, onChange, onSave }: AdminPromptConfigProps) {
  const promptSignals = documents
    .filter((document) => document.status !== "success")
    .flatMap((document) =>
      document.promptSignals.map((signal) => ({
        ...signal,
        fileName: document.fileName,
      })),
    );

  function updateFallbackRule(index: number, nextValue: string) {
    onChange({
      ...value,
      fallbackRules: value.fallbackRules.map((rule, ruleIndex) => (ruleIndex === index ? nextValue : rule)),
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel space-y-5">
          <h3 className="flex items-center gap-1.5 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wider text-slate-900">
            <Settings className="h-4 w-4 text-slate-500" /> ตั้งค่าความแม่นยำและโมเดล
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Confidence Threshold (เกณฑ์ความมั่นใจขั้นต่ำ)</span>
              <span className="font-black text-blue-600">{value.confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="98"
              value={value.confidenceThreshold}
              onChange={(event) => onChange({ ...value, confidenceThreshold: Number(event.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-blue-600"
            />
            <p className="text-[10px] text-slate-400">
              ค่า threshold นี้จะถูกใช้คัดเคสเข้าคิวตรวจและจัดลำดับความสำคัญเมื่อเชื่อม API จริง
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-600">โมเดลภาษาขนาดเล็กที่เลือกใช้งาน (SLM)</label>
            <select
              value={value.selectedModel}
              onChange={(event) => onChange({ ...value, selectedModel: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-600 focus:outline-none"
            >
              <option value="qwen-2.5-1.5b">Qwen2.5-1.5B-Instruct (Recommended - Low Latency)</option>
              <option value="qwen-2.5-7b">Qwen2.5-7B-Instruct (High Accuracy - Requires GPU vram &gt; 12GB)</option>
              <option value="llama-3.1-8b">Llama-3.1-8B-Instruct (Standard Multilingual)</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-slate-600">Fallback Rules</p>
            {value.fallbackRules.map((rule, index) => (
              <textarea
                key={`rule-${index}`}
                value={rule}
                onChange={(event) => updateFallbackRule(index, event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-blue-600 focus:outline-none"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-500"
          >
            <Save className="h-4 w-4" />
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel flex flex-col justify-between">
        <div>
          <h3 className="mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wider text-slate-900">
            <BrainCircuit className="h-4 w-4 text-purple-600" /> พร้อมต์ควบคุม SLM (System Prompt Editor)
          </h3>
          <p className="mb-2 text-[10px] text-slate-500">ปรับแต่งข้อกำหนดเชิงลึกและดู prompt signal จากเอกสารที่ระบบพลาด:</p>

          <textarea
            value={value.systemPrompt}
            onChange={(event) => onChange({ ...value, systemPrompt: event.target.value })}
            className="h-[180px] w-full rounded-xl border border-slate-200 p-3 font-mono text-xs leading-relaxed focus:border-blue-600 focus:outline-none"
          />

          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Prompt signals จาก mock data</p>
            {promptSignals.map((signal) => (
              <div key={`${signal.fileName}-${signal.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-900">{signal.title}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">{signal.fileName}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      signal.severity === "high"
                        ? "bg-red-50 text-red-700"
                        : signal.severity === "medium"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {signal.severity}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500">{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="mt-4 inline-flex items-center gap-1.5 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-500"
        >
          <Save className="h-4 w-4" />
          บันทึก System Prompt
        </button>
      </div>
    </div>
  );
}
