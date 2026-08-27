import {
  Calendar,
  Cloud,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteDocumentFromFirebase,
  fetchFirebaseDocuments,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<FirebaseDocumentRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  async function loadDocuments() {
    setLoading(true);
    try {
      const records = await fetchFirebaseDocuments(30);
      setDocuments(records);
      if (records.length > 0) {
        setSelectedRecord(records[0]);
      }
    } catch (error) {
      console.error(error);
      onShowToast("ไม่สามารถโหลดประวัติจาก Firebase ได้");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(docId: string, storagePath?: string) {
    if (!window.confirm("ยืนยันการลบเอกสารนี้จาก Cloud Firebase หรือไม่?")) return;
    try {
      await deleteDocumentFromFirebase(docId, storagePath);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedRecord?.id === docId) {
        setSelectedRecord(null);
      }
      onShowToast("ลบเอกสารจาก Firebase สำเร็จ");
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

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      doc.fileName.toLowerCase().includes(q) ||
      doc.documentType.toLowerCase().includes(q) ||
      (doc.jsonSchema?.document_no && String(doc.jsonSchema.document_no).toLowerCase().includes(q)) ||
      (doc.jsonSchema?.party_name && String(doc.jsonSchema.party_name).toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-md">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-navy dark:text-white">
                  คลังเอกสาร & JSON บน Cloud Firebase
                </h3>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                  json-schema-f38aa
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ข้อมูลรูปภาพถูกจัดเก็บบน Firebase Storage และผลลัพธ์ JSON Schema ถูกบันทึกลง Cloud Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDocuments}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>รีเฟรช</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body (2 Columns: List on Left, Preview on Right) */}
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[360px_1fr]">
          {/* Left Column: Search & List */}
          <div className="flex flex-col border-r border-slate-200 dark:border-slate-800">
            {/* Search Box */}
            <div className="border-b border-slate-200 p-3 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไฟล์, เลขที่, คู่ค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-semibold">กำลังดึงข้อมูลจาก Cloud Firebase...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center p-6 text-center text-slate-400">
                  <FolderOpen className="h-8 w-8 stroke-[1.5] text-slate-300" />
                  <p className="mt-2 text-xs font-semibold">ไม่พบรายการเอกสารใน Firebase</p>
                  <p className="text-[11px] text-slate-400">เมื่อคุณประมวลผล SLM ระบบจะบันทึกขึ้น Cloud ให้โดยอัตโนมัติ</p>
                </div>
              ) : (
                filteredDocs.map((docItem) => {
                  const isSelected = selectedRecord?.id === docItem.id;
                  const acc = docItem.performance?.accuracy_pct ?? docItem.overallConfidence;

                  return (
                    <div
                      key={docItem.id}
                      onClick={() => setSelectedRecord(docItem)}
                      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-primary bg-blue-50/70 shadow-sm ring-1 ring-primary/40 dark:border-primary dark:bg-slate-800"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800"
                      }`}
                    >
                      {docItem.storageUrl ? (
                        <img
                          src={docItem.storageUrl}
                          alt={docItem.fileName}
                          className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-navy dark:text-white" title={docItem.fileName}>
                          {docItem.fileName}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {docItem.jsonSchema?.party_name || docItem.documentType} · {docItem.fileSize}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                            {acc}% Acc
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {docItem.jsonSchema?.document_date || "N/A"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="ลบจาก Firebase"
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

          {/* Right Column: Selected Record Details Preview */}
          <div className="flex flex-col min-h-0 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900">
            {selectedRecord ? (
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <h4 className="text-base font-extrabold text-navy dark:text-white">
                      {selectedRecord.fileName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ID: <span className="font-mono">{selectedRecord.id}</span> · ประเภท: <b>{selectedRecord.documentType}</b>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadDocument(selectedRecord);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary/90"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      โหลดเข้า Workspace
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadJson(selectedRecord)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      ดาวน์โหลด JSON
                    </button>
                  </div>
                </div>

                {/* Grid: Image + 7 Core Info */}
                <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                  {selectedRecord.storageUrl ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">รูปภาพต้นฉบับ</p>
                      <a
                        href={selectedRecord.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <img
                          src={selectedRecord.storageUrl}
                          alt={selectedRecord.fileName}
                          className="h-44 w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                          <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-800">
                            <ExternalLink className="h-3 w-3" /> เปิดรูปเต็ม
                          </span>
                        </div>
                      </a>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">ข้อมูล 7 ฟิลด์หลัก</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Document Type</span>
                        <p className="font-extrabold text-navy dark:text-white">{selectedRecord.jsonSchema?.document_type || "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Document No</span>
                        <p className="font-extrabold text-navy dark:text-white">{selectedRecord.jsonSchema?.document_no || "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Document Date</span>
                        <p className="font-extrabold text-navy dark:text-white">{selectedRecord.jsonSchema?.document_date || "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Party Name</span>
                        <p className="font-extrabold text-navy dark:text-white">{selectedRecord.jsonSchema?.party_name || "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Quantity</span>
                        <p className="font-extrabold text-navy dark:text-white">{selectedRecord.jsonSchema?.quantity ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Total Amount</span>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {selectedRecord.jsonSchema?.total_amount ? Number(selectedRecord.jsonSchema.total_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* JSON Viewer */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">JSON Schema Payload ใน Firestore</p>
                  <pre className="max-h-56 overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs text-emerald-400 shadow-inner">
                    {JSON.stringify(selectedRecord.jsonSchema, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-slate-400">
                <div>
                  <Cloud className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-xs font-semibold">เลือกเอกสารจากรายการด้านซ้ายเพื่อดูรายละเอียด</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
