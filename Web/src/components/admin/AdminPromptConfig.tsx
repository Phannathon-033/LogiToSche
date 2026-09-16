import {
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  FileText,
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CORE_FIELDS_DEF, EMPTY_JSON_SCHEMA } from "../../types";
import type { AdminDocumentRecord, AdminPromptLabState } from "../../types";
import { executeSlmPrompt } from "../../services/slmApi";

interface AdminPromptConfigProps {
  value: AdminPromptLabState;
  documents: AdminDocumentRecord[];
  onChange: (nextState: AdminPromptLabState) => void;
  onSave: () => void;
  loading?: boolean;
  saving?: boolean;
}

const PROMPT_TEMPLATES = [
  {
    id: "standard",
    title: "1. มาตรฐานโลจิสติกส์ (11 ฟิลด์หลัก)",
    badge: "Recommended",
    systemPrompt:
      "คุณคือผู้ช่วย AI ผู้เชี่ยวชาญด้านโลจิสติกส์ ทำหน้าที่สกัดข้อมูลจาก OCR Text เข้าสู่ JSON Schema 11 ฟิลด์หลักอย่างเคร่งครัด แยก sender, receiver, total_amount และ document_number ให้ถูกต้องแม่นยำ หากไม่มีข้อมูลให้ใส่ค่าว่างหรือ 0 ห้ามแต่งข้อมูลขึ้นมาเอง",
    fallbackRules: [
      "ถ้าเจอทั้ง Subtotal และ Total Amount ให้เลือก Total Amount เป็นยอดสุทธิ",
      "Consignee, Ship To, Deliver To ให้ตีความเป็น receiver ตามบริบทเอกสาร",
      "วันที่ต้อง normalize เป็น YYYY-MM-DD ตามมาตรฐาน ISO 8601",
    ],
  },
  {
    id: "thai_english",
    title: "2. เอกสารไทย-อังกฤษ (Bilingual Thai/English)",
    badge: "Bilingual",
    systemPrompt:
      "คุณคือผู้ช่วยสกัดข้อมูลเอกสารใบกำกับภาษีและใบส่งของที่มีทั้งภาษาไทยและภาษาอังกฤษ ให้จับคู่คำไวพจน์ เช่น ผู้ขาย/Vendor/Shipper เข้ากับ sender และ ผู้ซื้อ/Customer/Consignee เข้ากับ receiver พร้อมแปลงวันที่ พ.ศ. เป็น ค.ศ. (YYYY-MM-DD)",
    fallbackRules: [
      "หากวันที่ระบุปี พ.ศ. (เช่น 2569) ให้ลบ 543 เพื่อแปลงเป็น ค.ศ. (2026)",
      "ชื่อบริษัทภาษาไทยและภาษาอังกฤษให้เลือกชื่อหลักที่เป็นนิติบุคคล",
      "ยอดเงินให้ตัดเครื่องหมายบาทหรือสกุลเงินออก เหลือเพียงตัวเลขทศนิยม",
    ],
  },
  {
    id: "strict_math",
    title: "3. ตรวจสอบตัวเลขและภาษีอย่างเข้มงวด (Strict Math & Tax)",
    badge: "Financial",
    systemPrompt:
      "คุณคือผู้ตรวจสอบความถูกต้องของตัวเลขในเอกสารโลจิสติกส์ ให้ตรวจสอบว่า Subtotal + VAT = Total Amount หรือไม่ และสกัด unit_price กับ total_amount เป็นตัวเลขทศนิยมอย่างถูกต้อง",
    fallbackRules: [
      "ยอดรวมสุทธิ (Total Amount) ต้องเป็นยอดสุดท้ายหลังรวมภาษีมูลค่าเพิ่มแล้ว",
      "ถ้ามีรายการส่วนลด (Discount) ให้ตรวจสอบยอดหักลบก่อนคำนวณ",
      "สกุลเงินต้องระบุเป็นรหัสมาตรฐานสากล เช่น THB, USD, EUR",
    ],
  },
  {
    id: "shipping_bl",
    title: "4. ใบตราส่งทางเรือและแอร์เวย์บิล (B/L & Air Waybill)",
    badge: "Maritime",
    systemPrompt:
      "คุณคือผู้เชี่ยวชาญการสกัดข้อมูลใบตราส่งสินค้าทางเรือ (Ocean Bill of Lading) และทางอากาศ (Air Waybill) ให้สกัด B/L Number, Shipper, Consignee, Port of Loading (origin), Port of Discharge (destination) และค่าระวางขนส่ง",
    fallbackRules: [
      "Port of Loading / Airport of Departure ให้ map เป็น origin",
      "Port of Discharge / Airport of Destination ให้ map เป็น destination",
      "Booking Number หรือ Voyage No. ถ้าไม่ใช่ B/L No. ให้เก็บลง reference_number",
    ],
  },
];

