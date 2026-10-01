import { getAnalytics, isSupported } from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
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
  AdminCorrectionEntry,
  AdminDocumentRecord,
  ConfidenceScore,
  DocumentType,
  ExtractedField,
  JsonSchemaOutput,
  ReviewItem,
  SlmPerformanceMetrics,
  UserSession,
} from "../types";
import type { OcrLine } from "./ocrApi";
import {
  buildNormalizedCorrectionPayload,
  buildNormalizedDocumentPayload,
  buildNormalizedExtractedDataPayload,
  buildNormalizedOcrPayload,
  diffJsonSchema,
  normalizedOcrId,
} from "./firebasePersistence";

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
export const auth = getAuth(firebaseApp);

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

function profileToSession(user: User, profile?: Partial<UserProfile>): UserSession {
  const email = profile?.email || user.email || "";
  const name = profile?.name || user.displayName || email.split("@")[0] || "ผู้ใช้";
  return {
    uid: user.uid,
    username: email.split("@")[0] || user.uid,
    name,
    role: profile?.role || "เจ้าหน้าที่โลจิสติกส์",
    email,
  };
}

function firebaseAuthError(error: unknown): Error {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "อีเมลนี้มีบัญชีอยู่แล้ว",
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/weak-password": "รหัสผ่านไม่ปลอดภัยเพียงพอ",
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/operation-not-allowed": "ยังไม่ได้เปิด Email/Password Authentication ใน Firebase",
  };
  return new Error(messages[code] || "ไม่สามารถดำเนินการบัญชีผู้ใช้กับ Firebase ได้");
}

export async function registerFirebaseUser(
  name: string,
  email: string,
  password: string,
): Promise<UserSession> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile: UserProfile = {
      uid: credential.user.uid,
      name,
      email: credential.user.email || email,
      role: "เจ้าหน้าที่โลจิสติกส์",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, "users", credential.user.uid), profile);
    } catch (profileError) {
      await deleteUser(credential.user);
      throw profileError;
    }
    return profileToSession(credential.user, profile);
  } catch (error) {
    throw firebaseAuthError(error);
  }
}

export async function loginFirebaseUser(email: string, password: string): Promise<UserSession> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profileSnapshot = await getDoc(doc(db, "users", credential.user.uid));
    const profile = profileSnapshot.exists() ? (profileSnapshot.data() as UserProfile) : undefined;
    return profileToSession(credential.user, profile);
  } catch (error) {
    throw firebaseAuthError(error);
  }
}

export function observeFirebaseAuth(callback: (session: UserSession | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      const snapshot = await getDoc(doc(db, "users", user.uid));
      const profile = snapshot.exists() ? (snapshot.data() as UserProfile) : undefined;
      callback(profileToSession(user, profile));
    } catch {
      callback(profileToSession(user));
    }
  });
}

export async function logoutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

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
  ocrLines?: OcrLine[];
  ocrEngine?: string;
  ocrLanguage?: string;
  fileHash?: string;
  pageCount?: number | null;
  processingStatus?: string;
  processedAt?: Timestamp | string | any;
  correctionHistory?: AdminCorrectionEntry[];
  createdAt?: Timestamp | string | any;
  userId?: string;
  userEmail?: string;
  userName?: string;
  cloudSyncStatus?: "synced" | "local_saved" | "failed";
  cloudSyncNote?: string;
}

export interface FirebaseDocumentsResult {
  records: FirebaseDocumentRecord[];
  cloudAccessible: boolean;
  cloudCount: number | null;
  localCount: number;
  cloudErrorCode: string | null;
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
    correctionEvents?: ReturnType<typeof buildNormalizedCorrectionPayload>[];
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

