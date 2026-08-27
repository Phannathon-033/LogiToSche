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

  // 4. Try Firebase Cloud Firestore Write
  try {
    const docRef = doc(db, "logistics_extractions", docId);
    const dataToSave = sanitizeForFirestore({
      ...record,
      id: docId,
      storageUrl: storageUrl || "",
      storagePath: storagePath || "",
      createdAt: serverTimestamp(),
      cloudSyncStatus: "synced",
      cloudSyncNote: "บันทึกลง Cloud Firestore & Storage สำเร็จ 100%",
    });

    await setDoc(docRef, dataToSave, { merge: true });

    const syncedRecord: FirebaseDocumentRecord = {
      ...localRecord,
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      cloudSyncStatus: "synced",
      cloudSyncNote: "บันทึกลง Cloud Firestore & Storage สำเร็จ 100%",
    };
    saveToLocalCache(syncedRecord);
    return syncedRecord;
  } catch (firestoreError: any) {
    const errorMsg = firestoreError?.message || String(firestoreError);
    console.warn("Cloud Firestore save notice:", errorMsg);

    const isApiDisabled = errorMsg.includes("Cloud Firestore API has not been used") || errorMsg.includes("PERMISSION_DENIED");
    const note = isApiDisabled
      ? "บันทึกลง Local เรียบร้อย (Firebase Console ยังไม่ได้กด 'Create database' ในเมนู Firestore)"
      : `บันทึกลง Local เรียบร้อย (${errorMsg})`;

    const partialRecord: FirebaseDocumentRecord = {
      ...localRecord,
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      cloudSyncStatus: cloudUploaded ? "synced" : "local_saved",
      cloudSyncNote: note,
    };
    saveToLocalCache(partialRecord);
    return partialRecord;
  }
}

/**
 * Fetch past documents from Firestore + Local Cache
 */
export async function fetchFirebaseDocuments(limitCount: number = 30): Promise<FirebaseDocumentRecord[]> {
  const localDocs = getLocalCachedDocuments();
  let cloudDocs: FirebaseDocumentRecord[] = [];

  try {
    const collRef = collection(db, "logistics_extractions");
    const q = query(collRef, orderBy("createdAt", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      cloudDocs.push({
        ...data,
        id: docSnap.id,
        cloudSyncStatus: "synced",
      } as FirebaseDocumentRecord);
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

  return Array.from(map.values());
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
