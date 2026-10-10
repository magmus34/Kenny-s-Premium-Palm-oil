import { NextRequest, NextResponse } from 'next/server';
import { changeAdminPassword, isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters long' }, { status: 400 });
    }

    const updated = changeAdminPassword(currentPassword, newPassword);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Admin password changed successfully. Please log in with your new password.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to change password';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
