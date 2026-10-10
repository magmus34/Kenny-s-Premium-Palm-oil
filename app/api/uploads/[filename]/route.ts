import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR, TMP_UPLOADS_DIR, BUILT_IN_SVG_SAMPLES } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Prevent directory traversal
    const safeFilename = path.basename(filename);

    // 1. If it's a built-in SVG sample, serve immediately from memory
    if (BUILT_IN_SVG_SAMPLES && BUILT_IN_SVG_SAMPLES[safeFilename]) {
      return new NextResponse(BUILT_IN_SVG_SAMPLES[safeFilename], {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 2. Check primary UPLOADS_DIR or fallback TMP_UPLOADS_DIR
    const primaryPath = path.join(UPLOADS_DIR, safeFilename);
    const tmpPath = path.join(TMP_UPLOADS_DIR, safeFilename);

    let targetPath: string | null = null;
    if (fs.existsSync(primaryPath)) {
      targetPath = primaryPath;
    } else if (fs.existsSync(tmpPath)) {
      targetPath = tmpPath;
    }

    if (!targetPath) {
      return new NextResponse('File not found', { status: 404 });
    }

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
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('Error serving upload:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