const SAMPLE_OCR_TEXTS = [
  {
    id: "inv1",
    label: "ตัวอย่าง 1: ใบแจ้งหนี้สากล (TAX INVOICE)",
    text: `TAX INVOICE / RECEIPT
Invoice No: INV-2026-9999
Date: 15/08/2026
Shipper: Siam Global Freight Co., Ltd.
Address: 88 Bangna-Trad Rd, Bangkok 10260, Thailand
Consignee: Supreme Trading Corporation
Address: 456 Sukhumvit Rd, Bangkok 10110, Thailand
Origin: Bangkok Port, Thailand
Destination: Tokyo Port, Japan
PO Reference: PO-99412-TH
Unit Price: 25,000.00 THB
Total Amount: 125,000.00 THB
Currency: THB`,
  },
  {
    id: "bl2",
    label: "ตัวอย่าง 2: ใบตราส่งทางเรือ (BILL OF LADING)",
    text: `OCEAN BILL OF LADING
B/L No: OOLU260192001
Date of Issue: 2026-07-20
Shipper: EASTERN MARITIME LOGISTICS PTE LTD (SINGAPORE)
Consignee: PACIFIC RIM IMPORT & EXPORT CORP
Port of Loading: SINGAPORE PORT
Port of Discharge: LAEM CHABANG, THAILAND
Booking Ref: BKG-SG-88210
Total Amount: USD 3,450.00
Currency: USD`,
  },
  {
    id: "th3",
    label: "ตัวอย่าง 3: ใบกำกับภาษีไทย (ค่าขนส่งตู้คอนเทนเนอร์)",
    text: `บริษัท สยามทรานสปอร์ต แอนด์ ชิปปิ้ง จำกัด
ใบกำกับภาษี / ใบส่งสินค้า
เลขที่เอกสาร: DO-2569-0452
วันที่: 12/09/2569
ผู้ส่ง / ผู้ขาย: บริษัท สยามทรานสปอร์ต แอนด์ ชิปปิ้ง จำกัด
ผู้รับสินค้า: บริษัท เคมีคอล ซัพพลาย จำกัด (มหาชน)
ต้นทาง: ท่าเรือแหลมฉบัง จ.ชลบุรี
ปลายทาง: นิคมอุตสาหกรรมบางปะอิน จ.พระนครศรีอยุธยา
เลขที่ใบสั่งซื้อ (PO): PO-CHEM-8841
ยอดเงินรวมสุทธิ: 51,360.00 บาท
สกุลเงิน: THB`,
  },
];

