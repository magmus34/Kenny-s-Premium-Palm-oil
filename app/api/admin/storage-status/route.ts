import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getAllProducts,
  getStoreSettings,
  updateProduct,
  updateStoreSettings,
  isValidAdminSession,
  extractTokenFromRequest,
  UPLOADS_DIR,
  PUBLIC_UPLOADS_DIR,
  PUBLIC_API_UPLOADS_DIR,
  TMP_UPLOADS_DIR,
  BUILT_IN_SVG_SAMPLES,
  getUploadedImage,
} from '@/lib/db';
import { BUNDLED_IMAGE_ASSETS } from '@/lib/bundled-assets';
import {
  getFirebaseConfigStatus,
  isFirebaseConfigured,
  uploadToFirebaseStorage,
} from '@/lib/firebase';

function checkImageFileExists(imageUrl: string): {
  exists: boolean;
  type: 'firebase-cloud' | 'bundled-preset' | 'database-base64' | 'disk-file' | 'external-url' | 'missing';
  filename?: string;
} {
  if (!imageUrl) return { exists: false, type: 'missing' };

  if (imageUrl.startsWith('https://firebasestorage.googleapis.com') || imageUrl.startsWith('https://storage.googleapis.com')) {
    return { exists: true, type: 'firebase-cloud' };
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { exists: true, type: 'external-url' };
  }

  const filename = path.basename(imageUrl.split('?')[0]);

  if (BUNDLED_IMAGE_ASSETS && BUNDLED_IMAGE_ASSETS[filename]) {
    return { exists: true, type: 'bundled-preset', filename };
  }

  if (BUILT_IN_SVG_SAMPLES && BUILT_IN_SVG_SAMPLES[filename]) {
    return { exists: true, type: 'bundled-preset', filename };
  }

  const uploaded = getUploadedImage(filename);
  if (uploaded) {
    return { exists: true, type: 'database-base64', filename };
  }

  const candidatePaths = [
    path.join(PUBLIC_API_UPLOADS_DIR, filename),
    path.join(PUBLIC_UPLOADS_DIR, filename),
    path.join(UPLOADS_DIR, filename),
    path.join(TMP_UPLOADS_DIR, filename),
    path.join(process.cwd(), 'data', 'uploads', filename),
    path.join(process.cwd(), 'public', filename),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        return { exists: true, type: 'disk-file', filename };
      }
    } catch {
      // Ignore filesystem permission check errors
    }
  }

  return { exists: false, type: 'missing', filename };
}

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const firebaseStatus = getFirebaseConfigStatus();
    const products = getAllProducts(true);
    const settings = getStoreSettings();

    const productAudit = products.map((prod) => {
      const check = checkImageFileExists(prod.imageUrl);
      return {
        id: prod.id,
        name: prod.name,
        imageUrl: prod.imageUrl,
        filename: check.filename,
        status: check.type,
        exists: check.exists,
        needsReupload: !check.exists,
      };
    });

    const bannerCheck = checkImageFileExists(settings.banner);
    const settingsAudit = {
      banner: settings.banner,
      filename: bannerCheck.filename,
      status: bannerCheck.type,
      exists: bannerCheck.exists,
      needsReupload: !bannerCheck.exists,
    };

    return NextResponse.json({
      success: true,
      firebaseStatus,
      productAudit,
      settingsAudit,
      configInstructions: {
        title: 'How to enable Firebase Storage on Vercel',
        variables: [
          { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', description: 'Your Firebase web API key from Firebase Console' },
          { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', description: 'your-project.firebaseapp.com' },
          { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', description: 'Your Firebase Project ID' },
          { name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', description: 'your-project.firebasestorage.app or your-project.appspot.com' },
          { name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', description: 'Sender ID from Firebase Console' },
          { name: 'NEXT_PUBLIC_FIREBASE_APP_ID', description: 'App ID from Firebase Console' },
        ],
        steps: [
          '1. Go to Firebase Console (https://console.firebase.google.com) and open or create your project.',
          '2. In the left menu, click "Build" -> "Storage" and click "Get started". Choose production rules (or allow reads/writes).',
          '3. Under Project Settings -> General -> Your apps -> Web app, copy your Firebase config values.',
          '4. In Vercel Project Settings -> Environment Variables, add the NEXT_PUBLIC_FIREBASE_* variables listed above.',
          '5. Redeploy your Vercel project. All new product uploads will automatically save to Firebase Storage and persist forever!',
        ],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to audit storage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST endpoint to migrate all existing recovered images to Firebase Storage
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase Storage is not configured yet. Please set the Firebase environment variables in Vercel before migrating.',
        },
        { status: 400 }
      );
    }

    const products = getAllProducts(true);
    const migrated: { id: string; name: string; oldUrl: string; newUrl: string }[] = [];
    const failed: { id: string; name: string; error: string }[] = [];

    for (const prod of products) {
      if (
        prod.imageUrl.startsWith('https://firebasestorage.googleapis.com') ||
        prod.imageUrl.startsWith('https://storage.googleapis.com')
      ) {
        continue; // Already on Firebase
      }

      const filename = path.basename(prod.imageUrl.split('?')[0]);
      let buffer: Buffer | null = null;
      let contentType = 'image/jpeg';

      if (filename.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (filename.endsWith('.png')) contentType = 'image/png';
      else if (filename.endsWith('.webp')) contentType = 'image/webp';

      if (BUNDLED_IMAGE_ASSETS && BUNDLED_IMAGE_ASSETS[filename]) {
        buffer = Buffer.from(BUNDLED_IMAGE_ASSETS[filename].base64, 'base64');
        contentType = BUNDLED_IMAGE_ASSETS[filename].contentType;
      } else {
        const uploaded = getUploadedImage(filename);
        if (uploaded) {
          buffer = uploaded.buffer;
          contentType = uploaded.contentType;
        } else {
          const candidatePaths = [
            path.join(PUBLIC_UPLOADS_DIR, filename),
            path.join(UPLOADS_DIR, filename),
            path.join(process.cwd(), 'public', filename),
          ];
          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              buffer = fs.readFileSync(p);
              break;
            }
          }
        }
      }

      if (buffer) {
        try {
          const cloudUrl = await uploadToFirebaseStorage(
            buffer,
            `products/${filename}`,
            contentType
          );
          updateProduct(prod.id, { imageUrl: cloudUrl });
          migrated.push({ id: prod.id, name: prod.name, oldUrl: prod.imageUrl, newUrl: cloudUrl });
        } catch (migErr: unknown) {
          failed.push({
            id: prod.id,
            name: prod.name,
            error: migErr instanceof Error ? migErr.message : 'Upload failed',
          });
        }
      } else {
        failed.push({
          id: prod.id,
          name: prod.name,
          error: `Original file ${filename} does not exist on disk`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount: migrated.length,
      failedCount: failed.length,
      migrated,
      failed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Migration failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
