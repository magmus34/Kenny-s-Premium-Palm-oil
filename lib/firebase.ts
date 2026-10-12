import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingVars: string[];
  projectId?: string;
  storageBucket?: string;
}

const REQUIRED_CONFIG_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
] as const;

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const missing: string[] = [];

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;

  if (!apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!storageBucket) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');

  return {
    isConfigured: missing.length === 0,
    missingVars: missing,
    projectId: projectId || undefined,
    storageBucket: storageBucket || undefined,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfigStatus().isConfigured;
}

export function getFirebaseApp(): FirebaseApp | null {
  const { isConfigured } = getFirebaseConfigStatus();
  if (!isConfigured) return null;

  if (getApps().length > 0) {
    return getApp();
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  };

  try {
    return initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Failed to initialize Firebase app:', err);
    return null;
  }
}

export function getFirebaseStorageInstance(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getStorage(app);
  } catch (err) {
    console.error('Failed to initialize Firebase Storage:', err);
    return null;
  }
}

export function getFirestoreInstance(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch (err) {
    console.error('Failed to initialize Firestore:', err);
    return null;
  }
}

/**
 * Uploads a file buffer or blob to Firebase Storage and returns the permanent HTTPS download URL.
 */
export async function uploadToFirebaseStorage(
  data: Buffer | Uint8Array | ArrayBuffer | Blob,
  path: string,
  contentType: string
): Promise<string> {
  const storage = getFirebaseStorageInstance();
  if (!storage) {
    throw new Error(
      'Firebase Storage is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in your environment variables.'
    );
  }

  const storageRef = ref(storage, path);
  let uploadData: Uint8Array | Blob;

  if (data instanceof Blob) {
    uploadData = data;
  } else if (data instanceof Uint8Array) {
    uploadData = data;
  } else if (Buffer.isBuffer(data)) {
    uploadData = new Uint8Array(data);
  } else {
    uploadData = new Uint8Array(data);
  }

  const uploadResult = await uploadBytes(storageRef, uploadData, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  });

  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}
