import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UPLOADS_DIR,
  TMP_UPLOADS_DIR,
  PUBLIC_UPLOADS_DIR,
  PUBLIC_API_UPLOADS_DIR,
  saveUploadedImage,
  isValidAdminSession,
  extractTokenFromRequest,
} from '@/lib/db';
import {
  isFirebaseConfigured,
  uploadToFirebaseStorage,
  getFirebaseConfigStatus,
} from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin session required. Please log in to your admin account.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadCategory = (formData.get('type') as string) || 'products';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file was provided in the upload request' }, { status: 400 });
    }

    // Allow uploads up to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image file too large (max 25MB). Please choose a smaller image.' },
        { status: 400 }
      );
    }

    // Check image mime type or file extension
    const nameLower = (file.name || '').toLowerCase();
    const isImageMime = (file.type || '').startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|svg|avif|jfif|heic|heif|bmp)$/i.test(nameLower);

    if (!isImageMime && !isImageExt) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload an image file (JPG, PNG, WebP, etc.).' },
        { status: 400 }
      );
    }

    let ext = '.jpg';
    let mimeType = file.type || 'image/jpeg';

    if (file.name && path.extname(file.name)) {
      ext = path.extname(file.name).toLowerCase();
      if (!ext.startsWith('.')) ext = '.' + ext;
    } else if (file.type === 'image/png') ext = '.png';
    else if (file.type === 'image/webp') ext = '.webp';
    else if (file.type === 'image/gif') ext = '.gif';
    else if (file.type === 'image/svg+xml') ext = '.svg';
    else if (file.type === 'image/jpeg') ext = '.jpg';

    if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueId = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const filename = `img_${uniqueId}${ext}`;

    // 1. If Firebase Storage is configured, upload directly to cloud storage!
    if (isFirebaseConfigured()) {
      try {
        const storagePath = `${uploadCategory}/${filename}`;
        const cloudUrl = await uploadToFirebaseStorage(buffer, storagePath, mimeType);

        // Also save to database in-memory registry as quick local cache
        try {
          saveUploadedImage(filename, mimeType, buffer);
        } catch {
          // Ignore non-fatal db save error
        }

        return NextResponse.json({
          success: true,
          url: cloudUrl,
          storageProvider: 'firebase-storage',
          size: file.size,
          filename,
        });
      } catch (fbErr: unknown) {
        console.error('Firebase Storage upload error, falling back to local storage:', fbErr);
        // If Firebase Storage failed at runtime (e.g. permission or quota error),
        // proceed to local fallback with error note
      }
    }

    // 2. Local fallback storage (when Firebase Storage is not yet configured or on local dev)
    try {
      saveUploadedImage(filename, mimeType, buffer);
    } catch (dbErr) {
      console.warn('Notice: Image DB registry save note:', dbErr);
    }

    const targetDirs = [
      UPLOADS_DIR,
      PUBLIC_UPLOADS_DIR,
      PUBLIC_API_UPLOADS_DIR,
      TMP_UPLOADS_DIR,
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const destination = path.join(dir, filename);
        fs.writeFileSync(destination, buffer);
      } catch {
        // Safe to ignore read-only failures on serverless filesystem
      }
    }

    const fileUrl = `/api/uploads/${filename}`;
    const fbStatus = getFirebaseConfigStatus();

    return NextResponse.json({
      success: true,
      url: fileUrl,
      storageProvider: 'local',
      firebaseConfigured: false,
      missingFirebaseVars: fbStatus.missingVars,
      warning:
        'Firebase Storage is not configured. To make uploaded images persist permanently across Vercel deployments, configure NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET and related credentials in Vercel.',
      size: file.size,
      filename,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('File upload error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
