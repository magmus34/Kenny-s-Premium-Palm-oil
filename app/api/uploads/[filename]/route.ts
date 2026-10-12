import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  UPLOADS_DIR,
  TMP_UPLOADS_DIR,
  PUBLIC_UPLOADS_DIR,
  PUBLIC_API_UPLOADS_DIR,
  BUILT_IN_SVG_SAMPLES,
  getUploadedImage,
} from '@/lib/db';
import { BUNDLED_IMAGE_ASSETS } from '@/lib/bundled-assets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Prevent directory traversal attacks
    const safeFilename = path.basename(filename);

    // 1. Check bundled asset registry (in-memory, guaranteed zero-latency on Vercel)
    if (BUNDLED_IMAGE_ASSETS && BUNDLED_IMAGE_ASSETS[safeFilename]) {
      const asset = BUNDLED_IMAGE_ASSETS[safeFilename];
      const buffer = Buffer.from(asset.base64, 'base64');
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': asset.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. Check built-in SVG samples in lib/db
    if (BUILT_IN_SVG_SAMPLES && BUILT_IN_SVG_SAMPLES[safeFilename]) {
      return new NextResponse(BUILT_IN_SVG_SAMPLES[safeFilename], {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 3. Check persistent database registry (for images uploaded at runtime)
    const uploadedData = getUploadedImage(safeFilename);
    if (uploadedData) {
      return new NextResponse(new Uint8Array(uploadedData.buffer), {
        status: 200,
        headers: {
          'Content-Type': uploadedData.contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 4. Check filesystem locations
    const candidatePaths = [
      path.join(PUBLIC_API_UPLOADS_DIR, safeFilename),
      path.join(PUBLIC_UPLOADS_DIR, safeFilename),
      path.join(UPLOADS_DIR, safeFilename),
      path.join(TMP_UPLOADS_DIR, safeFilename),
      path.join(process.cwd(), 'data', 'uploads', safeFilename),
      path.join(process.cwd(), 'public', safeFilename),
    ];

    let targetPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        targetPath = p;
        break;
      }
    }

    if (targetPath) {
      const ext = path.extname(safeFilename).toLowerCase();
      let contentType = 'application/octet-stream';

      switch (ext) {
        case '.svg':
          contentType = 'image/svg+xml';
          break;
        case '.jpg':
        case '.jpeg':
        case '.jfif':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.avif':
          contentType = 'image/avif';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.bmp':
          contentType = 'image/bmp';
          break;
        case '.heic':
        case '.heif':
          contentType = 'image/heic';
          break;
      }

      const fileBuffer = fs.readFileSync(targetPath);
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 5. File does NOT exist: return clear, structured 404 response
    return NextResponse.json(
      {
        error: 'Image not found',
        filename: safeFilename,
        message: `The image file "${safeFilename}" was not found on this server. If this image was uploaded before cloud storage was configured, please re-upload the product photo via the Admin Dashboard.`,
      },
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Error serving upload:', err);
    return NextResponse.json(
      { error: 'Internal server error while serving file' },
      { status: 500 }
    );
  }
}
