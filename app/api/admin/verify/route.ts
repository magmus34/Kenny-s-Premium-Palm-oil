import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminSession, extractTokenFromRequest } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const isValid = isValidAdminSession(token);
    return NextResponse.json({ success: true, authenticated: isValid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification error';
    return NextResponse.json({ success: false, authenticated: false, error: message }, { status: 500 });
  }
}
