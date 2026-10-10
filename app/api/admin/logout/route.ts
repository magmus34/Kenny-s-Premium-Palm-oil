import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession, extractTokenFromRequest } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (token) {
      clearAdminSession(token);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('admin_token');
    response.cookies.set({
      name: 'admin_token',
      value: '',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Logout error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
