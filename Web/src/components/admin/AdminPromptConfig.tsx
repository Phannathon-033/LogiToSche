import {
  AlertCircle,
  BookmarkCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock,
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
  Play,
  Plus,
  RefreshCw,
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
import { CORE_FIELDS_DEF, EMPTY_JSON_SCHEMA } from "../../types";
import type { AdminDocumentRecord, AdminPromptLabState, SlmPromptPresetResponse } from "../../types";
import {
  executeSlmPrompt,
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

  // Prompt Lab Playground State
  const [selectedSampleId, setSelectedSampleId] = useState<string>("inv1");
  const [customOcrInput, setCustomOcrInput] = useState<string>(SAMPLE_OCR_TEXTS[0].text);
  const [activePlaygroundPresetId, setActivePlaygroundPresetId] = useState<string>("custom");
  const [isTestingPrompt, setIsTestingPrompt] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>("");
  const [testElapsedSec, setTestElapsedSec] = useState<number | null>(null);
  const [copiedResult, setCopiedResult] = useState<boolean>(false);
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

  // Load Preset into Live Playground & Execute
  async function handleTestPresetOnPlayground(preset: SlmPromptPresetResponse) {
    setActivePlaygroundPresetId(preset.id);
    setIsTestingPrompt(true);
    setTestResult("");
    const start = Date.now();
    try {
      showToast(`กำลังส่งแม่แบบ "${preset.title}" ไปรันบน GPU CUDA...`);
      const res = await executeSlmPrompt({
        promptTemplateId: preset.id,
        systemInstruction: value.systemPrompt,
        userInstruction: preset.prompt,
        ocrText: customOcrInput,
        jsonSchema: EMPTY_JSON_SCHEMA,
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      setTestElapsedSec(Number(elapsed));
      setTestResult(res.resultText);
      showToast(`Qwen SLM ประมวลผลแม่แบบ "${preset.badge}" สำเร็จในเวลา ${elapsed}s!`);
      // Scroll to playground
      document.getElementById("live-playground-section")?.scrollIntoView({ behavior: "smooth" });
    } catch (err: any) {
      setTestResult(err instanceof Error ? `เกิดข้อผิดพลาด: ${err.message}` : "การเชื่อมต่อ SLM ล้มเหลว");
    } finally {
      setIsTestingPrompt(false);
    }
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

  function handleSelectSample(sampleId: string) {
    setSelectedSampleId(sampleId);
    const s = SAMPLE_OCR_TEXTS.find((item) => item.id === sampleId);
    if (s) {
      setCustomOcrInput(s.text);
    }
  }

  async function handleExecuteCustomTestPrompt() {
    if (!customOcrInput.trim()) return;
    setIsTestingPrompt(true);
    setTestResult("");
    const start = Date.now();
    try {
      const res = await executeSlmPrompt({
        promptTemplateId: activePlaygroundPresetId || "custom",
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
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-indigo-200 bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. PREDEFINED PROMPT PRESETS MANAGER (คลังพร้อมต์สำเร็จรูปทั้งหมด)    */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white p-5 sm:p-6 shadow-xs space-y-4">
        {/* Header and Global Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                คลังแม่แบบพร้อมต์สำเร็จรูปสำหรับ SLM (Predefined Prompt Presets Library)
              </h3>
              <span className="rounded-full bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 text-[11px] font-black text-indigo-800">
                {presets.length} แม่แบบพร้อมใช้
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              ชุดคำสั่งพร้อมต์ที่ตัว SLM จะเลือกใช้อ่านเบื้องหลังอัตโนมัติตามบริบทของเอกสาร (ผู้ใช้จะไม่เห็น Prompt ในขั้นตอนทั่วไป) แอดมินสามารถดู แก้ไข ปรับแต่งข้อความคำสั่ง หรือเพิ่มแม่แบบเฉพาะทางใหม่ๆ ได้อย่างอิสระ:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreatePreset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>+ สร้างแม่แบบใหม่</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllPresets}
              disabled={savingPresets}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50"
              title="บันทึกการเปลี่ยนแปลงของทุกแม่แบบลงเซิร์ฟเวอร์"
            >
              {savingPresets ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-600" /> : <Save className="h-3.5 w-3.5 text-blue-600" />}
              <span>บันทึกทั้งหมด</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={savingPresets}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50"
              title="คืนค่าแม่แบบทั้งหมดเป็นค่าเริ่มต้นของระบบ"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "all", label: `ทั้งหมด (${presets.length})` },
              { id: "extraction", label: "⚙️ สกัด 11 ฟิลด์" },
              { id: "synonym", label: "🏷️ คำความหมายเดียวกัน" },
              { id: "validation", label: "📊 ตรวจสอบตัวเลข" },
              { id: "summary", label: "📝 วิเคราะห์ & สรุป" },
              { id: "translation", label: "🌐 แปลภาษา & วันที่" },
              { id: "custom", label: "✨ กำหนดเอง" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามชื่อ หรือคำสั่ง..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition shadow-2xs"
            />
          </div>
        </div>

        {/* Grid of Presets */}
        {loadingPresets ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs font-bold gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" />
            <span>กำลังโหลดคลังแม่แบบพร้อมต์...</span>
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-400 text-xs font-bold">
            ไม่พบแม่แบบพร้อมต์ตรงตามหมวดหมู่หรือคำค้นหานี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition"
              >
                <div className="space-y-2">
                  {/* Category & Badge Header */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">
                      {preset.badge}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      #{preset.id}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                    {preset.title}
                  </h4>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Prompt Text Preview Box */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 font-mono text-[11px] text-slate-700 leading-relaxed max-h-20 overflow-hidden line-clamp-3 select-text">
                    {preset.prompt}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPreset(preset)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition shadow-2xs"
                      title="เปิดหน้าต่างแก้ไขคำสั่ง Prompt นี้"
                    >
                      <Edit3 className="h-3 w-3 text-indigo-600" />
                      <span>แก้ไข Prompt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTestPresetOnPlayground(preset)}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                      title="ส่ง Prompt นี้ไปทดสอบสดกับ Qwen SLM บน GPU"
                    >
                      <Play className="h-3 w-3 fill-indigo-600" />
                      <span>ทดสอบสด</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(preset.prompt);
                        showToast(`คัดลอกข้อความของ "${preset.title}" แล้ว`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="คัดลอกคำสั่ง Prompt"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    {preset.category === "custom" && (
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ลบแม่แบบนี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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

      {/* =================================================================== */}
      {/* 2. MAIN SYSTEM PROMPT & MODEL CONFIGURATION                         */}
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

            {/* Extraction Rules Editor */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-indigo-500" />
                    <span>กฎการสกัดข้อมูล (Extraction Rules)</span>
                  </p>
                  <p className="text-[10px] text-slate-400">กฎหลักสำหรับการ map และ normalize ข้อมูลจาก OCR</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddExtractionRule}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>เพิ่มกฎใหม่</span>
                </button>
              </div>

              <div className="space-y-2">
                {value.extractionRules.map((rule, index) => (
                  <div key={`extraction-rule-${index}`} className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 text-right">{index + 1}.</span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(event) => updateExtractionRule(index, event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExtractionRule(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบกฎนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
      <div id="live-playground-section" className="rounded-2xl border border-indigo-200/90 bg-white p-6 shadow-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
              <Play className="h-4 w-4 fill-indigo-600 text-indigo-600" />
              <span>ห้องทดสอบพร้อมต์สดบน GPU (Interactive Live Prompt Playground)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ทดสอบรัน Prompt สำเร็จรูปด้านบนหรือ System Prompt ร่วมกับข้อความ OCR ตัวอย่างได้ทันทีบน GPU CUDA
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
            <Cpu className="h-3.5 w-3.5" />
            CUDA:0 (RTX 3050 Laptop GPU)
          </span>
        </div>

        {/* Sample Selector Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            เลือกข้อความ OCR ตัวอย่าง หรือป้อนข้อความของคุณเอง:
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_OCR_TEXTS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedSampleId === sample.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Playground: OCR Input & SLM Output */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left: OCR Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>ข้อความดิบจาก OCR (Input OCR Text)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {customOcrInput.length} ตัวอักษร
              </span>
            </div>
            <textarea
              value={customOcrInput}
              onChange={(e) => setCustomOcrInput(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-inner"
              placeholder="วางข้อความ OCR ที่ต้องการทดสอบที่นี่..."
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleExecuteCustomTestPrompt}
                disabled={isTestingPrompt || !customOcrInput.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-blue-700 transition disabled:opacity-50"
              >
                {isTestingPrompt ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin text-white" />
                    <span>กำลังรัน Qwen บน GPU...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white text-white" />
                    <span>รันการทดสอบทันที (Run Test on GPU)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: SLM Response Output */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                <span>ผลลัพธ์การวิเคราะห์จาก Qwen SLM (Live Response)</span>
              </span>
              <div className="flex items-center gap-2">
                {testElapsedSec !== null && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    <Clock className="h-3 w-3" />
                    {testElapsedSec}s
                  </span>
                )}
                {testResult && (
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition"
                  >
                    {copiedResult ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedResult ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="h-[275px] w-full overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100 shadow-inner">
              {isTestingPrompt ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-indigo-400">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-sans">กำลังส่งข้อความเข้าโมเดล Qwen2.5 บน CUDA:0...</span>
                </div>
              ) : testResult ? (
                <pre className="whitespace-pre-wrap font-mono text-xs text-emerald-400">
                  {testResult}
                </pre>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-500 text-xs">
                  <Play className="h-6 w-6 opacity-40" />
                  <span>กดปุ่ม "รันการทดสอบทันที" เพื่อดูผลการสกัดจากโมเดล</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
