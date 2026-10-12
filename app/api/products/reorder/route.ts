import { NextRequest, NextResponse } from 'next/server';
import { reorderProducts, isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ success: false, error: 'orderedIds array is required' }, { status: 400 });
    }

    const updatedProducts = reorderProducts(orderedIds);
    return NextResponse.json({ success: true, products: updatedProducts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reorder products';
    console.error('Reorder error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
