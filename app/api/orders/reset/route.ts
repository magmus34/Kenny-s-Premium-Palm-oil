import { NextRequest, NextResponse } from 'next/server';
import { resetOrders, isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const resetSuccess = resetOrders();
    return NextResponse.json({
      success: resetSuccess,
      message: 'All order records and sales summary data have been cleared.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
