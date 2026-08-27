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
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(firebaseApp);
    }
  }).catch(() => {
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
  cloudSyncStatus?: "synced" | "uploading" | "failed";
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
 */
export async function saveDocumentToFirebase(
  record: Omit<FirebaseDocumentRecord, "id" | "createdAt"> & { id?: string },
  file?: File | null
): Promise<FirebaseDocumentRecord> {
  const docId = record.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let storageUrl = record.storageUrl;
  let storagePath = record.storagePath;

  // 1. Upload file to Storage if provided and not yet uploaded
  if (file && !storageUrl) {
    try {
      const uploadRes = await uploadDocumentFileToStorage(file, docId);
      storageUrl = uploadRes.downloadUrl;
      storagePath = uploadRes.storagePath;
    } catch (storageError) {
      console.warn("Firebase Storage upload warning (proceeding to save Firestore metadata):", storageError);
    }
  }

  // 2. Prepare payload for Firestore
  const docRef = doc(db, "logistics_extractions", docId);
  const dataToSave = {
    ...record,
    id: docId,
    storageUrl: storageUrl || "",
    storagePath: storagePath || "",
    createdAt: serverTimestamp(),
    cloudSyncStatus: "synced",
  };

  // 3. Save to Firestore
  await setDoc(docRef, dataToSave, { merge: true });

  return {
    ...dataToSave,
    createdAt: new Date().toISOString(),
  } as FirebaseDocumentRecord;
}

/**
 * Fetch past documents from Firestore
 */
export async function fetchFirebaseDocuments(limitCount: number = 25): Promise<FirebaseDocumentRecord[]> {
  try {
    const collRef = collection(db, "logistics_extractions");
    const q = query(collRef, orderBy("createdAt", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);

    const documents: FirebaseDocumentRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      documents.push({
        ...data,
        id: docSnap.id,
      } as FirebaseDocumentRecord);
    });

    return documents;
  } catch (error) {
    console.error("Error fetching documents from Firebase:", error);
    return [];
  }
}

/**
 * Delete a document from Firestore and Storage
 */
export async function deleteDocumentFromFirebase(docId: string, storagePath?: string): Promise<void> {
  // 1. Delete from Firestore
  const docRef = doc(db, "logistics_extractions", docId);
  await deleteDoc(docRef);

  // 2. Delete from Storage if exists
  if (storagePath) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn("Firebase Storage delete warning:", err);
    }
  }
}
