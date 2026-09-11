import {
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
      if (filterType === "cloud" && doc.cloudSyncStatus !== "synced") return false;
      if (filterType === "local" && doc.cloudSyncStatus === "synced") return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const docNo = String(
        doc.jsonSchema?.document_number || (doc.jsonSchema as any)?.document_no || ""
      ).toLowerCase();
      const party = String(
        doc.jsonSchema?.sender ||
          doc.jsonSchema?.receiver ||
          (doc.jsonSchema as any)?.party_name ||
          ""
      ).toLowerCase();
      const fileName = (doc.fileName || "").toLowerCase();
      const docType = (doc.documentType || "").toLowerCase();

      return fileName.includes(q) || docType.includes(q) || docNo.includes(q) || party.includes(q);
    });
  }, [documents, filterType, searchQuery]);

  const cloudCount = documents.filter((d) => d.cloudSyncStatus === "synced").length;
  const localCount = documents.filter((d) => d.cloudSyncStatus !== "synced").length;

  if (!isOpen) return null;

  const extracted = selectedRecord ? getExtractedFieldValues(selectedRecord) : null;
  const formattedDate = selectedRecord ? formatRecordDate(selectedRecord) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-fadeIn">
      {/* Modal Shell Container: Pure Clean White Theme */}
      <div className="flex h-[92vh] max-h-[880px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* ================================================================= */}
        {/* 1. TOP HEADER (White, Crisp, Professional)                        */}
        {/* ================================================================= */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  คลังเอกสาร & JSON Cloud / Local History
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  json-schema-f38aa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ประวัติเอกสาร Logistics และโครงสร้าง JSON Schema ที่บันทึกไว้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Setup Guide */}
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                showSetupGuide
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="ดูวิธีตั้งค่าเปิดใช้งาน Firestore Rules"
            >
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">วิธีเปิด Firestore</span>
            </button>

            {/* Sync to Cloud Button */}
            {localCount > 0 && (
              <button
                type="button"
                onClick={handleRetrySyncAll}
                disabled={syncingAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                title="นำส่งเอกสารที่เก็บไว้ในเครื่องขึ้น Cloud Firebase"
              >
                <UploadCloud className={`h-4 w-4 ${syncingAll ? "animate-bounce" : ""}`} />
                <span>ซิงค์ขึ้น Cloud ({localCount})</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadDocuments}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`}
              />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="ปิดหน้าต่าง (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SETUP GUIDE ACCORDION (Clean Light Theme)                         */}
        {/* ================================================================= */}
        {showSetupGuide && (
          <div className="flex-shrink-0 border-b border-blue-100 bg-blue-50/70 p-4 text-xs text-slate-800 animate-fadeIn">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs mt-0.5">
                  <Cloud className="h-4 w-4" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-sm text-slate-900">
                      วิธีเปิดสิทธิ์บันทึกข้อมูลใน Firebase Console (ใช้เวลาเพียง 15 วินาที):
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyRules}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 shadow-2xs hover:bg-blue-50"
                    >
                      {copiedRules ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedRules ? "คัดลอก Rules แล้ว!" : "คัดลอก Code Rules"}</span>
                    </button>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700 font-medium">
                    <li>
                      เปิดลิงก์{" "}
                      <a
                        href="https://console.firebase.google.com/project/json-schema-f38aa/firestore/rules"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5"
                      >
                        Firebase Firestore Rules
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>
                      เปลี่ยนเป็น{" "}
                      <code className="rounded bg-white border border-blue-200 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-900">
                        allow read, write: if true;
                      </code>{" "}
                      แล้วกด <b>"Publish" (เผยแพร่)</b>
                    </li>
                    <li>
                      เปิดลิงก์{" "}
                      <a
                        href="https://console.firebase.google.com/project/json-schema-f38aa/storage/rules"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5"
                      >
                        Firebase Storage Rules
                        <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      เปลี่ยนเป็น{" "}
                      <code className="rounded bg-white border border-blue-200 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-900">
                        allow read, write: if true;
                      </code>{" "}
                      แล้วกด <b>"Publish"</b>
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
                className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. MAIN 2-COLUMN BODY (Left List, Right Inspector)                */}
        {/* ================================================================= */}
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden bg-white">
          {/* =============================================================== */}
          {/* LEFT COLUMN: Search, Filters & Document List                    */}
          {/* =============================================================== */}
          <div className="flex flex-col min-h-0 h-full overflow-hidden border-r border-slate-200 bg-slate-50/50">
            {/* Search and Filters Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white p-3.5 space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไฟล์, เลขที่บิล, คู่ค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
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
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`flex-1 rounded-lg py-1.5 text-center transition ${
                    filterType === "all"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "hover:text-slate-900"
                  }`}
                >
                  ทั้งหมด ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("cloud")}
                  className={`flex-1 rounded-lg py-1.5 text-center transition ${
                    filterType === "cloud"
                      ? "bg-white text-sky-600 shadow-xs"
                      : "hover:text-slate-900"
                  }`}
                >
                  ☁️ Cloud ({cloudCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("local")}
                  className={`flex-1 rounded-lg py-1.5 text-center transition ${
                    filterType === "local"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "hover:text-slate-900"
                  }`}
                >
                  💾 Local ({localCount})
                </button>
              </div>
            </div>

            {/* Document Cards List (Scrollable) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 overscroll-contain"
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
                  <p className="text-xs font-bold text-slate-700">ไม่พบเอกสาร</p>
                  <p className="text-[11px] text-slate-500 max-w-[220px] mt-0.5">
                    {searchQuery
                      ? "ลองค้นหาด้วยคำอื่น หรือสลับตัวกรอง"
                      : "กดบันทึก Firebase เพื่อจัดเก็บเอกสารเข้าคลัง"}
                  </p>
                </div>
              ) : (
                filteredDocs.map((docItem) => {
                  const isSelected = selectedRecord?.id === docItem.id;
                  const acc = docItem.performance?.accuracy_pct ?? docItem.overallConfidence ?? 90;
                  const isLowConf = acc < 85;
                  const isCloud = docItem.cloudSyncStatus === "synced";
                  const docNo =
                    docItem.jsonSchema?.document_number ||
                    (docItem.jsonSchema as any)?.document_no ||
                    "-";
                  const party =
                    docItem.jsonSchema?.sender ||
                    docItem.jsonSchema?.receiver ||
                    (docItem.jsonSchema as any)?.party_name ||
                    docItem.documentType;

                  return (
                    <div
                      key={docItem.id}
                      onClick={() => setSelectedRecord(docItem)}
                      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all select-none ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/30"
                          : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-slate-50/60 hover:shadow-2xs"
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      {docItem.storageUrl ? (
                        <img
                          src={docItem.storageUrl}
                          alt={docItem.fileName}
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-50 shadow-2xs"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}

                      {/* Content Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className="truncate text-xs font-bold text-slate-900"
                            title={docItem.fileName}
                          >
                            {docItem.fileName}
                          </p>
                        </div>

                        <p className="mt-0.5 truncate text-[11.5px] text-slate-500 font-normal">
                          {party} • {docItem.fileSize}
                        </p>

                        {/* Badges */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {/* Accuracy Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold border ${
                              isLowConf
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isLowConf ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            <span>{acc}% ความแม่นยำ</span>
                          </span>

                          {/* Cloud / Local Badge */}
                          {isCloud ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10.5px] font-bold text-sky-700">
                              <Cloud className="h-3 w-3 text-sky-500" />
                              <span>Cloud</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
                              <CheckCircle2 className="h-3 w-3 text-slate-400" />
                              <span>Local</span>
                            </span>
                          )}

                          {docNo && docNo !== "-" && (
                            <span className="hidden sm:inline-block rounded-md bg-slate-50 border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 truncate max-w-[90px]">
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
                        className="rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
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
            className="flex flex-col min-h-0 h-full overflow-y-auto p-5 sm:p-6 bg-white overscroll-contain"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
          >
            {selectedRecord && extracted ? (
              <div className="space-y-6">
                {/* Detail Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black text-slate-900">
                        {selectedRecord.fileName}
                      </h4>
                      {selectedRecord.cloudSyncStatus === "synced" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700">
                          <Cloud className="h-3.5 w-3.5 text-sky-500" />
                          บันทึกบน Cloud Firebase
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                          บันทึกใน Local Cache
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                      <span>
                        ID:{" "}
                        <code className="font-mono text-[11.5px] font-bold text-slate-700">
                          {selectedRecord.id}
                        </code>
                      </span>
                      <span>•</span>
                      <span>
                        ประเภท:{" "}
                        <b className="text-slate-800 capitalize font-bold">
                          {extracted.docType}
                        </b>
                      </span>
                      {formattedDate && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-98"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span>โหลดเข้า Workspace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyJson(selectedRecord)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
                    >
                      {copiedJson ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedJson ? "คัดลอกสำเร็จ!" : "คัดลอก JSON"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadJson(selectedRecord)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>ดาวน์โหลด</span>
                    </button>
                  </div>
                </div>

                {/* Main Content: Document Image Preview + 7 Core Info Cards */}
                <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
                  {/* Left: Document Image Viewer */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span>รูปภาพเอกสาร</span>
                    </p>
                    {selectedRecord.storageUrl ? (
                      <a
                        href={selectedRecord.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-2xs transition hover:border-blue-400 hover:shadow-xs"
                        title="คลิกเพื่อเปิดดูรูปต้นฉบับขนาดใหญ่"
                      >
                        <img
                          src={selectedRecord.storageUrl}
                          alt={selectedRecord.fileName}
                          className="max-h-[260px] w-auto mx-auto object-contain rounded-lg transition group-hover:scale-101"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 opacity-0 transition group-hover:opacity-100 rounded-lg backdrop-blur-2xs">
                          <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md">
                            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                            เปิดรูปเต็มจอ
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
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-blue-600" />
                      <span>ข้อมูล 7 ฟิลด์หลักที่สกัดได้ (Extracted Key-Values)</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {/* Field 1: Document Type */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-1">
                          <Tag className="h-3.5 w-3.5 text-blue-500" />
                          <span>Document Type</span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 capitalize">
                          {extracted.docType}
                        </p>
                      </div>

                      {/* Field 2: Document Number */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-1">
                          <Hash className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Document No</span>
                        </div>
                        <p
                          className="font-mono font-bold text-sm text-slate-900 truncate"
                          title={extracted.docNo}
                        >
                          {extracted.docNo}
                        </p>
                      </div>

                      {/* Field 3: Document Date */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-1">
                          <Calendar className="h-3.5 w-3.5 text-sky-500" />
                          <span>Document Date</span>
                        </div>
                        <p className="font-mono font-bold text-sm text-slate-900">
                          {extracted.docDate}
                        </p>
                      </div>

                      {/* Field 4: Sender / Vendor */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-1">
                          <Building2 className="h-3.5 w-3.5 text-amber-500" />
                          <span>ผู้ส่ง / ผู้ออกบิล</span>
                        </div>
                        <p
                          className="font-bold text-sm text-slate-900 truncate"
                          title={extracted.sender}
                        >
                          {extracted.sender}
                        </p>
                      </div>

                      {/* Field 5: Receiver / Customer */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-1">
                          <Building2 className="h-3.5 w-3.5 text-cyan-500" />
                          <span>ผู้รับ / ลูกค้า</span>
                        </div>
                        <p
                          className="font-bold text-sm text-slate-900 truncate"
                          title={extracted.receiver}
                        >
                          {extracted.receiver}
                        </p>
                      </div>

                      {/* Field 6: Quantity */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-1">
                          <Layers className="h-3.5 w-3.5 text-purple-500" />
                          <span>Quantity</span>
                        </div>
                        <p className="font-bold text-sm text-slate-900">
                          {extracted.qty}
                        </p>
                      </div>

                      {/* Field 7: Total Amount (Hero Highlight) */}
                      <div className="col-span-2 sm:col-span-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-4 shadow-2xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-xs font-bold uppercase text-emerald-800">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>ยอดเงินรวมสุทธิ (Total Amount)</span>
                          </div>
                          <p className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                            {extracted.total !== "-"
                              ? `${extracted.currency} ${extracted.total}`
                              : "-"}
                          </p>
                        </div>
                        {extracted.vat && (
                          <div className="text-right">
                            <span className="text-[11px] font-bold uppercase text-slate-400">VAT</span>
                            <p className="text-xs font-mono font-bold text-slate-700">
                              {extracted.currency} {extracted.vat}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* JSON Schema Payload Viewer (Clean White Theme with Syntax)*/}
                {/* ========================================================= */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCode className="h-4 w-4 text-blue-600" />
                      <span>JSON Schema Payload (RFC 8259 Standard)</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyJson(selectedRecord)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                    >
                      {copiedJson ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedJson ? "คัดลอกสำเร็จ!" : "คัดลอก JSON"}</span>
                    </button>
                  </div>

                  {/* Clean White Code Card */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-mono text-[11px] font-bold text-slate-600">
                          payload.json
                        </span>
                        <span className="rounded bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-slate-600">
                          UTF-8
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">
                        {JSON.stringify(selectedRecord.jsonSchema, null, 2).split("\n").length} บรรทัด
                      </span>
                    </div>
                    <div
                      className="max-h-[300px] min-h-[160px] overflow-auto overscroll-contain bg-white"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
                    >
                      <JsonSyntaxHighlighter json={selectedRecord.jsonSchema} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[350px] flex-col items-center justify-center text-center text-slate-400">
                <Cloud className="mx-auto h-12 w-12 stroke-[1.4] text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">เลือกเอกสารจากรายการด้านซ้าย</p>
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
 * Clean Light Theme JSON Syntax Highlighter
 */
function JsonSyntaxHighlighter({ json }: { json: any }) {
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
    }
  }, [json]);

  const lines = useMemo(() => jsonString.split("\n"), [jsonString]);

  function highlightLine(line: string) {
    return line.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-slate-800";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            // Key
            const keyPart = match.slice(0, -1);
            return `<span class="text-blue-700 font-semibold">${keyPart}</span><span class="text-slate-400">:</span>`;
          } else {
            // String value
            return `<span class="text-emerald-700 font-medium">${match}</span>`;
          }
        } else if (/true|false/.test(match)) {
          cls = "text-purple-600 font-bold";
        } else if (/null/.test(match)) {
          cls = "text-slate-400 font-bold italic";
        } else {
          // Number
          cls = "text-amber-600 font-bold font-mono";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  return (
    <div className="flex font-mono text-xs leading-6 selection:bg-blue-100 selection:text-blue-900 bg-white">
      {/* Line Numbers Column */}
      <div className="select-none py-3 pl-3 pr-3 text-right font-mono text-[11px] text-slate-300 border-r border-slate-100 bg-slate-50/50 min-w-[42px]">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {/* Code Content */}
      <pre className="flex-1 overflow-x-auto py-3 px-4 font-mono text-xs leading-6 text-slate-800 bg-white">
        {lines.map((line, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: highlightLine(line) || "&nbsp;" }}
          />
        ))}
      </pre>
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
