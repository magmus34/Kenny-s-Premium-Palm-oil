import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UPLOADS_DIR, TMP_UPLOADS_DIR, isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

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
    if (file.name && path.extname(file.name)) {
      ext = path.extname(file.name).toLowerCase();
      if (!ext.startsWith('.')) ext = '.' + ext;
    } else if (file.type === 'image/png') ext = '.png';
    else if (file.type === 'image/webp') ext = '.webp';
    else if (file.type === 'image/gif') ext = '.gif';
    else if (file.type === 'image/svg+xml') ext = '.svg';
    else if (file.type === 'image/jpeg') ext = '.jpg';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueId = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const filename = `img_${uniqueId}${ext}`;

    let saved = false;
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      const destination = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(destination, buffer);
      saved = true;
    } catch {
      // Primary uploads directory read-only on Vercel, save to TMP_UPLOADS_DIR
      try {
        if (!fs.existsSync(TMP_UPLOADS_DIR)) {
          fs.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });
        }
        const tmpDestination = path.join(TMP_UPLOADS_DIR, filename);
        fs.writeFileSync(tmpDestination, buffer);
        saved = true;
      } catch (tmpErr) {
        console.error('Failed to save to tmp uploads:', tmpErr);
      }
    }

    if (!saved) {
      throw new Error('Could not persist uploaded file to storage');
    }

    const fileUrl = `/api/uploads/${filename}`;
    return NextResponse.json({
      success: true,
      url: fileUrl,
      size: file.size,
      filename,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('File upload error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
