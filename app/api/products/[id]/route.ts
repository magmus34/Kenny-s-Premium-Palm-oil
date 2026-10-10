import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct, deleteProduct, isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = getProductById(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching product';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = getProductById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, price, quantity, description, category, imageUrl } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Product name cannot be empty' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (price !== undefined) {
      const cleanedPriceStr = String(price ?? '').replace(/[^0-9.]/g, '');
      const numericPrice = Number(cleanedPriceStr);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return NextResponse.json({ success: false, error: 'Valid price greater than ₦0 is required' }, { status: 400 });
      }
      updates.price = numericPrice;
    }

    if (quantity !== undefined) {
      const qNum = Number(quantity);
      updates.quantity = isNaN(qNum) || qNum < 0 ? 100 : Math.floor(qNum);
    }

    if (description !== undefined) {
      if (!description || typeof description !== 'string' || !description.trim()) {
        return NextResponse.json({ success: false, error: 'Description cannot be empty' }, { status: 400 });
      }
      updates.description = description.trim();
    }

    if (category !== undefined) {
      updates.category = String(category).trim();
    }

    if (imageUrl !== undefined) {
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
        return NextResponse.json({ success: false, error: 'Image URL cannot be empty' }, { status: 400 });
      }
      if (imageUrl.startsWith('data:image/')) {
        return NextResponse.json({
          success: false,
          error: 'Raw base64 images cannot be saved directly. Please use the image upload button to upload an image file.',
        }, { status: 400 });
      }
      updates.imageUrl = imageUrl.trim();
    }

    if (body.isPublished !== undefined) {
      updates.isPublished = Boolean(body.isPublished);
    }

    if (body.sortOrder !== undefined) {
      const sNum = Number(body.sortOrder);
      updates.sortOrder = isNaN(sNum) ? 0 : sNum;
    }

    const updated = updateProduct(id, updates);
    return NextResponse.json({ success: true, product: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update product';
    console.error('Error updating product:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Product not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete product';
    console.error('Error deleting product:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
