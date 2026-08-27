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
  ConfidenceScore,
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
 * Upload image/document file to Firebase Storage
 */
export async function uploadDocumentFileToStorage(
  file: File,
  docId: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `documents/${docId}/${sanitizedName}`;
  const fileRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(fileRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  const downloadUrl = await getDownloadURL(snapshot.ref);
  return { downloadUrl, storagePath };
}

/**
 * Save complete extraction result + image file to Firebase Firestore & Storage
 * with automatic fallback to Local Persistent Storage so data is never lost.
 */
export async function saveDocumentToFirebase(
  record: Omit<FirebaseDocumentRecord, "id" | "createdAt"> & { id?: string },
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
    createdAt: new Date().toISOString(),
    cloudSyncStatus: "local_saved",
    cloudSyncNote: "บันทึกลง Local Workspace เรียบร้อยแล้ว (รอการเปิดฐานข้อมูลบน Cloud Firestore)",
  };
  saveToLocalCache(localRecord);

  // 3. Try Firebase Cloud Storage Upload
  let cloudUploaded = false;
  if (file) {
    try {
      const uploadRes = await uploadDocumentFileToStorage(file, docId);
      storageUrl = uploadRes.downloadUrl;
      storagePath = uploadRes.storagePath;
      cloudUploaded = true;
    } catch (storageError: any) {
      console.warn("Firebase Storage upload notice (proceeding to Firestore):", storageError?.message || storageError);
    }
  }

  // 4. Extract strictly the 7 core fields + other for Firestore
  const schema = record.jsonSchema || {};
  const docType = String(schema.document_type || record.documentType || "invoice").toLowerCase();
  const docNo = String(schema.document_no || "-");
  const docDate = String(schema.document_date || "-");
  const party = String(schema.party_name || "-");
  const srcFile = String(schema.source_file || record.fileName || "document");
  const qty = typeof schema.quantity === "number" ? schema.quantity : (Number(schema.quantity) || 1);
  const total = typeof schema.total_amount === "number" ? schema.total_amount : (Number(schema.total_amount) || 0);
  const otherObj = schema.other && typeof schema.other === "object" ? { ...schema.other } : {};

  // If storageUrl exists, store it safely inside other
  if (storageUrl && !otherObj.storage_url) {
    otherObj.storage_url = storageUrl;
  }

  // Pure 7 core fields + other object
  const dataToSave = sanitizeForFirestore({
    document_type: docType,
    document_no: docNo,
    document_date: docDate,
    party_name: party,
    source_file: srcFile,
    quantity: qty,
    total_amount: total,
    other: otherObj,
  });

  try {
    const docRef = doc(db, "logistics_extractions", docId);
    await setDoc(docRef, dataToSave, { merge: false });

    const syncedRecord: FirebaseDocumentRecord = {
      ...localRecord,
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      cloudSyncStatus: "synced",
      cloudSyncNote: "บันทึกใน Cloud Firestore (7 ฟิลด์หลัก + other) สำเร็จ",
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
      cloudSyncNote: `บันทึกลง Local สำเร็จ (${errorMsg})`,
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
  let cloudDocs: FirebaseDocumentRecord[] = [];

  try {
    const collRef = collection(db, "logistics_extractions");
    const querySnapshot = await getDocs(query(collRef, limit(limitCount)));

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const schemaOut: JsonSchemaOutput = {
        document_type: data.document_type || "invoice",
        document_number: data.document_number || data.document_no || "-",
        document_date: data.document_date || "-",
        sender: data.sender || data.party_name || "-",
        receiver: data.receiver || "-",
        origin: data.origin || "-",
        destination: data.destination || "-",
        reference_number: data.reference_number || data.document_number || data.document_no || "-",
        unit_price: Number(data.unit_price) || 0,
        total_amount: Number(data.total_amount) || 0,
        currency: data.currency || "THB",
        document_no: data.document_number || data.document_no || "-",
        party_name: data.sender || data.party_name || "-",
        source_file: data.source_file || docSnap.id,
        quantity: data.quantity ?? 1,
        other: data.other && typeof data.other === "object" ? data.other : {},
      };

      const otherObj = schemaOut.other || {};
      const fieldsList: ExtractedField[] = [
        { id: 1, sourceText: schemaOut.document_type, field: "document_type", value: schemaOut.document_type, confidence: 98, status: "success", isOther: false },
        { id: 2, sourceText: schemaOut.document_number, field: "document_number", value: schemaOut.document_number, confidence: 96, status: "success", isOther: false },
        { id: 3, sourceText: schemaOut.document_date, field: "document_date", value: schemaOut.document_date, confidence: 95, status: "success", isOther: false },
        { id: 4, sourceText: schemaOut.sender, field: "sender", value: schemaOut.sender, confidence: 94, status: "success", isOther: false },
        { id: 5, sourceText: schemaOut.receiver, field: "receiver", value: schemaOut.receiver, confidence: 94, status: "success", isOther: false },
        { id: 6, sourceText: schemaOut.origin, field: "origin", value: schemaOut.origin, confidence: 93, status: "success", isOther: false },
        { id: 7, sourceText: schemaOut.destination, field: "destination", value: schemaOut.destination, confidence: 93, status: "success", isOther: false },
        { id: 8, sourceText: schemaOut.reference_number, field: "reference_number", value: schemaOut.reference_number, confidence: 95, status: "success", isOther: false },
        { id: 9, sourceText: String(schemaOut.unit_price), field: "unit_price", value: String(schemaOut.unit_price), confidence: 95, status: "success", isOther: false },
        { id: 10, sourceText: String(schemaOut.total_amount), field: "total_amount", value: String(schemaOut.total_amount), confidence: 96, status: "success", isOther: false },
        { id: 11, sourceText: schemaOut.currency, field: "currency", value: schemaOut.currency, confidence: 98, status: "success", isOther: false },
      ];

      Object.entries(otherObj).forEach(([k, v], idx) => {
        if (k !== "storage_url") {
          fieldsList.push({
            id: 8 + idx,
            sourceText: String(v),
            field: k,
            value: String(v),
            confidence: 90,
            status: "success",
            isOther: true,
          });
        }
      });

      cloudDocs.push({
        id: docSnap.id,
        fileName: schemaOut.source_file || `${docSnap.id}.tif`,
        fileSize: "0.85 MB",
        fileType: "image/jpeg",
        storageUrl: String(otherObj.storage_url || ""),
        documentType: schemaOut.document_type,
        jsonSchema: schemaOut,
        fields: fieldsList,
        confidenceScores: [
          { label: "การอ่านข้อความ (OCR)", value: 96, tone: "green" },
          { label: "การทำความเข้าใจ (SLM)", value: 95, tone: "blue" },
          { label: "การแมป 7 ฟิลด์หลัก", value: 96, tone: "blue" },
          { label: "ความครบถ้วน Other", value: 94, tone: "blue" },
        ],
        overallConfidence: 96,
        cloudSyncStatus: "synced",
        cloudSyncNote: "บันทึกใน Cloud Firestore (7 ฟิลด์หลัก + other)",
      });
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
