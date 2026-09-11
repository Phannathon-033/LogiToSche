import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  Filter,
  FolderOpen,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteDocumentFromFirebase,
  fetchFirebaseDocuments,
  saveDocumentToFirebase,
  type FirebaseDocumentRecord,
} from "../services/firebase";

interface FirebaseCloudHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDocument: (record: FirebaseDocumentRecord) => void;
  onShowToast: (message: string) => void;
}

export function FirebaseCloudHistoryModal({
  isOpen,
  onClose,
  onLoadDocument,
  onShowToast,
}: FirebaseCloudHistoryModalProps) {
  const [documents, setDocuments] = useState<FirebaseDocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "cloud" | "local">("all");
  const [selectedRecord, setSelectedRecord] = useState<FirebaseDocumentRecord | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function loadDocuments() {
    setLoading(true);
    try {
      const records = await fetchFirebaseDocuments(50);
      setDocuments(records);
      if (records.length > 0) {
        // Keep currently selected record if it still exists, else select first
        setSelectedRecord((prev) => {
          if (prev) {
            const found = records.find((r) => r.id === prev.id);
            if (found) return found;
          }
          return records[0];
        });
      } else {
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error(error);
      onShowToast("ไม่สามารถโหลดประวัติจาก Firebase ได้");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetrySyncAll() {
    setSyncingAll(true);
    onShowToast("กำลังเริ่มส่งข้อมูลขึ้น Cloud Firebase...");
    try {
      let syncedCount = 0;
      for (const docItem of documents) {
        if (docItem.cloudSyncStatus !== "synced") {
          const res = await saveDocumentToFirebase(docItem);
          if (res.cloudSyncStatus === "synced") syncedCount++;
        }
      }
      await loadDocuments();
      if (syncedCount > 0) {
        onShowToast(`ซิงค์สำเร็จ ${syncedCount} เอกสารขึ้น Firebase เรียบร้อย`);
      } else {
        onShowToast("ยังไม่สามารถเชื่อมต่อ Cloud Firestore ได้ กรุณาตรวจสอบ Rules ใน Firebase Console");
        setShowSetupGuide(true);
      }
    } catch (err) {
      console.error(err);
      onShowToast("เกิดข้อผิดพลาดในการซิงค์");
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleDelete(docId: string, storagePath?: string) {
    if (!window.confirm("ยืนยันการลบเอกสารนี้จากระบบหรือไม่?")) return;
    try {
      await deleteDocumentFromFirebase(docId, storagePath);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedRecord?.id === docId) {
        setSelectedRecord((prev) => {
          const remaining = documents.filter((d) => d.id !== docId);
          return remaining.length > 0 ? remaining[0] : null;
        });
      }
      onShowToast("ลบเอกสารเรียบร้อย");
    } catch (err) {
      console.error(err);
      onShowToast("เกิดข้อผิดพลาดในการลบ");
    }
  }

  function handleDownloadJson(record: FirebaseDocumentRecord) {
    const blob = new Blob([JSON.stringify(record.jsonSchema, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${record.fileName.replace(/\.[^/.]+$/, "")}_schema.json`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast(`ดาวน์โหลด JSON ของ "${record.fileName}" เรียบร้อย`);
  }

  function handleCopyJson(record: FirebaseDocumentRecord) {
    try {
      navigator.clipboard.writeText(JSON.stringify(record.jsonSchema, null, 2));
      setCopiedJson(true);
      onShowToast("คัดลอก JSON Schema ลงคลิปบอร์ดแล้ว");
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      onShowToast("ไม่สามารถคัดลอกได้");
    }
  }

  function handleCopyRules() {
    const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(rules);
    setCopiedRules(true);
    onShowToast("คัดลอก Firestore Rules เรียบร้อย");
    setTimeout(() => setCopiedRules(false), 2000);
  }

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Filter by sync type
      if (filterType === "cloud" && doc.cloudSyncStatus !== "synced") return false;
      if (filterType === "local" && doc.cloudSyncStatus === "synced") return false;

      // Filter by search query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const docNo = String(doc.jsonSchema?.document_number || (doc.jsonSchema as any)?.document_no || "").toLowerCase();
      const party = String(doc.jsonSchema?.sender || doc.jsonSchema?.receiver || (doc.jsonSchema as any)?.party_name || "").toLowerCase();
      const fileName = (doc.fileName || "").toLowerCase();
      const docType = (doc.documentType || "").toLowerCase();

      return fileName.includes(q) || docType.includes(q) || docNo.includes(q) || party.includes(q);
    });
  }, [documents, filterType, searchQuery]);

  const cloudCount = documents.filter((d) => d.cloudSyncStatus === "synced").length;
  const localCount = documents.filter((d) => d.cloudSyncStatus !== "synced").length;

  if (!isOpen) return null;

  // Selected Record Extracted Values
  const extracted = selectedRecord ? getExtractedFieldValues(selectedRecord) : null;
  const formattedDate = selectedRecord ? formatRecordDate(selectedRecord) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 md:p-6 backdrop-blur-md animate-fadeIn">
      {/* Modal Shell Container */}
      <div className="flex h-[92vh] max-h-[880px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* ================================================================= */}
        {/* 1. TOP HEADER (Brand, Title, Controls)                            */}
        {/* ================================================================= */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-5 sm:px-6 py-3.5 dark:border-slate-800 dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  คลังเอกสาร & JSON Cloud / Local History
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10.5px] font-bold text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/50 dark:text-sky-300">
                  <Sparkles className="h-2.5 w-2.5 text-sky-500" />
                  json-schema-f38aa
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                ระบบจัดการและสำรองข้อมูลเอกสาร Logistics ทั้งบน Cloud Firestore และ Local Cache
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle Setup Guide */}
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
                showSetupGuide
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
              title="ดูวิธีตั้งค่าเปิดใช้งาน Firestore Rules"
            >
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">วิธีเปิด Firestore</span>
            </button>

            {/* Sync to Cloud Button */}
            {localCount > 0 && (
              <button
                type="button"
                onClick={handleRetrySyncAll}
                disabled={syncingAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                title="นำส่งเอกสารที่เก็บไว้ในเครื่องขึ้น Cloud Firebase"
              >
                <UploadCloud className={`h-3.5 w-3.5 ${syncingAll ? "animate-bounce" : ""}`} />
                <span>ซิงค์ขึ้น Cloud ({localCount})</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadDocuments}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="ปิดหน้าต่าง (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SETUP GUIDE ACCORDION (Aesthetic & Practical)                     */}
        {/* ================================================================= */}
        {showSetupGuide && (
          <div className="flex-shrink-0 border-b border-blue-100 bg-gradient-to-b from-blue-50/90 to-indigo-50/50 p-4 text-xs text-slate-800 dark:border-blue-900/40 dark:bg-blue-950/60 dark:text-blue-100 animate-fadeIn">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs mt-0.5">
                  <Cloud className="h-4 w-4" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-sm text-blue-950 dark:text-white">
                      วิธีเปิดสิทธิ์บันทึกข้อมูลใน Firebase Console (ใช้เวลาเพียง 15 วินาที):
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyRules}
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200 shadow-xs hover:bg-blue-50"
                    >
                      {copiedRules ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedRules ? "คัดลอก Rules แล้ว!" : "คัดลอก Code Rules"}</span>
                    </button>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                    <li>
                      เปิดลิงก์{" "}
                      <a
                        href="https://console.firebase.google.com/project/json-schema-f38aa/firestore/rules"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 underline hover:text-blue-800 dark:text-blue-400 inline-flex items-center gap-0.5"
                      >
                        Firebase Firestore Rules
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>
                      เปลี่ยนเป็น <code className="rounded bg-white/80 border border-blue-200 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-900">allow read, write: if true;</code> แล้วกด <b>"Publish" (เผยแพร่)</b>
                    </li>
                    <li>
                      เปิดลิงก์{" "}
                      <a
                        href="https://console.firebase.google.com/project/json-schema-f38aa/storage/rules"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 underline hover:text-blue-800 dark:text-blue-400 inline-flex items-center gap-0.5"
                      >
                        Firebase Storage Rules
                        <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      เปลี่ยนเป็น <code className="rounded bg-white/80 border border-blue-200 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-900">allow read, write: if true;</code> แล้วกด <b>"Publish"</b>
                    </li>
                    <li>
                      เสร็จแล้วกลับมากดปุ่ม <b>"ซิงค์ขึ้น Cloud"</b> ข้อมูลจะถูกอัปโหลดขึ้น Firebase อัตโนมัติทันที
                    </li>
                  </ol>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/80 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. MAIN 2-COLUMN BODY (Left List, Right Inspector)                */}
        {/* ================================================================= */}
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
          
          {/* =============================================================== */}
          {/* LEFT COLUMN: Search, Filters & Document List                    */}
          {/* =============================================================== */}
          <div className="flex flex-col min-h-0 h-full overflow-hidden border-r border-slate-200/90 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50">
            
            {/* Search and Filters Header */}
            <div className="flex-shrink-0 border-b border-slate-200/80 bg-white p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-850">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไฟล์, เลขที่บิล, คู่ค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8.5 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs: All, Cloud, Local */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`flex-1 rounded-md py-1 text-center transition ${
                    filterType === "all"
                      ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "hover:text-slate-900"
                  }`}
                >
                  ทั้งหมด ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("cloud")}
                  className={`flex-1 rounded-md py-1 text-center transition ${
                    filterType === "cloud"
                      ? "bg-white text-sky-600 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "hover:text-slate-900"
                  }`}
                >
                  ☁️ Cloud ({cloudCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("local")}
                  className={`flex-1 rounded-md py-1 text-center transition ${
                    filterType === "local"
                      ? "bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "hover:text-slate-900"
                  }`}
                >
                  💾 Local ({localCount})
                </button>
              </div>
            </div>

            {/* Document Cards List (Scrollable) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 overscroll-contain"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
            >
              {loading ? (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">กำลังดึงข้อมูลจาก Cloud Firebase...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-slate-400">
                  <FolderOpen className="h-10 w-10 stroke-[1.4] text-slate-300 mb-1" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">ไม่พบเอกสาร</p>
                  <p className="text-[11px] text-slate-400 max-w-[220px] mt-0.5">
                    {searchQuery
                      ? "ลองค้นหาด้วยคำอื่น หรือรีเซ็ตตัวกรอง"
                      : "เมื่อประมวลผล SLM ระบบจะสำรองข้อมูลและ JSON ให้โดยอัตโนมัติ"}
                  </p>
                </div>
              ) : (
                filteredDocs.map((docItem) => {
                  const isSelected = selectedRecord?.id === docItem.id;
                  const acc = docItem.performance?.accuracy_pct ?? docItem.overallConfidence ?? 90;
                  const isLowConf = acc < 85;
                  const isCloud = docItem.cloudSyncStatus === "synced";
                  const docNo = docItem.jsonSchema?.document_number || (docItem.jsonSchema as any)?.document_no || "-";
                  const party = docItem.jsonSchema?.sender || docItem.jsonSchema?.receiver || (docItem.jsonSchema as any)?.party_name || docItem.documentType;

                  return (
                    <div
                      key={docItem.id}
                      onClick={() => setSelectedRecord(docItem)}
                      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-all select-none ${
                        isSelected
                          ? "border-blue-600 bg-gradient-to-r from-blue-50/90 via-sky-50/40 to-white shadow-sm ring-1 ring-blue-500/30 dark:border-blue-500 dark:from-blue-950/40 dark:to-slate-800"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800"
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      {docItem.storageUrl ? (
                        <img
                          src={docItem.storageUrl}
                          alt={docItem.fileName}
                          className="h-13 w-11 shrink-0 rounded-lg border border-slate-200/80 object-cover bg-slate-100 shadow-2xs dark:border-slate-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-13 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-slate-700 dark:bg-slate-800">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}

                      {/* Content Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-black text-slate-900 dark:text-white" title={docItem.fileName}>
                            {docItem.fileName}
                          </p>
                        </div>

                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {party} · {docItem.fileSize}
                        </p>

                        {/* Badges */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {/* Accuracy Badge */}
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9.5px] font-black tracking-tight ${
                              isLowConf
                                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300"
                            }`}
                          >
                            {isLowConf ? "🔴" : "🟢"} {acc}% Acc
                          </span>

                          {/* Cloud / Local Badge */}
                          {isCloud ? (
                            <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 border border-sky-200 px-1.5 py-0.2 text-[9.5px] font-bold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                              <Cloud className="h-2.5 w-2.5" /> Cloud
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9.5px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Local
                            </span>
                          )}

                          {docNo && docNo !== "-" && (
                            <span className="hidden sm:inline-block rounded bg-slate-50 border border-slate-200 px-1 py-0.2 font-mono text-[9px] text-slate-500 truncate max-w-[90px]">
                              #{docNo}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button on Hover */}
                      <button
                        type="button"
                        title="ลบเอกสารนี้"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(docItem.id, docItem.storagePath);
                        }}
                        className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* =============================================================== */}
          {/* RIGHT COLUMN: Document Detail, Image & JSON Schema Inspector   */}
          {/* =============================================================== */}
          <div
            className="flex flex-col min-h-0 h-full overflow-y-auto p-5 sm:p-6 bg-white dark:bg-slate-900 overscroll-contain"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
          >
            {selectedRecord && extracted ? (
              <div className="space-y-5">
                {/* Detail Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {selectedRecord.fileName}
                      </h4>
                      {selectedRecord.cloudSyncStatus === "synced" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-200 px-2.5 py-0.5 text-[10.5px] font-extrabold text-sky-800">
                          <Cloud className="h-3 w-3 text-sky-600" />
                          Cloud Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700">
                          <CheckCircle2 className="h-3 w-3 text-slate-500" />
                          Saved in Local Backup
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>ID: <code className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{selectedRecord.id}</code></span>
                      <span>•</span>
                      <span>ประเภท: <b className="text-slate-800 dark:text-slate-200 capitalize">{extracted.docType}</b></span>
                      {formattedDate && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formattedDate}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Inspector Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadDocument(selectedRecord);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>โหลดเข้า Workspace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyJson(selectedRecord)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedJson ? "คัดลอกแล้ว!" : "คัดลอก JSON"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadJson(selectedRecord)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>ดาวน์โหลด</span>
                    </button>
                  </div>
                </div>

                {/* Main Content: Document Image Preview + 7 Core Info Cards */}
                <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                  {/* Left: Document Image Viewer */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      รูปภาพเอกสาร
                    </p>
                    {selectedRecord.storageUrl ? (
                      <a
                        href={selectedRecord.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-xs transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800"
                        title="คลิกเพื่อเปิดดูรูปต้นฉบับขนาดใหญ่"
                      >
                        <img
                          src={selectedRecord.storageUrl}
                          alt={selectedRecord.fileName}
                          className="max-h-[260px] w-auto mx-auto object-contain rounded-lg transition group-hover:scale-102"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 transition group-hover:opacity-100 rounded-lg">
                          <span className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-md">
                            <ExternalLink className="h-3 w-3" /> เปิดรูปเต็มจอ
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-slate-400">
                        <FileText className="h-8 w-8 text-slate-300 mb-1" />
                        <span className="text-xs font-semibold">ไม่มีรูปภาพเก็บไว้</span>
                      </div>
                    )}
                  </div>

                  {/* Right: 7 Core Fields Card Grid */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                      ข้อมูล 7 ฟิลด์หลักที่สกัดได้ (Extracted Key-Values)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* Field 1: Document Type */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <Tag className="h-3 w-3 text-blue-500" />
                          <span>Document Type</span>
                        </div>
                        <p className="font-extrabold text-slate-900 dark:text-white capitalize">
                          {extracted.docType}
                        </p>
                      </div>

                      {/* Field 2: Document Number */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <Hash className="h-3 w-3 text-indigo-500" />
                          <span>Document No</span>
                        </div>
                        <p className="font-mono font-extrabold text-slate-900 dark:text-white truncate" title={extracted.docNo}>
                          {extracted.docNo}
                        </p>
                      </div>

                      {/* Field 3: Document Date */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <Calendar className="h-3 w-3 text-sky-500" />
                          <span>Document Date</span>
                        </div>
                        <p className="font-mono font-extrabold text-slate-900 dark:text-white">
                          {extracted.docDate}
                        </p>
                      </div>

                      {/* Field 4: Sender / Vendor */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <Building2 className="h-3 w-3 text-amber-500" />
                          <span>ผู้ส่ง / ผู้ออกบิล</span>
                        </div>
                        <p className="font-extrabold text-slate-900 dark:text-white truncate" title={extracted.sender}>
                          {extracted.sender}
                        </p>
                      </div>

                      {/* Field 5: Receiver / Customer */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <Building2 className="h-3 w-3 text-cyan-500" />
                          <span>ผู้รับ / ลูกค้า</span>
                        </div>
                        <p className="font-extrabold text-slate-900 dark:text-white truncate" title={extracted.receiver}>
                          {extracted.receiver}
                        </p>
                      </div>

                      {/* Field 6: Quantity */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <Layers className="h-3 w-3 text-purple-500" />
                          <span>Quantity</span>
                        </div>
                        <p className="font-extrabold text-slate-900 dark:text-white">
                          {extracted.qty}
                        </p>
                      </div>

                      {/* Field 7: Total Amount (Hero Highlight) */}
                      <div className="col-span-2 sm:col-span-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                            <DollarSign className="h-3 w-3" />
                            <span>ยอดเงินรวมสุทธิ (Total Amount)</span>
                          </div>
                          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                            {extracted.total !== "-" ? `${extracted.currency} ${extracted.total}` : "-"}
                          </p>
                        </div>
                        {extracted.vat && (
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400">VAT</span>
                            <p className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300">
                              {extracted.currency} {extracted.vat}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* JSON Schema Payload Viewer (RFC 8259 Standard)            */}
                {/* ========================================================= */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-blue-600" />
                      <span>JSON Schema Payload (RFC 8259 Standard)</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyJson(selectedRecord)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      {copiedJson ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedJson ? "คัดลอกแล้ว!" : "คัดลอก Code"}</span>
                    </button>
                  </div>

                  <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
                    <pre
                      className="max-h-[260px] min-h-[140px] overflow-auto font-mono text-xs text-sky-300 leading-relaxed selection:bg-blue-800 selection:text-white overscroll-contain"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "#475569 transparent" }}
                    >
                      {JSON.stringify(selectedRecord.jsonSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[350px] flex-col items-center justify-center text-center text-slate-400">
                <Cloud className="mx-auto h-12 w-12 stroke-[1.4] text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">เลือกเอกสารจากรายการด้านซ้าย</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                  เพื่อดูรายละเอียดการสกัดข้อมูล 7 ฟิลด์หลัก, ตัวอย่างรูปภาพ และ JSON Schema Payload
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Robust extraction helper with field fallbacks between document_number/document_no and sender/party_name
 */
function getExtractedFieldValues(record: FirebaseDocumentRecord) {
  const schema = record.jsonSchema || ({} as any);
  const docType = schema.document_type || record.documentType || "-";
  const docNo = schema.document_number || (schema as any).document_no || "-";
  const docDate = schema.document_date || "-";
  const sender = schema.sender || (schema as any).party_name || "-";
  const receiver = schema.receiver || "-";
  const total =
    schema.total_amount !== undefined && schema.total_amount !== null
      ? Number(schema.total_amount).toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";
  const currency = schema.currency && schema.currency !== "-" ? schema.currency : "THB";
  const qty = schema.other?.quantity ?? (schema as any).quantity ?? "-";
  const vat =
    schema.other?.vat_amount !== undefined &&
    schema.other?.vat_amount !== null &&
    schema.other?.vat_amount > 0
      ? Number(schema.other.vat_amount).toLocaleString("th-TH", {
          minimumFractionDigits: 2,
        })
      : null;

  return { docType, docNo, docDate, sender, receiver, total, currency, qty, vat };
}

/**
 * Format timestamp nicely into Thai local representation
 */
function formatRecordDate(record: FirebaseDocumentRecord): string {
  if (!record.createdAt) return "";
  try {
    if (typeof record.createdAt === "object" && "seconds" in record.createdAt) {
      return new Date(record.createdAt.seconds * 1000).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
    const d = new Date(record.createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  } catch {}
  return "";
}
