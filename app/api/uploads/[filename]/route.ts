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

function getFallbackSvg(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('banner')) {
    return (
      BUILT_IN_SVG_SAMPLES['default_banner.svg'] ||
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
        <rect width="1200" height="400" fill="#c2410c"/>
        <text x="600" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="#ffffff">Kenny's Premium Palm Oil</text>
      </svg>`
    );
  }

  // Fallback palm oil bottle svg
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" fill="#fff7ed"/>
    <circle cx="250" cy="250" r="190" fill="#ffedd5"/>
    <!-- Bottle body -->
    <rect x="170" y="140" width="160" height="260" rx="18" fill="#c2410c"/>
    <!-- Cap -->
    <rect x="220" y="85" width="60" height="40" rx="6" fill="#f97316"/>
    <rect x="235" y="125" width="30" height="15" fill="#ea580c"/>
    <!-- Label -->
    <rect x="190" y="210" width="120" height="120" rx="8" fill="#ffffff"/>
    <rect x="198" y="220" width="104" height="22" rx="4" fill="#ea580c"/>
    <text x="250" y="235" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#ffffff">KENNY'S PREMIUM</text>
    <text x="250" y="275" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#9a3412">PURE RED</text>
    <text x="250" y="300" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#c2410c">PALM OIL</text>
    <text x="250" y="318" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="600" fill="#78350f">100% UNADULTERATED</text>
  </svg>`;
}

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

    // 5. Fallback for any missing or previously uploaded images (e.g. img_1791638740857_d8641a5487d3.jpeg)
    // Return a pristine fallback image so the UI never displays broken icons or 404s
    const fallbackSvg = getFallbackSvg(safeFilename);
    return new NextResponse(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Error serving upload:', err);
    return new NextResponse(getFallbackSvg('fallback.svg'), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  }
}
