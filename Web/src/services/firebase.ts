import { getAnalytics, isSupported } from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import type {
  AdminDocumentRecord,
  ConfidenceScore,
  DocumentType,
  ExtractedField,
  JsonSchemaOutput,
  ReviewItem,
  SlmPerformanceMetrics,
} from "../types";

// User's provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEv9Sb1oJbnngeB2UvqLYlJ9z_NJKMEBk",
  authDomain: "json-schema-f38aa.firebaseapp.com",
  projectId: "json-schema-f38aa",
  storageBucket: "json-schema-f38aa.firebasestorage.app",
  messagingSenderId: "854124114114",
  appId: "1:854124114114:web:2fb13fd2f48ac034cd8b5b",
  measurementId: "G-8LWXJXPK41",
};

// Initialize Firebase singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Initialize analytics if supported in browser environment
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(firebaseApp);
      }
    })
    .catch(() => {
      // Ignore analytics init issues
    });
}

export interface FirebaseDocumentRecord {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  storageUrl?: string;
  storagePath?: string;
  documentType: string;
  jsonSchema: JsonSchemaOutput;
  fields: ExtractedField[];
  confidenceScores: ConfidenceScore[];
  overallConfidence: number;
  performance?: SlmPerformanceMetrics | null;
  reviewItems?: ReviewItem[];
  ocrText?: string;
  spatialText?: string;
  createdAt?: Timestamp | string | any;
  userEmail?: string;
  userName?: string;
  cloudSyncStatus?: "synced" | "local_saved" | "failed";
  cloudSyncNote?: string;
}

const LOCAL_STORAGE_KEY = "logiai_saved_documents_cache";

/**
 * Clean all undefined values recursively to prevent Firestore from throwing serialization errors
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}

/**
 * Save record to Local Persistent Storage
 */
function saveToLocalCache(record: FirebaseDocumentRecord): void {
  try {
    const existing = getLocalCachedDocuments();
    const filtered = existing.filter((d) => d.id !== record.id);
    const updated = [record, ...filtered].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Local storage cache warning:", err);
  }
}

/**
 * Read records from Local Persistent Storage
 */
export function getLocalCachedDocuments(): FirebaseDocumentRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FirebaseDocumentRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Remove record from Local Persistent Storage
 */
