import { useState } from "react";
import { Save, Settings, BrainCircuit } from "lucide-react";

interface AdminPromptConfigProps {
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  systemPrompt: string;
  setSystemPrompt: (val: string) => void;
  onSave: () => void;
}

export function AdminPromptConfig({
  confidenceThreshold,
  setConfidenceThreshold,
  selectedModel,
  setSelectedModel,
  systemPrompt,
  setSystemPrompt,
  onSave
}: AdminPromptConfigProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Parameter settings card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel space-y-5">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
          <Settings className="h-4 w-4 text-slate-500" /> ตั้งค่าความแม่นยำและโมเดล
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-600">Confidence Threshold (เกณฑ์ความมั่นใจขั้นต่ำ)</span>
            <span className="text-blue-600 font-black">{confidenceThreshold}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="98"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-[10px] text-slate-400">
            คะแนนความน่าจะเป็นฟิลด์ใดที่ต่ำกว่าเกณฑ์จะเข้าคิวรอตรวจสอบในแผง "ตรวจสอบ (Review)" โดยตรง
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-slate-600">โมเดลภาษาขนาดเล็กที่เลือกใช้งาน (SLM)</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-600 focus:outline-none"
          >
            <option value="qwen-2.5-1.5b">Qwen2.5-1.5B-Instruct (Recommended - Low Latency)</option>
            <option value="qwen-2.5-7b">Qwen2.5-7B-Instruct (High Accuracy - Requires GPU vram &gt; 12GB)</option>
            <option value="llama-3.1-8b">Llama-3.1-8B-Instruct (Standard Multilingual)</option>
          </select>
        </div>
        
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow transition"
        >
          <Save className="h-4 w-4" />
          บันทึกการตั้งค่า
        </button>
      </div>

      {/* System Prompt config card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-panel flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <BrainCircuit className="h-4 w-4 text-purple-600" /> พร้อมต์ควบคุม SLM (System Prompt Editor)
          </h3>
          <p className="text-[10px] text-slate-500 mb-2">ปรับแต่งข้อกำหนดเชิงลึกในการแปลง OCR Text เป็น JSON Schema มาตรฐาน:</p>
          
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-[180px] rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-blue-600 focus:outline-none font-mono"
          />
        </div>
        
        <button
          onClick={onSave}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow transition self-start"
        >
          <Save className="h-4 w-4" />
          บันทึก System Prompt
        </button>
      </div>
    </div>
  );
}