  const normalizedSchema: JsonSchemaOutput = {
    ...schema,
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
  };
  const updatedAt = new Date().toISOString();
  const createdAt = record.createdAt || new Date().toISOString();
  const processedAt = record.processedAt || updatedAt;
  const userId = record.userId || auth.currentUser?.uid || "";
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
    file_hash: record.fileHash || "",
    file_type: record.fileType,
    fields: record.fields,
    confidence_scores: record.confidenceScores,
    overall_confidence: record.overallConfidence,
    performance: record.performance ?? null,
    review_items: record.reviewItems ?? [],
    ocr_text: record.ocrText ?? "",
    spatial_text: record.spatialText ?? "",
    ocr_lines: record.ocrLines ?? [],
    ocr_engine: record.ocrEngine || "PaddleOCR",
    ocr_language: record.ocrLanguage || "unknown",
    page_count: record.pageCount ?? null,
    processing_status: record.processingStatus || "completed",
    processed_at: processedAt,
    storage_url: storageUrl || "",
    storage_path: storagePath || "",
    user_id: userId,
    user_email: record.userEmail ?? "",
    user_name: record.userName ?? "",
    created_at: createdAt,
    updated_at: updatedAt,
  });
  const normalizedDocument = buildNormalizedDocumentPayload({
    id: docId,
    userId: record.userId || auth.currentUser?.uid || "",
    fileName: record.fileName,
    fileType: record.fileType,
    fileSize: record.fileSize,
    fileHash: record.fileHash,
    storagePath,
    storageUrl,
    processingStatus: record.processingStatus,
    createdAt,
    processedAt,
    pageCount: record.pageCount,
    updatedAt,
  });
  const normalizedOcr = buildNormalizedOcrPayload({
    documentId: docId,
    rawText: record.ocrText,
    spatialText: record.spatialText,
    lines: record.ocrLines,
    pageCount: record.pageCount,
    engine: record.ocrEngine || "PaddleOCR",
    language: record.ocrLanguage || "unknown",
    processedAt,
  });
  const normalizedExtracted = buildNormalizedExtractedDataPayload({
    documentId: docId,
    schema: normalizedSchema,
    fields: record.fields,
    confidenceScores: record.confidenceScores,
    overallConfidence: record.overallConfidence,
    performance: record.performance,
    reviewItems: record.reviewItems,
    extractedAt: processedAt,
    updatedAt,
  });
  const persistedData = dataToSave as Record<string, any>;
  persistedData.other = otherObj;
  if (storageUrl) persistedData.other.storage_url = storageUrl;
  persistedData.storage_url = storageUrl || "";
  persistedData.storage_path = storagePath || "";

  try {
    const batch = writeBatch(db);
    if (userId) {
      batch.set(doc(db, "users", userId), sanitizeForFirestore({
        uid: userId,
        name: record.userName || "",
        username: record.userEmail?.split("@")[0] || userId,
        email: record.userEmail || auth.currentUser?.email || "",
        updated_at: updatedAt,
      }), { merge: true });
    }
    batch.set(doc(db, "documents", docId), sanitizeForFirestore(normalizedDocument));
    batch.set(doc(db, "ocr_results", normalizedOcrId(docId)), sanitizeForFirestore(normalizedOcr));
    batch.set(doc(db, "extracted_data", docId), sanitizeForFirestore(normalizedExtracted));
    batch.set(doc(db, "logistics_extractions", docId), dataToSave, { merge: false });
    for (const correction of record.correctionEvents || []) {
      batch.set(doc(db, "corrections", correction.correction_id), sanitizeForFirestore(correction));
    }
    await batch.commit();

    const syncedRecord: FirebaseDocumentRecord = {
      ...localRecord,
      userId,
      processedAt,
      processingStatus: record.processingStatus || "completed",
      pageCount: record.pageCount ?? null,
      ocrLines: record.ocrLines || [],
      ocrEngine: record.ocrEngine,
      ocrLanguage: record.ocrLanguage,
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      correctionHistory: record.correctionHistory || [],
      cloudSyncStatus: "synced",
      cloudSyncNote: "บันทึกใน Cloud Firestore (normalized + legacy) สำเร็จ",
    };
    saveToLocalCache(syncedRecord);
    return syncedRecord;
  } catch (firestoreError: any) {
    const errorMsg = firestoreError?.message || String(firestoreError);
    console.warn("Cloud Firestore save notice:", errorMsg);

    const partialRecord: FirebaseDocumentRecord = {
      ...localRecord,
      userId,
      processedAt,
      processingStatus: record.processingStatus || "completed",
      pageCount: record.pageCount ?? null,
      ocrLines: record.ocrLines || [],
      ocrEngine: record.ocrEngine,
      ocrLanguage: record.ocrLanguage,
      correctionHistory: [
        ...(record.correctionHistory || []),
        ...(record.correctionEvents || []).map((correction) => ({
          id: correction.correction_id,
          field: correction.field as keyof JsonSchemaOutput,
          previousValue: correction.previous_value,
          nextValue: correction.next_value,
          reason: correction.reason,
          correctedBy: correction.corrected_by,
          correctedAt: String(correction.corrected_at),
        })),
      ],
      storageUrl: storageUrl || localRecord.storageUrl,
      storagePath: storagePath || localRecord.storagePath,
      cloudSyncStatus: "local_saved",
      cloudSyncNote: `บันทึกลง Local Workspace (${errorMsg})`,
    };
    saveToLocalCache(partialRecord);
    return partialRecord;
  }
}