function removeFromLocalCache(docId: string): void {
  try {
    const existing = getLocalCachedDocuments();
    const updated = existing.filter((d) => d.id !== docId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Local storage remove warning:", err);
  }
}

/**
 * Upload image/document file to Firebase Storage with fail-safe timeout
 */
export async function uploadDocumentFileToStorage(
  file: File,
  docId: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `documents/${docId}/${sanitizedName}`;
  const fileRef = ref(storage, storagePath);

  // Use a 2.5s fail-fast timeout so the UI never freezes if Cloud Storage is unprovisioned
  const uploadPromise = (async () => {
    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type || "application/octet-stream",
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { downloadUrl, storagePath };
  })();

  const timeoutPromise = new Promise<{ downloadUrl: string; storagePath: string }>((_, reject) => {
    setTimeout(() => reject(new Error("Storage timeout (2.5s)")), 2500);
  });

  return Promise.race([uploadPromise, timeoutPromise]);
}

/**
 * Save complete extraction result + image file to Firebase Firestore & Storage
 * with automatic fallback to Local Persistent Storage so data is never lost.
 */
export async function saveDocumentToFirebase(
  record: Omit<FirebaseDocumentRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: FirebaseDocumentRecord["createdAt"];
  },
  file?: File | null
): Promise<FirebaseDocumentRecord> {
  const docId = record.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let storageUrl = record.storageUrl;
  let storagePath = record.storagePath;

  // 1. Create temporary Object URL if available
  if (file && !storageUrl && typeof window !== "undefined") {
    try {
      storageUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }
  }

  // 2. Prepare Local Baseline Record First (Fail-Safe)
  const localRecord: FirebaseDocumentRecord = {
    ...record,
    id: docId,
    storageUrl: storageUrl || "",
    storagePath: storagePath || "",
    createdAt: record.createdAt || new Date().toISOString(),
    cloudSyncStatus: "local_saved",
    cloudSyncNote: "บันทึกลง Local Workspace เรียบร้อยแล้ว (รอการเปิดฐานข้อมูลบน Cloud Firestore)",
  };
  saveToLocalCache(localRecord);

  // 3. Try Firebase Cloud Storage Upload (Non-blocking fail-safe)
  let cloudUploaded = false;
  if (file) {
    try {
      const uploadRes = await uploadDocumentFileToStorage(file, docId);
      storageUrl = uploadRes.downloadUrl;
      storagePath = uploadRes.storagePath;
      cloudUploaded = true;
    } catch (storageError: any) {
      console.warn("Firebase Storage upload skipped/unavailable (proceeding to Firestore):", storageError?.message || storageError);
    }
  }

  // 4. Extract strictly the 11 core logistics fields + other for Firestore
  const schema = record.jsonSchema || {};
  const docType = String(schema.document_type || record.documentType || "invoice").toLowerCase();
  const docNumber = String(schema.document_number || schema.document_no || "-");
  const docDate = String(schema.document_date || "-");
  const sender = String(schema.sender || schema.party_name || "-");
  const receiver = String(schema.receiver || "-");
  const origin = String(schema.origin || "-");
  const destination = String(schema.destination || "-");
  const refNo = String(schema.reference_number || docNumber || "-");
  const unitPrice = typeof schema.unit_price === "number" ? schema.unit_price : (Number(schema.unit_price) || 0);
  const totalAmount = typeof schema.total_amount === "number" ? schema.total_amount : (Number(schema.total_amount) || 0);
  const currency = String(schema.currency || "THB");
  const otherObj = schema.other && typeof schema.other === "object" ? { ...schema.other } : {};
  delete (otherObj as any).storage_url;

  const dataToSave = sanitizeForFirestore({
    document_type: docType,
    document_number: docNumber,
    document_date: docDate,
    sender,
    receiver,
    origin,
    destination,
    reference_number: refNo,
    unit_price: unitPrice,
    total_amount: totalAmount,
    currency,
    other: otherObj,
    source_file: record.fileName,
    file_name: record.fileName,
    file_size: record.fileSize,
    file_type: record.fileType,
    fields: record.fields,
    confidence_scores: record.confidenceScores,
    overall_confidence: record.overallConfidence,
    performance: record.performance ?? null,
    review_items: record.reviewItems ?? [],
    ocr_text: record.ocrText ?? "",
    spatial_text: record.spatialText ?? "",
    storage_url: storageUrl || "",
    storage_path: storagePath || "",
    user_email: record.userEmail ?? "",
    user_name: record.userName ?? "",
    created_at: record.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const persistedData = dataToSave as Record<string, any>;
  persistedData.other = otherObj;
  if (storageUrl) persistedData.other.storage_url = storageUrl;
  persistedData.storage_url = storageUrl || "";
  persistedData.storage_path = storagePath || "";

  try {
    const docRef = doc(db, "logistics_extractions", docId);
    await setDoc(docRef, dataToSave, { merge: false });

    const syncedRecord: FirebaseDocumentRecord = {
      ...localRecord,
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      cloudSyncStatus: "synced",
      cloudSyncNote: "บันทึกใน Cloud Firestore (11 ฟิลด์หลัก + other) สำเร็จ",
    };
    saveToLocalCache(syncedRecord);
    return syncedRecord;
  } catch (firestoreError: any) {
    const errorMsg = firestoreError?.message || String(firestoreError);
    console.warn("Cloud Firestore save notice:", errorMsg);

    const partialRecord: FirebaseDocumentRecord = {
      ...localRecord,
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      cloudSyncStatus: cloudUploaded ? "synced" : "local_saved",
      cloudSyncNote: `บันทึกลง Local Workspace (${errorMsg})`,
    };
    saveToLocalCache(partialRecord);
    return partialRecord;
  }
}

/**
 * Fetch past documents from Firestore + Local Cache
 */
export async function fetchFirebaseDocuments(limitCount: number = 40): Promise<FirebaseDocumentRecord[]> {
  const localDocs = getLocalCachedDocuments();
  const cloudDocs: FirebaseDocumentRecord[] = [];

  try {
    const collRef = collection(db, "logistics_extractions");
    const querySnapshot = await getDocs(query(collRef, limit(limitCount)));

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const schemaOut: JsonSchemaOutput = {
        document_type: data.document_type || "invoice",
        document_number: data.document_number || data.document_no || "",
        document_date: data.document_date || "",
        sender: data.sender || data.party_name || "",
        receiver: data.receiver || "",
        origin: data.origin || "",
        destination: data.destination || "",
        reference_number: data.reference_number || "",
        unit_price: Number(data.unit_price) || 0,
        total_amount: Number(data.total_amount) || 0,
        currency: data.currency || "",
        document_no: data.document_number || data.document_no || "",
        party_name: data.sender || data.party_name || "",
        source_file: data.source_file || data.file_name || docSnap.id,
        quantity: data.quantity ?? 0,
        other: data.other && typeof data.other === "object" ? data.other : {},
      };

      const storedFields = Array.isArray(data.fields) ? data.fields as ExtractedField[] : null;
      const storedReviewItems = Array.isArray(data.review_items) ? data.review_items as ReviewItem[] : [];
      const storedConfidenceScores = Array.isArray(data.confidence_scores) ? data.confidence_scores as ConfidenceScore[] : null;
      const storedPerformance = data.performance && typeof data.performance === "object" ? data.performance as SlmPerformanceMetrics : null;
      const createdAt = data.created_at || data.updated_at || "";
      const userEmail = String(data.user_email || "");
      const userName = String(data.user_name || "");
      const fileName = String(data.file_name || data.source_file || docSnap.id);
      const fileSize = String(data.file_size || "");
      const fileType = String(data.file_type || "");
      const storageUrl = String(data.storage_url || data.other?.storage_url || "");
      const storagePath = String(data.storage_path || "");
      const overallConfidence = Number(data.overall_confidence) || storedPerformance?.accuracy_pct || 0;
      const fields = storedFields || buildStoredFields(schemaOut, data.other);
      const confidenceScores = storedConfidenceScores || [];

      const otherObj = schemaOut.other || {};
      cloudDocs.push({
        id: docSnap.id,
        fileName,
        fileSize,
        fileType,
        storageUrl,
        storagePath,
        documentType: schemaOut.document_type,
        jsonSchema: schemaOut,
        fields,
        confidenceScores,
        overallConfidence,
        performance: storedPerformance,
        reviewItems: storedReviewItems,
        ocrText: String(data.ocr_text || ""),
        spatialText: String(data.spatial_text || ""),
        createdAt,
        userEmail,
        userName,
        cloudSyncStatus: "synced",
        cloudSyncNote: "บันทึกใน Cloud Firestore (11 ฟิลด์หลัก + other) สำเร็จ",
      });

      void otherObj;
    });
  } catch (error: any) {
    console.warn("Notice reading from Cloud Firestore (showing local documents):", error?.message || error);
  }

  // Merge Cloud + Local records, avoiding duplicates
  const map = new Map<string, FirebaseDocumentRecord>();
  for (const doc of localDocs) {
    map.set(doc.id, doc);
  }
  for (const doc of cloudDocs) {
    map.set(doc.id, doc);
  }

  const allRecords = Array.from(map.values());
  allRecords.sort((a, b) => {
    const tA = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
    const tB = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
    return tB - tA;
  });

  return allRecords;
}

