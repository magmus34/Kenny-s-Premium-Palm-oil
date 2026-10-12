import { NextRequest, NextResponse } from 'next/server';
import {
  fetchStoreSettingsAsync,
  updateStoreSettingsAsync,
  isValidAdminSession,
  extractTokenFromRequest,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await fetchStoreSettingsAsync();
    return NextResponse.json(
      { success: true, settings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessName,
      banner,
      bannerSubtitle,
      whatsappName,
      whatsappNumber,
      bankName,
      accountName,
      accountNumber,
    } = body;

    const updates: Record<string, string> = {};

    if (businessName !== undefined) {
      if (!businessName.trim()) {
        return NextResponse.json({ success: false, error: 'Store/Business name cannot be empty' }, { status: 400 });
      }
      updates.businessName = businessName.trim();
    }

    if (banner !== undefined) {
      updates.banner = banner.trim();
    }

    if (bannerSubtitle !== undefined) {
      updates.bannerSubtitle = bannerSubtitle.trim();
    }

    if (whatsappName !== undefined) {
      updates.whatsappName = whatsappName.trim();
    }

    if (whatsappNumber !== undefined) {
      // Clean phone number: remove spaces and dashes
      const cleanPhone = whatsappNumber.replace(/[\s-]/g, '');
      if (!cleanPhone) {
        return NextResponse.json({ success: false, error: 'WhatsApp number cannot be empty' }, { status: 400 });
      }
      updates.whatsappNumber = cleanPhone;
    }

    if (bankName !== undefined) {
      if (!bankName.trim()) {
        return NextResponse.json({ success: false, error: 'Bank name cannot be empty' }, { status: 400 });
      }
      updates.bankName = bankName.trim();
    }

    if (accountName !== undefined) {
      if (!accountName.trim()) {
        return NextResponse.json({ success: false, error: 'Account name cannot be empty' }, { status: 400 });
      }
      updates.accountName = accountName.trim();
    }

    if (accountNumber !== undefined) {
      if (!accountNumber.trim()) {
        return NextResponse.json({ success: false, error: 'Account number cannot be empty' }, { status: 400 });
      }
      updates.accountNumber = accountNumber.trim();
    }

    const updated = await updateStoreSettingsAsync(updates);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update store settings';
    console.error('Error updating settings:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