/**
 * Fetch past documents from Firestore + Local Cache
 */
export async function fetchFirebaseDocuments(limitCount: number = 40): Promise<FirebaseDocumentsResult> {
  const localDocs = getLocalCachedDocuments();
  const cloudDocs: FirebaseDocumentRecord[] = [];
  let cloudAccessible = false;
  let cloudErrorCode: string | null = null;

  try {
    const normalizedSnapshot = await getDocs(query(collection(db, "documents"), limit(limitCount)));
    const normalizedRecords = await Promise.all(normalizedSnapshot.docs.map(async (documentSnap) => {
      const metadata = documentSnap.data() as any;
      const [extractedSnapshot, ocrSnapshot, userSnapshot, correctionsSnapshot] = await Promise.all([
        getDoc(doc(db, "extracted_data", documentSnap.id)),
        getDoc(doc(db, "ocr_results", normalizedOcrId(documentSnap.id))),
        metadata.user_id ? getDoc(doc(db, "users", metadata.user_id)) : Promise.resolve(null),
        getDocs(query(collection(db, "corrections"), where("document_id", "==", documentSnap.id))),
      ]);
      const extracted = extractedSnapshot.exists() ? extractedSnapshot.data() as any : {};
      const ocr = ocrSnapshot.exists() ? ocrSnapshot.data() as any : {};
      const user = userSnapshot?.exists() ? userSnapshot.data() as any : {};
      const schemaOut: JsonSchemaOutput = {
        document_type: extracted.document_type || "invoice",
        document_number: extracted.document_number || "",
        document_date: extracted.document_date || "",
        sender: extracted.sender || "",
        receiver: extracted.receiver || "",
        origin: extracted.origin || "",
        destination: extracted.destination || "",
        reference_number: extracted.reference_number || "",
        unit_price: Number(extracted.unit_price) || 0,
        total_amount: Number(extracted.total_amount) || 0,
        currency: extracted.currency || "",
        other: extracted.other && typeof extracted.other === "object" ? extracted.other : {},
      };
      const correctionHistory = correctionsSnapshot.docs.map((correction) => {
        const data = correction.data() as any;
        return {
          id: correction.id,
          field: data.field,
          previousValue: String(data.previous_value || ""),
          nextValue: String(data.next_value || ""),
          reason: String(data.reason || ""),
          correctedBy: String(data.corrected_by || ""),
          correctedAt: String(data.corrected_at || ""),
        } as AdminCorrectionEntry;
      });
      const performance = extracted.performance && typeof extracted.performance === "object" ? extracted.performance as SlmPerformanceMetrics : null;
      return {
        id: documentSnap.id,
        fileName: String(metadata.file_name || documentSnap.id),
        fileSize: String(metadata.file_size || ""),
        fileType: String(metadata.file_type || ""),
        storageUrl: String(metadata.storage_url || ""),
        storagePath: String(metadata.file_path || ""),
        fileHash: String(metadata.file_hash || ""),
        documentType: schemaOut.document_type,
        jsonSchema: schemaOut,
        fields: Array.isArray(extracted.fields) ? extracted.fields as ExtractedField[] : buildStoredFields(schemaOut, schemaOut.other),
        confidenceScores: Array.isArray(extracted.confidence_scores) ? extracted.confidence_scores as ConfidenceScore[] : [],
        overallConfidence: Number(extracted.overall_confidence) || performance?.accuracy_pct || 0,
        performance,
        reviewItems: Array.isArray(extracted.review_items) ? extracted.review_items as ReviewItem[] : [],
        ocrText: String(ocr.raw_text || ""),
        spatialText: String(ocr.spatial_text || ""),
        ocrLines: Array.isArray(ocr.lines) ? ocr.lines as OcrLine[] : [],
        ocrEngine: String(ocr.engine || "PaddleOCR"),
        ocrLanguage: String(ocr.language || "unknown"),
        pageCount: metadata.page_count ?? ocr.page_count ?? null,
        processingStatus: String(metadata.processing_status || "completed"),
        processedAt: metadata.processed_at || ocr.processed_at || "",
        createdAt: metadata.created_at || metadata.updated_at || "",
        userId: String(metadata.user_id || ""),
        userEmail: String(user.email || ""),
        userName: String(user.name || ""),
        correctionHistory,
        cloudSyncStatus: "synced",
        cloudSyncNote: "อ่านจาก normalized Firestore collections สำเร็จ",
      } satisfies FirebaseDocumentRecord;
    }));
    cloudDocs.push(...normalizedRecords);
    cloudAccessible = true;
  } catch (normalizedError: any) {
    cloudErrorCode = typeof normalizedError?.code === "string" ? normalizedError.code : "unknown";
    console.warn("Normalized Firestore read unavailable; trying legacy records:", normalizedError?.message || normalizedError);
  }

  try {
    const legacySnapshot = await getDocs(query(collection(db, "logistics_extractions"), limit(limitCount)));
    cloudAccessible = true;
    for (const docSnap of legacySnapshot.docs) {
      if (cloudDocs.some((record) => record.id === docSnap.id)) continue;
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
      const storedPerformance = data.performance && typeof data.performance === "object" ? data.performance as SlmPerformanceMetrics : null;
      cloudDocs.push({
        id: docSnap.id,
        fileName: String(data.file_name || data.source_file || docSnap.id),
        fileSize: String(data.file_size || ""),
        fileType: String(data.file_type || ""),
        storageUrl: String(data.storage_url || data.other?.storage_url || ""),
        storagePath: String(data.storage_path || ""),
        fileHash: String(data.file_hash || ""),
        documentType: schemaOut.document_type,
        jsonSchema: schemaOut,
        fields: storedFields || buildStoredFields(schemaOut, data.other),
        confidenceScores: Array.isArray(data.confidence_scores) ? data.confidence_scores as ConfidenceScore[] : [],
        overallConfidence: Number(data.overall_confidence) || storedPerformance?.accuracy_pct || 0,
        performance: storedPerformance,
        reviewItems: Array.isArray(data.review_items) ? data.review_items as ReviewItem[] : [],
        ocrText: String(data.ocr_text || ""),
        spatialText: String(data.spatial_text || ""),
        ocrLines: Array.isArray(data.ocr_lines) ? data.ocr_lines as OcrLine[] : [],
        ocrEngine: String(data.ocr_engine || "PaddleOCR"),
        ocrLanguage: String(data.ocr_language || "unknown"),
        pageCount: data.page_count ?? null,
        processingStatus: String(data.processing_status || "completed"),
        processedAt: data.processed_at || "",
        createdAt: data.created_at || data.updated_at || "",
        userId: String(data.user_id || ""),
        userEmail: String(data.user_email || ""),
        userName: String(data.user_name || ""),
        cloudSyncStatus: "synced",
        cloudSyncNote: "อ่านจาก legacy Firestore collection สำเร็จ",
      });
    }
  } catch (error: any) {
    if (!cloudAccessible) cloudErrorCode = typeof error?.code === "string" ? error.code : cloudErrorCode || "unknown";
    console.warn("Legacy Firestore read unavailable; showing local documents:", error?.message || error);
  }

  const map = new Map<string, FirebaseDocumentRecord>();
  for (const localDoc of localDocs) map.set(localDoc.id, localDoc);
  for (const cloudDoc of cloudDocs) map.set(cloudDoc.id, cloudDoc);
  const records = Array.from(map.values());
  records.sort((a, b) => {
    const tA = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
    const tB = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
    return tB - tA;
  });
  const cloudIds = new Set(cloudDocs.map((record) => record.id));
  const displayRecords = cloudAccessible ? records : records.map((record) => ({
    ...record,
    cloudSyncStatus: "local_saved" as const,
    cloudSyncNote: "แสดงจาก Local Cache เนื่องจากยังอ่าน Cloud Firestore ไม่ได้",
  }));
  return {
    records: displayRecords,
    cloudAccessible,
    cloudCount: cloudAccessible ? cloudDocs.length : null,
    localCount: displayRecords.filter((record) => !cloudIds.has(record.id)).length,
    cloudErrorCode,
  };
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
    correctionHistory: record.correctionHistory || [],
    promptSignals: [],
    metrics: {
      ocrTime: record.performance ? `${record.performance.inference_time_sec}s` : "-",
      slmTime: record.performance ? `${record.performance.inference_time_sec}s` : "-",
      totalTime: record.performance ? `${record.performance.inference_time_sec}s` : "-",
      device: record.performance?.device || "-",
      ocrEngine: record.ocrEngine || "PaddleOCR",
      slmModel: record.performance?.model || "Qwen2.5-1.5B",
    },
    ocrLines: (record.ocrLines || []).map((line, index) => ({
      id: `${record.id}-ocr-${index + 1}`,
      text: line.text,
      confidence: line.confidence,
      box: (line.box || line.bounding_box || []).flat().slice(0, 4) as [number, number, number, number],
    })),
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
  const correctedAt = new Date().toISOString();
  const correctionEvents = diffJsonSchema(record.jsonSchema, jsonSchema).map((diff) => buildNormalizedCorrectionPayload({
    documentId: record.id,
    userId: record.userId || auth.currentUser?.uid || "",
    field: diff.field,
    previousValue: diff.previousValue,
    nextValue: diff.nextValue,
    reason: correctionReason || "แก้ไขข้อมูลเอกสาร",
    correctedBy: record.userEmail || auth.currentUser?.email || "",
    correctedAt,
  }));
  return saveDocumentToFirebase({
    ...record,
    jsonSchema,
    fields,
    reviewItems,
    correctionEvents,
    cloudSyncStatus: undefined,
    cloudSyncNote: correctionReason,
  });
}

export async function deleteDocumentFromFirebase(docId: string, storagePath?: string): Promise<void> {
  removeFromLocalCache(docId);

  try {
    const corrections = await getDocs(query(collection(db, "corrections"), where("document_id", "==", docId)));
    const batch = writeBatch(db);
    batch.delete(doc(db, "documents", docId));
    batch.delete(doc(db, "ocr_results", normalizedOcrId(docId)));
    batch.delete(doc(db, "extracted_data", docId));
    batch.delete(doc(db, "logistics_extractions", docId));
    corrections.forEach((correction) => batch.delete(correction.ref));
    await batch.commit();
  } catch {
    try {
      await deleteDoc(doc(db, "logistics_extractions", docId));
    } catch {
      // ignore
    }
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