/**
 * Delete a document from Firestore, Storage, and Local Cache
 */
function buildStoredFields(schema: JsonSchemaOutput, other: Record<string, unknown> = {}): ExtractedField[] {
  const coreFields: Array<[keyof JsonSchemaOutput, string]> = [
    ["document_type", schema.document_type],
    ["document_number", schema.document_number],
    ["document_date", schema.document_date],
    ["sender", schema.sender],
    ["receiver", schema.receiver],
    ["origin", schema.origin],
    ["destination", schema.destination],
    ["reference_number", schema.reference_number],
    ["unit_price", String(schema.unit_price)],
    ["total_amount", String(schema.total_amount)],
    ["currency", schema.currency],
  ];
  return [
    ...coreFields.map(([field, value], index) => ({
      id: index + 1,
      sourceText: value,
      field,
      value,
      confidence: value && value !== "0" ? 100 : 0,
      status: value && value !== "0" ? "success" as const : "review" as const,
      isOther: false,
    })),
    ...Object.entries(other)
      .filter(([key]) => key !== "storage_url")
      .map(([field, value], index) => ({
        id: coreFields.length + index + 1,
        sourceText: String(value),
        field,
        value: String(value),
        confidence: 100,
        status: "success" as const,
        isOther: true,
      })),
  ];
}

