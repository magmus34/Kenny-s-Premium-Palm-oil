import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingVars: string[];
  projectId?: string;
  storageBucket?: string;
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const missing: string[] = [];

  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    appletConfig?.apiKey;
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    appletConfig?.projectId;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    appletConfig?.storageBucket;

  if (!apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!storageBucket) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');

  return {
    isConfigured: Boolean(apiKey && projectId && storageBucket),
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

  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    appletConfig?.apiKey;
  const authDomain =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.FIREBASE_AUTH_DOMAIN ||
    appletConfig?.authDomain;
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    appletConfig?.projectId;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    appletConfig?.storageBucket;
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    appletConfig?.messagingSenderId;
  const appId =
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.FIREBASE_APP_ID ||
    appletConfig?.appId;

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
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
    // If firestoreDatabaseId is provided in applet config, pass it to getFirestore
    const dbId = appletConfig?.firestoreDatabaseId;
    if (dbId) {
      return getFirestore(app, dbId);
    }
    return getFirestore(app);
  } catch (err) {
    console.error('Failed to initialize Firestore:', err);
    return null;
  }
}

/**
 * Validates connection to Firestore as required by system guidelines.
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    const firestore = getFirestoreInstance();
    if (!firestore) return false;
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return false;
    }
    // Document not existing is normal and means we connected to the server!
    return true;
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
      'Firebase Storage is not configured. Please check your Firebase configuration or environment variables.'
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
