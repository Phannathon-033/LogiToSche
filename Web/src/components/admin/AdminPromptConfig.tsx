import {
  AlertCircle,
  BookmarkCheck,
  BrainCircuit,
  CheckCircle2,
  Copy,
  Cpu,
  Edit3,
  Eye,
  FileCode,
  FileText,
  Filter,
  FolderOpen,
  HelpCircle,
  Layers,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CORE_FIELDS_DEF } from "../../types";
import type { AdminDocumentRecord, AdminPromptLabState, SlmPromptPresetResponse } from "../../types";
import {
  getSlmPrompts,
  resetSlmPrompts,
  saveSlmPrompts,
} from "../../services/slmApi";

interface AdminPromptConfigProps {
  value: AdminPromptLabState;
  documents: AdminDocumentRecord[];
  onChange: (nextState: AdminPromptLabState) => void;
  onSave: () => void;
  loading?: boolean;
  saving?: boolean;
}

const DEFAULT_PRESETS_FALLBACK: SlmPromptPresetResponse[] = [
  {
    id: "standard_extraction",
    category: "extraction" as any,
    categoryLabel: "สกัด 11 ฟิลด์หลัก",
    badge: "Core 11 Fields",
    title: "มาตรฐานสกัด 11 ฟิลด์หลักโลจิสติกส์",
    description: "สกัดข้อมูลเอกสารเข้าสู่ JSON Schema 11 ฟิลด์หลักอย่างเคร่งครัด แยก sender, receiver, total_amount, document_number ให้สมบูรณ์",
    prompt: "คุณคือผู้ช่วยดึงข้อมูลโลจิสติกส์จาก OCR text ให้ map ข้อมูลเข้าสู่ JSON schema อย่างเคร่งครัด แยก sender, receiver, total amount และ document number ให้ชัดเจน หากไม่มีข้อมูลให้ใส่ค่าว่างหรือ 0 ห้ามแต่งข้อมูลขึ้นมาเอง",
  },
  {
    id: "bilingual_thai_en",
    category: "extraction" as any,
    categoryLabel: "สกัด 11 ฟิลด์หลัก",
    badge: "Bilingual Thai/EN",
    title: "สกัดเอกสารสองภาษา ไทย-อังกฤษ & แปลง พ.ศ. เป็น ค.ศ.",
    description: "จัดการเอกสารใบกำกับภาษีไทยและใบขนส่งที่มีทั้งภาษาไทยและอังกฤษ พร้อมแปลงปี พ.ศ. เป็น ค.ศ. (YYYY-MM-DD)",
    prompt: "สกัดข้อมูลเอกสารสองภาษาไทย-อังกฤษ แยกชื่อผู้ส่งและผู้รับให้ถูกต้องตามนิติบุคคลหลัก พร้อมตรวจสอบปี พ.ศ. หากพบให้แปลงเป็นปี ค.ศ. (YYYY-MM-DD) ตามมาตรฐาน ISO 8601",
  },
  {
    id: "shipping_bl_ocean",
    category: "extraction" as any,
    categoryLabel: "สกัด 11 ฟิลด์หลัก",
    badge: "Maritime & Air",
    title: "สกัดใบตราส่งสินค้าทางเรือ (B/L) และทางอากาศ (AWB)",
    description: "สกัดข้อมูลเฉพาะทางโลจิสติกส์ เช่น B/L No, Shipper, Consignee, Port of Loading (origin), Port of Discharge (destination)",
    prompt: "สกัดข้อมูลใบตราส่งสินค้าทางเรือ (Ocean Bill of Lading) และทางอากาศ (Air Waybill) โดย map Port of Loading เป็น origin และ Port of Discharge เป็น destination",
  },
  {
    id: "synonym_party",
    category: "synonym",
    categoryLabel: "ตรวจสอบคำความหมายเดียวกัน",
    badge: "คู่ค้า & นิติบุคคล",
    title: "จำแนกชื่อผู้ซื้อ / ผู้ขาย / ผู้รับสินค้า (Buyer, Seller, Consignee)",
    description: "ตรวจสอบและจัดกลุ่มคำที่มีความหมายเดียวกัน เช่น ผู้ส่ง, Vendor, Shipper, ผู้ขาย เข้ากับ sender และ ผู้รับ, Consignee, Buyer เข้ากับ receiver",
    prompt: "วิเคราะห์ข้อความ OCR และจำแนกชื่อนิติบุคคลหรือคู่ค้าที่มีความหมายเดียวกัน เช่น ผู้ส่ง/ผู้ขาย/Vendor/Shipper ให้เป็น sender และผู้ซื้อ/ผู้รับสินค้า/Consignee/Buyer ให้เป็น receiver พร้อมระบุว่าชื่อใดควรเป็น receiver หลัก",
  },
  {
    id: "synonym_doc_no",
    category: "synonym",
    categoryLabel: "ตรวจสอบคำความหมายเดียวกัน",
    badge: "เลขที่อ้างอิง",
    title: "จำแนกเลขที่เอกสาร & เลขที่ใบสั่งซื้อ (Invoice No, PO No, Tax ID)",
    description: "ตรวจสอบคำระบุเลขที่เอกสาร เช่น เลขที่, Tax Inv, Inv No, Reference No, P.O., Purchase Order, AWB No. และจัดคู่ค่าที่ถูกต้องลงในฟิลด์",
    prompt: "ตรวจสอบคำระบุเลขที่เอกสาร เช่น เลขที่, Tax Inv, Inv No, Reference No, P.O., Purchase Order, Tax ID และจัดคู่ค่าที่ถูกต้องลงในฟิลด์ 11 ฟิลด์หลักและ other",
  },
  {
    id: "synonym_vehicle",
    category: "synonym",
    categoryLabel: "ตรวจสอบคำความหมายเดียวกัน",
    badge: "ยานพาหนะขนส่ง",
    title: "ตรวจสอบทะเบียนรถ / ตู้คอนเทนเนอร์ (Truck Plate, Container No)",
    description: "ตรวจสอบคำระบุข้อมูลยานพาหนะ เช่น ทะเบียนรถ, รถบรรทุก, ทะเบียนหัวลาก, Container No, Car Plate, Truck No. และสกัดค่าที่แท้จริง",
    prompt: "ตรวจสอบคำระบุข้อมูลยานพาหนะและการขนส่ง เช่น ทะเบียนรถ, ทะเบียนหัวลาก, หมายเลขตู้คอนเทนเนอร์ (Container No.), ชื่อเรือ (Vessel) หรือทะเบียนรถส่งของ แล้วสรุปค่าที่พบ",
  },
  {
    id: "summarize_short",
    category: "summary",
    categoryLabel: "วิเคราะห์ & สรุปกระชับ",
    badge: "สรุป 1 ประโยค",
    title: "สรุปใจความสำคัญของเอกสารให้สั้นกระชับใน 1-2 ประโยค",
    description: "วิเคราะห์เนื้อหาเอกสารทั้งหมดและย่อความให้เหลือเพียง 1-2 ประโยคสั้นๆ เพื่อให้เจ้าหน้าที่หรือผู้บริหารเข้าใจได้ทันที",
    prompt: "สรุปเนื้อหาหลักของเอกสารนี้ให้เหลือเพียง 1-2 ประโยคสั้นๆ กระชับ ระบุว่าใครส่งอะไรให้ใคร ยอดเงินเท่าไหร่ เพื่อใช้อ่านสรุปและส่งต่อให้ทีมงานอย่างรวดเร็ว",
  },
  {
    id: "summarize_goods",
    category: "summary",
    categoryLabel: "วิเคราะห์ & สรุปกระชับ",
    badge: "รายการสินค้า",
    title: "สรุปรายการสินค้า ปริมาณ และราคารวมแบบกระชับ",
    description: "ดึงเฉพาะรายการสินค้าหลัก, จำนวน (Quantity), หน่วยนับ และราคารวมออกมาสรุปเป็นข้อความสั้นๆ",
    prompt: "สรุปเฉพาะรายการสินค้าหลัก, จำนวน (Quantity), หน่วยนับ และราคารวมในรูปแบบตารางย่อหรือสรุปข้อความ 2-3 บรรทัดที่เข้าใจง่าย",
  },
  {
    id: "summarize_payment_terms",
    category: "summary",
    categoryLabel: "วิเคราะห์ & สรุปกระชับ",
    badge: "เงื่อนไขชำระเงิน",
    title: "สรุปเงื่อนไขการชำระเงินและข้อกำหนดการส่ง (Payment & Incoterms)",
    description: "วิเคราะห์เงื่อนไขเครดิตเทอม วันครบกำหนดชำระ เลขที่บัญชีธนาคาร และเงื่อนไขการส่งสินค้า (Incoterms)",
    prompt: "วิเคราะห์และสรุปเงื่อนไขการชำระเงิน (Credit Term, Due Date, Bank Account) และเงื่อนไขการจัดส่ง (Incoterms เช่น FOB, CIF, Door-to-Door) ให้กระชับเข้าใจง่าย",
  },
  {
    id: "validate_numbers",
    category: "validation",
    categoryLabel: "ตรวจสอบความถูกต้อง",
    badge: "ตรวจสอบตัวเลข",
    title: "ตรวจสอบความสอดคล้องของผลรวมเงิน (Subtotal + VAT = Total)",
    description: "ตรวจสอบตัวเลขว่ายอดก่อนภาษี รวมกับ VAT 7% แล้วเท่ากับ Total Amount สุทธิหรือไม่ และแจ้งเตือนหากมีส่วนต่าง",
    prompt: "ตรวจสอบตัวเลขในเอกสารว่า Subtotal (ยอดก่อนภาษี), VAT (ภาษีมูลค่าเพิ่ม) และ Total Amount (ยอดสุทธิ) คำนวณถูกต้องตามหลักคณิตศาสตร์หรือไม่ และแจ้งหากพบข้อผิดพลาด",
  },
  {
    id: "validate_core_fields",
    category: "validation",
    categoryLabel: "ตรวจสอบความถูกต้อง",
    badge: "ความสมบูรณ์ของฟิลด์",
    title: "ตรวจสอบความครบถ้วนของ 11 ฟิลด์หลัก (Core 11 Fields Quality Check)",
    description: "ตรวจสอบว่าเอกสารนี้มีข้อมูลครบทั้ง 11 ฟิลด์หลักหรือไม่ และแนะนำข้อความใน OCR ที่สามารถนำมาเติมในฟิลด์ที่ขาดได้",
    prompt: "ตรวจสอบว่าเอกสารนี้มีข้อมูลครบทั้ง 11 ฟิลด์หลักหรือไม่ (document_type, document_number, document_date, sender, receiver, origin, destination, reference_number, unit_price, total_amount, currency) หากฟิลด์ไหนขาดหายไป ให้แนะนำข้อความที่น่าจะเป็นไปได้จาก OCR Text",
  },
  {
    id: "translate_format",
    category: "translation",
    categoryLabel: "แปลภาษา & จัดรูปแบบ",
    badge: "แปลภาษาไทย-อังกฤษ",
    title: "แปลชื่อบริษัท รายการสินค้า และปรับรูปแบบวันที่สากล",
    description: "แปลข้อมูลภาษาอังกฤษเป็นภาษาไทยที่ถูกต้องตามศัพท์โลจิสติกส์ พร้อมแปลงวันที่เป็นรูปแบบ ISO 8601",
    prompt: "แปลชื่อบริษัท, ที่อยู่ และรายการสินค้าในเอกสารจากภาษาอังกฤษเป็นภาษาไทยที่ถูกต้องตามศัพท์โลจิสติกส์ พร้อมแปลงวันที่ทุกรูปแบบให้อยู่ในมาตรฐาน ISO 8601 (YYYY-MM-DD)",
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
  // Preset Library State
  const [presets, setPresets] = useState<SlmPromptPresetResponse[]>(DEFAULT_PRESETS_FALLBACK);
  const [loadingPresets, setLoadingPresets] = useState<boolean>(true);
  const [savingPresets, setSavingPresets] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Preset Editor Modal State
  const [editingPreset, setEditingPreset] = useState<SlmPromptPresetResponse | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    id: string;
    title: string;
    category: string;
    categoryLabel: string;
    badge: string;
    description: string;
    prompt: string;
  }>({
    id: "",
    title: "",
    category: "custom",
    categoryLabel: "กำหนดเอง",
    badge: "Custom",
    description: "",
    prompt: "",
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPresetsFromBackend();
  }, []);

  async function loadPresetsFromBackend() {
    setLoadingPresets(true);
    try {
      const data = await getSlmPrompts();
      if (Array.isArray(data) && data.length > 0) {
        setPresets(data);
      }
    } catch (err) {
      console.warn("Could not fetch remote presets, using defaults:", err);
    } finally {
      setLoadingPresets(false);
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [presets, selectedCategory, searchQuery]);

  // Open Edit Modal for a Preset
  function handleOpenEditPreset(preset: SlmPromptPresetResponse) {
    setEditingPreset(preset);
    setIsCreatingNew(false);
    setEditFormData({
      id: preset.id,
      title: preset.title,
      category: preset.category,
      categoryLabel: preset.categoryLabel,
      badge: preset.badge,
      description: preset.description,
      prompt: preset.prompt,
    });
  }

  // Open Create Modal
  function handleOpenCreatePreset() {
    const newId = `custom_prompt_${Date.now().toString().slice(-4)}`;
    setEditingPreset(null);
    setIsCreatingNew(true);
    setEditFormData({
      id: newId,
      title: "แม่แบบพร้อมต์เฉพาะทางใหม่",
      category: "custom",
      categoryLabel: "กำหนดเอง",
      badge: "กำหนดเอง",
      description: "ระบุวัตถุประสงค์และกรณีการใช้งานของพร้อมต์นี้",
      prompt: "คุณคือผู้ช่วย AI ด้านโลจิสติกส์ ให้วิเคราะห์ข้อความ OCR และจำแนกข้อมูลตามเงื่อนไขดังต่อไปนี้...",
    });
  }

  // Save Modal Changes
  async function handleSaveEditForm() {
    if (!editFormData.title.trim() || !editFormData.prompt.trim()) {
      alert("กรุณากรอกชื่อและเนื้อหา Prompt ให้ครบถ้วน");
      return;
    }

    let updatedList: SlmPromptPresetResponse[];
    if (isCreatingNew) {
      const newPreset: SlmPromptPresetResponse = {
        id: editFormData.id.trim(),
        title: editFormData.title.trim(),
        category: editFormData.category as any,
        categoryLabel: editFormData.categoryLabel.trim(),
        badge: editFormData.badge.trim(),
        description: editFormData.description.trim(),
        prompt: editFormData.prompt.trim(),
      };
      updatedList = [...presets, newPreset];
    } else {
      updatedList = presets.map((p) =>
        p.id === editFormData.id
          ? {
              ...p,
              title: editFormData.title.trim(),
              category: editFormData.category as any,
              categoryLabel: editFormData.categoryLabel.trim(),
              badge: editFormData.badge.trim(),
              description: editFormData.description.trim(),
              prompt: editFormData.prompt.trim(),
            }
          : p
      );
    }

    setPresets(updatedList);
    setEditingPreset(null);
    setIsCreatingNew(false);

    // Auto-save to server
    setSavingPresets(true);
    try {
      await saveSlmPrompts(updatedList);
      showToast(`บันทึกแม่แบบ "${editFormData.title}" ลงเซิร์ฟเวอร์เรียบร้อยแล้ว`);
    } catch (err) {
      console.error("Failed to auto-save preset to backend:", err);
      showToast("บันทึกเฉพาะในหน่วยความจำ (เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์)");
    } finally {
      setSavingPresets(false);
    }
  }

  // Delete a Preset
  async function handleDeletePreset(presetId: string) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแม่แบบพร้อมต์ "${presetId}"?`)) return;
    const updatedList = presets.filter((p) => p.id !== presetId);
    setPresets(updatedList);

    setSavingPresets(true);
    try {
      await saveSlmPrompts(updatedList);
      showToast(`ลบแม่แบบ "${presetId}" สำเร็จ`);
    } catch (err) {
      console.error("Failed to delete preset from backend:", err);
      showToast("ลบแม่แบบในเครื่องแล้ว");
    } finally {
      setSavingPresets(false);
    }
  }

  // Reset to Defaults
  async function handleResetDefaults() {
    if (!confirm("คุณต้องการรีเซ็ตแม่แบบพร้อมต์สำเร็จรูปทั้งหมดกลับเป็นค่าเริ่มต้นจากระบบหรือไม่?")) return;
    setSavingPresets(true);
    try {
      const data = await resetSlmPrompts();
      setPresets(data);
      showToast("คืนค่าแม่แบบพร้อมต์ทั้งหมดเป็นค่าเริ่มต้นสำเร็จ");
    } catch (err) {
      console.error("Reset failed:", err);
      setPresets(DEFAULT_PRESETS_FALLBACK);
      showToast("รีเซ็ตเป็นค่าเริ่มต้นสำเร็จ");
    } finally {
      setSavingPresets(false);
    }
  }

  // Save All Presets Button
  async function handleSaveAllPresets() {
    setSavingPresets(true);
    try {
      const res = await saveSlmPrompts(presets);
      showToast(res.message || `บันทึกแม่แบบ Prompt ทั้งหมด ${presets.length} รายการสำเร็จ`);
    } catch (err: any) {
      console.error("Save all presets failed:", err);
      showToast(`บันทึกไม่สำเร็จ: ${err?.message || "เกิดข้อผิดพลาด"}`);
    } finally {
      setSavingPresets(false);
    }
  }

  // Load Preset directly into System Prompt
  function handleApplyPresetAsSystemPrompt(preset: SlmPromptPresetResponse) {
    onChange({
      ...value,
      systemPrompt: preset.prompt,
    });
    showToast(`โหลดข้อความของ "${preset.title}" เข้าสู่คำสั่งหลัก (System Prompt) แล้ว`);
  }

  function updateExtractionRule(index: number, nextValue: string) {
    onChange({
      ...value,
      extractionRules: value.extractionRules.map((rule, ruleIndex) => (ruleIndex === index ? nextValue : rule)),
    });
  }

  function handleAddExtractionRule() {
    onChange({
      ...value,
      extractionRules: [...value.extractionRules, "ระบุกฎการสกัดข้อมูลที่นี่"],
    });
  }

  function handleDeleteExtractionRule(index: number) {
    onChange({
      ...value,
      extractionRules: value.extractionRules.filter((_, ruleIndex) => ruleIndex !== index),
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-indigo-200 bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 text-slate-900 shadow-panel sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
              <Settings className="h-3.5 w-3.5" />
              Prompt Control Center
            </div>
            <h3 className="text-2xl font-black tracking-tight sm:text-3xl">ควบคุม Prompt และคุณภาพการสกัดข้อมูล</h3>
            <p className="mt-2 max-w-xl text-xs font-medium leading-6 text-slate-500">
              จัดการคำสั่งหลัก กฎ semantic และ preset ของ SLM จากพื้นที่เดียว ก่อนส่งไปใช้งานกับ OCR จริง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              พร้อมใช้งาน
            </span>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-400 disabled:opacity-50"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "โมเดลที่ใช้งาน", value: value.selectedModel.replace("qwen-", "Qwen "), hint: "SLM runtime", tone: "blue" },
          { label: "Confidence threshold", value: `${value.confidenceThreshold}%`, hint: "เกณฑ์ส่ง Manual Review", tone: "amber" },
          { label: "Monitored fields", value: `${value.monitoredFields.length}/${CORE_FIELDS_DEF.length}`, hint: "ฟิลด์ที่เฝ้าระวัง", tone: "emerald" },
          { label: "Prompt presets", value: `${presets.length}`, hint: "แม่แบบพร้อมใช้", tone: "purple" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{metric.label}</span>
              <span className={`h-2 w-2 rounded-full ${metric.tone === "blue" ? "bg-blue-500" : metric.tone === "amber" ? "bg-amber-500" : metric.tone === "emerald" ? "bg-emerald-500" : "bg-purple-500"}`} />
            </div>
            <p className="mt-2 truncate text-lg font-black text-slate-900" title={metric.value}>{metric.value}</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">{metric.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-600"><BrainCircuit className="h-4 w-4" /></span>
                  <h3 className="text-sm font-black text-slate-900">System Prompt</h3>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">ใช้งานอยู่</span>
                </div>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">คำสั่งหลักที่ส่งให้ Qwen SLM ทุกครั้ง เพื่อควบคุมรูปแบบและความถูกต้องของผลลัพธ์</p>
              </div>
              <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-500">{value.systemPrompt.length} ตัวอักษร</span>
            </div>
            <textarea
              value={value.systemPrompt}
              onChange={(event) => onChange({ ...value, systemPrompt: event.target.value })}
              rows={8}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              placeholder="ระบุ System Prompt ที่นี่..."
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
              <span>ส่งเป็น System Instruction ก่อน OCR context และ JSON schema</span>
              <span>{value.systemPrompt.trim() ? "มีคำสั่งพร้อมใช้งาน" : "ยังไม่มีคำสั่ง"}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">Extraction Rules</h3>
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">{value.extractionRules.length} rules</span>
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-500">กฎ priority และ mapping สำหรับสกัดข้อมูลจาก OCR</p>
              </div>
              <button type="button" onClick={handleAddExtractionRule} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"><Plus className="h-3.5 w-3.5" />เพิ่มกฎ</button>
            </div>
            <div className="space-y-2.5">
              {value.extractionRules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-7 text-center text-xs font-semibold text-slate-400">ยังไม่มีกฎการสกัด เพิ่มกฎเพื่อกำหนดพฤติกรรมของโมเดล</div>
              ) : value.extractionRules.map((rule, index) => (
                <div key={`extraction-rule-${index}`} className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                  <span className="mt-2.5 w-6 shrink-0 text-center font-mono text-[10px] font-black text-indigo-400">{String(index + 1).padStart(2, "0")}</span>
                  <textarea value={rule} onChange={(event) => updateExtractionRule(index, event.target.value)} rows={2} className="min-w-0 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                  <button type="button" onClick={() => handleDeleteExtractionRule(index)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="ลบกฎนี้"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200/80 bg-white p-5 shadow-panel sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900">Fallback & Semantic Rules</h3>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{value.fallbackRules.length} rules</span>
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-500">ข้อจำกัด anti-hallucination และเงื่อนไขเมื่อหลักฐานไม่เพียงพอ</p>
              </div>
              <button type="button" onClick={handleAddFallbackRule} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100"><Plus className="h-3.5 w-3.5" />เพิ่มกฎ</button>
            </div>
            <div className="space-y-2.5">
              {value.fallbackRules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-7 text-center text-xs font-semibold text-slate-400">ยังไม่มี fallback rule เพิ่มกฎเพื่อกำหนดข้อจำกัดของโมเดล</div>
              ) : value.fallbackRules.map((rule, index) => (
                <div key={`fallback-rule-${index}`} className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50/40 p-2.5">
                  <span className="mt-2.5 w-6 shrink-0 text-center font-mono text-[10px] font-black text-amber-500">{String(index + 1).padStart(2, "0")}</span>
                  <textarea value={rule} onChange={(event) => updateFallbackRule(index, event.target.value)} rows={2} className="min-w-0 flex-1 resize-y rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" />
                  <button type="button" onClick={() => handleDeleteFallbackRule(index)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="ลบกฎนี้"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onSave} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "กำลังบันทึก..." : "บันทึก Prompt Configuration"}
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Settings className="h-4 w-4 text-slate-500" />
              <div><h3 className="text-sm font-black text-slate-900">Runtime Guardrails</h3><p className="mt-1 text-[10px] font-medium text-slate-400">ค่าที่มีผลต่อการตรวจสอบทุก request</p></div>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Cpu className="h-3.5 w-3.5 text-indigo-600" />SLM Model</label>
                <select value={value.selectedModel} onChange={(event) => onChange({ ...value, selectedModel: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-600">
                  <option value="qwen-2.5-1.5b">Qwen2.5-1.5B-Instruct</option>
                  <option value="qwen-2.5-7b">Qwen2.5-7B-Instruct</option>
                  <option value="llama-3.1-8b">Llama-3.1-8B-Instruct</option>
                </select>
                <p className="text-[10px] font-medium text-slate-400">โมเดลที่ใช้ประมวลผลบน SLM runtime</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold"><span className="text-slate-700">Confidence threshold</span><span className="font-mono font-black text-blue-600">{value.confidenceThreshold}%</span></div>
                <input type="range" min="50" max="98" value={value.confidenceThreshold} onChange={(event) => onChange({ ...value, confidenceThreshold: Number(event.target.value) })} className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-blue-600" />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400"><span>50% เข้มงวดน้อย</span><span>98% เข้มงวดมาก</span></div>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold text-slate-700">Monitored fields</p><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{value.monitoredFields.length} เลือกอยู่</span></div>
                <div className="space-y-2">
                  {CORE_FIELDS_DEF.map((field) => {
                    const checked = value.monitoredFields.includes(field.key);
                    return <label key={field.key} className={`flex cursor-pointer select-none items-center gap-2 rounded-xl border p-2.5 text-[11px] font-semibold transition ${checked ? "border-blue-300 bg-blue-50/60 text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}><input type="checkbox" checked={checked} onChange={(event) => { const monitoredFields = event.target.checked ? [...value.monitoredFields, field.key] : value.monitoredFields.filter((item) => item !== field.key); onChange({ ...value, monitoredFields }); }} className="h-3.5 w-3.5 rounded accent-blue-600" /><span>{field.label}</span></label>;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-blue-200/80 bg-blue-50/60 p-5">
            <div className="flex gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div><p className="text-xs font-black text-blue-900">ก่อนบันทึก</p><p className="mt-1 text-[11px] font-medium leading-5 text-blue-800">การเปลี่ยนแปลงจะถูกใช้กับ request ใหม่เท่านั้น และไม่เปลี่ยนผลลัพธ์ที่บันทึกไว้แล้ว</p></div></div>
          </div>
        </aside>
      </section>

      {/* =================================================================== */}
      {/* 1. PREDEFINED PROMPT PRESETS MANAGER (คลังพร้อมต์สำเร็จรูปทั้งหมด)    */}
      {/* =================================================================== */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><BrainCircuit className="h-4 w-4" /></span>
              <h3 className="text-sm font-black text-slate-900">คลัง Prompt สำเร็จรูป</h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">{presets.length} presets</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">จัดการแม่แบบที่ใช้เป็นคำสั่งเฉพาะทางของ SLM แยกจากกฎหลักของระบบ</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreatePreset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              สร้าง preset
            </button>
            <button
              type="button"
              onClick={handleSaveAllPresets}
              disabled={savingPresets}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {savingPresets ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-600" /> : <Save className="h-3.5 w-3.5 text-blue-600" />}
              บันทึกทั้งหมด
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={savingPresets}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              รีเซ็ต
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: "all", label: `ทั้งหมด (${presets.length})` },
                { id: "extraction", label: "สกัด 11 ฟิลด์" },
                { id: "synonym", label: "คำความหมายเดียวกัน" },
                { id: "validation", label: "ตรวจสอบตัวเลข" },
                { id: "summary", label: "วิเคราะห์ & สรุป" },
                { id: "translation", label: "แปลภาษา & วันที่" },
                { id: "custom", label: "กำหนดเอง" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${selectedCategory === cat.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="relative w-full xl:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา preset..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
        {loadingPresets ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" />กำลังโหลด preset...</div>
        ) : filteredPresets.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-400">ไม่พบ preset ที่ตรงกับเงื่อนไข</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPresets.map((preset) => (
              <div key={preset.id} className="group flex min-h-[210px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase text-indigo-700">{preset.badge}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-400">#{preset.id}</span>
                  </div>
                  <h4 className="mt-3 text-xs font-black leading-snug text-slate-900 group-hover:text-indigo-600">{preset.title}</h4>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">{preset.description}</p>
                  <div className="mt-3 line-clamp-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 font-mono text-[10px] leading-relaxed text-slate-600">{preset.prompt}</div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => handleOpenEditPreset(preset)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"><Edit3 className="h-3 w-3" />แก้ไข</button>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleApplyPresetAsSystemPrompt(preset)} className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-50">ใช้เป็น System Prompt</button>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(preset.prompt); showToast(`คัดลอกข้อความของ "${preset.title}" แล้ว`); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="คัดลอกคำสั่ง Prompt"><Copy className="h-3.5 w-3.5" /></button>
                    {preset.category === "custom" && <button type="button" onClick={() => handleDeletePreset(preset.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="ลบแม่แบบนี้"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* PRESET EDITOR MODAL (หน้าต่างสำหรับแก้ไขหรือสร้างแม่แบบ PROMPT)      */}
      {/* =================================================================== */}
      {(editingPreset || isCreatingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isCreatingNew ? "สร้างแม่แบบ Prompt สำเร็จรูปใหม่" : `แก้ไขแม่แบบ Prompt: ${editFormData.title}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isCreatingNew
                      ? "กำหนดคำสั่งและเงื่อนไขสำหรับให้ SLM นำไปใช้อ่านเบื้องหลัง"
                      : `รหัสแม่แบบ: #${editFormData.id} (SLM จะเลือกใช้ตามบริบทเอกสาร)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreatingNew(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ชื่อแม่แบบ (Title)
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none transition shadow-2xs"
                    placeholder="เช่น จำแนกชื่อผู้ซื้อ/ผู้ขาย"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ป้ายกำกับ (Badge)
                  </label>
                  <input
                    type="text"
                    value={editFormData.badge}
                    onChange={(e) => setEditFormData({ ...editFormData, badge: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none transition shadow-2xs"
                    placeholder="เช่น คู่ค้า & นิติบุคคล"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    หมวดหมู่ (Category)
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const labels: Record<string, string> = {
                        extraction: "สกัด 11 ฟิลด์หลัก",
                        synonym: "ตรวจสอบคำความหมายเดียวกัน",
                        validation: "ตรวจสอบความถูกต้อง",
                        summary: "วิเคราะห์ & สรุปกระชับ",
                        translation: "แปลภาษา & จัดรูปแบบ",
                        custom: "กำหนดเอง",
                      };
                      setEditFormData({
                        ...editFormData,
                        category: cat,
                        categoryLabel: labels[cat] || "กำหนดเอง",
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none transition shadow-2xs cursor-pointer"
                  >
                    <option value="extraction">⚙️ สกัด 11 ฟิลด์หลัก (Extraction)</option>
                    <option value="synonym">🏷️ ตรวจสอบคำความหมายเดียวกัน (Synonym)</option>
                    <option value="validation">📊 ตรวจสอบความถูกต้อง & ตัวเลข (Validation)</option>
                    <option value="summary">📝 วิเคราะห์ & สรุปกระชับ (Summary)</option>
                    <option value="translation">🌐 แปลภาษา & จัดรูปแบบ (Translation)</option>
                    <option value="custom">✨ กำหนดเอง (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    รหัสอ้างอิงภายใน (ID)
                  </label>
                  <input
                    type="text"
                    value={editFormData.id}
                    disabled={!isCreatingNew}
                    onChange={(e) => setEditFormData({ ...editFormData, id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-600 focus:outline-none disabled:cursor-not-allowed"
                    placeholder="เช่น custom_prompt_1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  คำอธิบายการทำงาน (Description)
                </label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none transition shadow-2xs"
                  placeholder="อธิบายสั้นๆ ว่าพร้อมต์นี้ใช้กับเอกสารประเภทใดและทำงานอย่างไร"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    คำสั่ง Prompt ที่ SLM อ่านเบื้องหลัง (Prompt Content)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {editFormData.prompt.length} ตัวอักษร
                  </span>
                </div>
                <textarea
                  value={editFormData.prompt}
                  onChange={(e) => setEditFormData({ ...editFormData, prompt: e.target.value })}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-inner"
                  placeholder="ระบุข้อความคำสั่ง Prompt สำหรับ SLM ที่นี่..."
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 คำสั่งนี้จะถูกส่งเข้าโมเดล Qwen2.5-1.5B ร่วมกับ OCR Text เพื่อบังคับให้สกัดค่าฟิลด์อย่างถูกต้อง
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreatingNew(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEditForm}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <Save className="h-3.5 w-3.5" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