export function AdminPromptConfig({
  value,
  documents,
  onChange,
  onSave,
  loading = false,
  saving = false,
}: AdminPromptConfigProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>("inv1");
  const [customOcrInput, setCustomOcrInput] = useState<string>(SAMPLE_OCR_TEXTS[0].text);
  const [isTestingPrompt, setIsTestingPrompt] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>("");
  const [testElapsedSec, setTestElapsedSec] = useState<number | null>(null);
  const [copiedResult, setCopiedResult] = useState<boolean>(false);

  function handleApplyTemplate(tpl: (typeof PROMPT_TEMPLATES)[0]) {
    onChange({
      ...value,
      systemPrompt: tpl.systemPrompt,
      fallbackRules: [...tpl.fallbackRules],
    });
  }

  function updateFallbackRule(index: number, nextValue: string) {
    onChange({
      ...value,
      fallbackRules: value.fallbackRules.map((rule, ruleIndex) => (ruleIndex === index ? nextValue : rule)),
    });
  }

  function handleAddFallbackRule() {
    onChange({
      ...value,
      fallbackRules: [...value.fallbackRules, "ระบุเงื่อนไขเพิ่มเติมที่นี่"],
    });
  }

  function handleDeleteFallbackRule(index: number) {
    onChange({
      ...value,
      fallbackRules: value.fallbackRules.filter((_, ruleIndex) => ruleIndex !== index),
    });
  }

  function handleSelectSample(sampleId: string) {
    setSelectedSampleId(sampleId);
    const s = SAMPLE_OCR_TEXTS.find((item) => item.id === sampleId);
    if (s) {
      setCustomOcrInput(s.text);
    }
  }

  async function handleExecuteTestPrompt() {
    if (!customOcrInput.trim()) return;
    setIsTestingPrompt(true);
    setTestResult("");
    const start = Date.now();
    try {
      const res = await executeSlmPrompt({
        promptTemplateId: "custom",
        systemInstruction: value.systemPrompt,
        userInstruction: "Extract 11 core logistics fields and explain mapping logic.",
        ocrText: customOcrInput,
        jsonSchema: EMPTY_JSON_SCHEMA,
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      setTestElapsedSec(Number(elapsed));
      setTestResult(res.resultText);
    } catch (err) {
      setTestResult(err instanceof Error ? `เกิดข้อผิดพลาด: ${err.message}` : "การเชื่อมต่อ SLM ล้มเหลว");
    } finally {
      setIsTestingPrompt(false);
    }
  }

  async function handleCopyResult() {
    if (!testResult) return;
    await navigator.clipboard.writeText(testResult);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. QUICK TEMPLATES TOOLBAR                                          */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                แม่แบบพร้อมต์สำเร็จรูป (Prompt Templates)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกโหลดแม่แบบพร้อมต์ที่ผ่านการปรับแต่งแล้วเพื่อนำไปใช้งานหรือดัดแปลงต่อได้ทันที:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3.5">
          {PROMPT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition">
                  {tpl.title}
                </span>
                <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-indigo-700">
                  {tpl.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {tpl.systemPrompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. MAIN CONFIGURATION 2-COLUMN GRID                                 */}
      {/* =================================================================== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT COLUMN: System Prompt Editor */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                <BrainCircuit className="h-4 w-4 text-indigo-600" />
                <span>คำสั่งหลักของระบบ (System Prompt Editor)</span>
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                Active System Instruction
              </span>
            </div>

            <p className="text-xs text-slate-500">
              ข้อความนี้จะถูกส่งเป็น <code>System Instruction</code> ให้ Qwen SLM ในทุก Request เพื่อควบคุมทิศทางการคิดและการสกัดข้อมูล:
            </p>

            <textarea
              value={value.systemPrompt}
              onChange={(event) => onChange({ ...value, systemPrompt: event.target.value })}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-inner"
              placeholder="ระบุ System Prompt ที่นี่..."
            />

            {/* Fallback Rules Editor */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>กฎเงื่อนไขเพิ่มเติม (Fallback & Semantic Rules)</span>
                  </p>
                  <p className="text-[10px] text-slate-400">กฎเหล่านี้จะถูกผนวกเข้ากับ System Prompt อัตโนมัติ</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFallbackRule}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>เพิ่มกฎใหม่</span>
                </button>
              </div>

              <div className="space-y-2">
                {value.fallbackRules.map((rule, index) => (
                  <div key={`rule-${index}`} className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 text-right">{index + 1}.</span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(event) => updateFallbackRule(index, event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteFallbackRule(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบกฎนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={onSave}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า Prompt"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Model Parameters & Monitored Fields */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <h3 className="flex items-center gap-1.5 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wider text-slate-900">
              <Settings className="h-4 w-4 text-slate-500" />
              <span>พารามิเตอร์โมเดลและการเฝ้าระวัง (Model & Quality Thresholds)</span>
            </h3>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                <span>โมเดลภาษาขนาดเล็กที่เลือกใช้งาน (SLM Model)</span>
              </label>
              <select
                value={value.selectedModel}
                onChange={(event) => onChange({ ...value, selectedModel: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none cursor-pointer"
              >
                <option value="qwen-2.5-1.5b">Qwen2.5-1.5B-Instruct (Recommended - Preloaded on CUDA GPU)</option>
                <option value="qwen-2.5-7b">Qwen2.5-7B-Instruct (High Accuracy - Requires GPU VRAM &gt; 12GB)</option>
                <option value="llama-3.1-8b">Llama-3.1-8B-Instruct (Standard Multilingual)</option>
              </select>
            </div>

            {/* Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">Confidence Threshold (เกณฑ์ความมั่นใจขั้นต่ำ)</span>
                <span className="font-mono font-black text-blue-600">{value.confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={value.confidenceThreshold}
                onChange={(event) => onChange({ ...value, confidenceThreshold: Number(event.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-blue-600"
              />
              <p className="text-[11px] text-slate-400">
                ฟิลด์ที่มีความมั่นใจต่ำกว่า {value.confidenceThreshold}% จะถูกส่งเข้าคิว Manual Review อัตโนมัติ
              </p>
            </div>

            {/* Monitored Fields */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">ฟิลด์ที่กำหนดให้เฝ้าระวังเป็นพิเศษ (Monitored Fields)</p>
                <span className="text-[10px] text-slate-400">{value.monitoredFields.length} ฟิลด์เลือกอยู่</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CORE_FIELDS_DEF.map((field) => {
                  const checked = value.monitoredFields.includes(field.key);
                  return (
                    <label
                      key={field.key}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-[11px] font-semibold transition cursor-pointer select-none ${
                        checked
                          ? "border-blue-300 bg-blue-50/50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const monitoredFields = event.target.checked
                            ? [...value.monitoredFields, field.key]
                            : value.monitoredFields.filter((item) => item !== field.key);
                          onChange({ ...value, monitoredFields });
                        }}
                        className="h-3.5 w-3.5 accent-blue-600 rounded"
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. INTERACTIVE LIVE PROMPT PLAYGROUND (TEST STUDIO)                 */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-indigo-200/90 bg-white p-6 shadow-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
              <Play className="h-4 w-4 fill-indigo-600 text-indigo-600" />
              <span>ห้องทดสอบพร้อมต์สด (Interactive Live Prompt Playground)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ทดสอบรัน System Prompt ที่ปรับแต่งด้านบนกับข้อความ OCR ตัวอย่างได้ทันทีบน GPU CUDA
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
            <Cpu className="h-3.5 w-3.5" />
            CUDA:0 (RTX 3050 Laptop GPU)
          </span>
        </div>

        {/* Sample Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">เลือกตัวอย่างข้อความ:</span>
          {SAMPLE_OCR_TEXTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedSampleId === sample.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {/* OCR Input Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>ข้อความดิบ OCR (Input OCR Text)</span>
              </label>
              <span className="text-[10px] text-slate-400">{customOcrInput.length} ตัวอักษร</span>
            </div>
            <textarea
              value={customOcrInput}
              onChange={(e) => setCustomOcrInput(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 font-mono text-xs text-slate-800 leading-relaxed focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-inner"
              placeholder="วางข้อความ OCR หรือพิมพ์ข้อความทดสอบ..."
            />
            <button
              type="button"
              onClick={handleExecuteTestPrompt}
              disabled={isTestingPrompt}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-blue-700 transition disabled:opacity-50"
            >
              {isTestingPrompt ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>กำลังรัน Qwen SLM บน GPU...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>🚀 ทดสอบรันด้วย System Prompt นี้ (Execute Prompt)</span>
                </>
              )}
            </button>
          </div>

          {/* Test Result Display */}
          <div className="space-y-1.5 flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>ผลลัพธ์จากโมเดลภาษา (SLM Inference Output)</span>
              </label>
              {testElapsedSec !== null && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <Clock className="h-3 w-3" />
                  {testElapsedSec}s
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[190px] rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-800 overflow-y-auto max-h-[220px]">
              {isTestingPrompt ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold">โมเดลกำลังอ่านบริบทและคำสั่ง Prompt...</span>
                </div>
              ) : testResult ? (
                <div className="whitespace-pre-wrap">{testResult}</div>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-xs text-center font-bold">
                  กดปุ่ม &quot;ทดสอบรันด้วย System Prompt นี้&quot; เพื่อดูการตอบสนองของโมเดลสดๆ
                </div>
              )}
            </div>

            {testResult && !isTestingPrompt && (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                >
                  {copiedResult ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedResult ? "คัดลอกแล้ว!" : "คัดลอกผลลัพธ์"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
