import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createProduct, isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    const products = getAllProducts(includeAll);
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch products';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session expired. Please log in again.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, price, quantity, description, category, imageUrl, isPublished, sortOrder } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    // Clean price string of commas or currency symbols like ₦
    const cleanedPriceStr = String(price ?? '').replace(/[^0-9.]/g, '');
    const numericPrice = Number(cleanedPriceStr);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json({ success: false, error: 'A valid price greater than ₦0 is required' }, { status: 400 });
    }

    // Parse quantity
    const qtyNum = Number(quantity);
    const finalQuantity = isNaN(qtyNum) || qtyNum < 0 ? 100 : Math.floor(qtyNum);

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ success: false, error: 'Product description is required' }, { status: 400 });
    }

    // Default image if none provided
    const finalImageUrl = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) 
      ? imageUrl.trim() 
      : '/api/uploads/sample_5l.svg';

    // Safety check: do NOT allow raw bulky base64 data to be saved as the imageUrl
    if (finalImageUrl.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        error: 'Raw base64 images cannot be saved directly. Please use the image upload button to upload the image file properly.',
      }, { status: 400 });
    }

    const newProduct = createProduct({
      name: name.trim(),
      price: numericPrice,
      quantity: finalQuantity,
      description: description.trim(),
      category: (category || 'Palm Oil').trim(),
      imageUrl: finalImageUrl,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create product';
    console.error('Error creating product:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