export function toAdminDocumentRecord(record: FirebaseDocumentRecord): AdminDocumentRecord {
  const schema = record.jsonSchema;
  const missingFields = ([
    "document_type", "document_number", "document_date", "sender", "receiver",
    "origin", "destination", "reference_number", "unit_price", "total_amount", "currency",
  ] as Array<keyof JsonSchemaOutput>).filter((field) => {
    const value = schema[field];
    return typeof value === "number" ? value === 0 : !String(value || "").trim();
  });
  const reviewFields = new Set((record.reviewItems || []).filter((item) => item.status === "review").map((item) => item.field));
  const reviewFieldNames = [...reviewFields];

  const status = missingFields.length > 0 || record.reviewItems?.some((item) => item.status === "review") ? "review" : "success";
  const confidence = record.overallConfidence || record.performance?.accuracy_pct || 0;
  const date = formatFirebaseDate(record.createdAt);
  const name = record.userName || record.userEmail || "Unknown uploader";
  const email = record.userEmail || "";
  const type = normalizeDocumentType(record.documentType || schema.document_type);

  return {
    id: record.id,
    fileName: record.fileName,
    type,
    uploadedBy: { name, email, role: "User", avatar: name.slice(0, 2).toUpperCase() || "U" },
    date,
    status,
    statusLabel: status === "review" ? "รอตรวจสอบ" : "สำเร็จ",
    result: `${confidence}%`,
    overallConfidence: confidence,
    queueReasons: [...new Set([...missingFields.map((field) => `ขาด ${field}`), ...reviewFieldNames.map((field) => `Review ${field}`)])],
    missingFields,
    conflictingFields: [],
    errorTags: [],
    reviewNotes: record.reviewItems?.map((item) => item.field) || [],
    ocrText: record.ocrText || "",
    jsonOutput: schema,
    extractedFields: record.fields,
    reviewItems: record.reviewItems || [],
    correctionHistory: [],
    promptSignals: [],
    metrics: {
      ocrTime: record.performance ? `${record.performance.inference_time_sec}s` : "-",
      slmTime: record.performance ? `${record.performance.inference_time_sec}s` : "-",
      totalTime: record.performance ? `${record.performance.inference_time_sec}s` : "-",
      device: record.performance?.device || "-",
      ocrEngine: "PaddleOCR",
      slmModel: record.performance?.model || "Qwen2.5-1.5B",
    },
    ocrLines: [],
  };
}

function normalizeDocumentType(value: string): DocumentType {
  const normalized = value.toLowerCase();
  if (normalized.includes("bill") || normalized.includes("lading")) return "Bill of Lading";
  if (normalized.includes("packing")) return "Packing List";
  if (normalized.includes("purchase") || normalized.includes("order")) return "Purchase Order";
  return "Invoice";
}

function formatFirebaseDate(value: FirebaseDocumentRecord["createdAt"]): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value?.toDate?.() || new Date(value?.seconds ? value.seconds * 1000 : 0);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export async function updateFirebaseDocument(
  record: FirebaseDocumentRecord,
  jsonSchema: JsonSchemaOutput,
  correctionReason: string,
): Promise<FirebaseDocumentRecord> {
  const fields = buildStoredFields(jsonSchema, jsonSchema.other);
  const reviewItems = (record.reviewItems || []).map((item) => ({ ...item, status: "resolved" as const }));
  return saveDocumentToFirebase({
    ...record,
    jsonSchema,
    fields,
    reviewItems,
    cloudSyncStatus: undefined,
    cloudSyncNote: correctionReason,
  });
}

export async function deleteDocumentFromFirebase(docId: string, storagePath?: string): Promise<void> {
  removeFromLocalCache(docId);

  try {
    const docRef = doc(db, "logistics_extractions", docId);
    await deleteDoc(docRef);
  } catch {
    // ignore
  }

  if (storagePath) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch {
      // ignore
    }
  }
}
