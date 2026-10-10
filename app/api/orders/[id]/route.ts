import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, isValidAdminSession, extractTokenFromRequest, Order } from '@/lib/db';

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
    const body = await request.json();
    const { orderStatus, paymentStatus } = body;

    const allowedStatuses: Order['orderStatus'][] = ['Pending', 'Confirmed', 'Delivered'];
    if (orderStatus && !allowedStatuses.includes(orderStatus)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
      }, { status: 400 });
    }

    const updated = updateOrderStatus(id, orderStatus, paymentStatus);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
