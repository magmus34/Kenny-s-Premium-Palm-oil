import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminSession } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    const trimmedPassword = password.trim();
    const isValid = verifyAdminPassword(trimmedPassword) || verifyAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect store owner password. Default password is palmoil2025.',
        },
        { status: 401 }
      );
    }

    const token = createAdminSession();

    const response = NextResponse.json({
      success: true,
      message: 'Admin authenticated successfully',
      token,
    });

    // Set cookie: works for both HTTPS (Vercel production) and local dev
    response.cookies.set({
      name: 'admin_token',
      value: token,
      httpOnly: false, // Accessible to client for header auth as well
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
