'use client';

import React, { useState, useEffect } from 'react';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';
import { StoreSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [settings, setSettings] = useState<StoreSettings>({
    businessName: "Kenny's Premium Palm oil",
    banner: '/api/uploads/default_banner.svg',
    bannerSubtitle: '100% Unadulterated, Freshly Milled Nigerian Red Palm Oil from Edo & Delta Plantations',
    whatsappName: "Kenny's Premium Palm oil",
    whatsappNumber: '2347014685873',
    bankName: 'Opay',
    accountName: 'Samson Kehinde Favour',
    accountNumber: '7014685873',
  });

  // Check existing session
  useEffect(() => {
    const verifySession = async () => {
      try {
        // Fetch current settings for brand display
        const setRes = await fetch('/api/settings', { cache: 'no-store' });
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
          setSettings(setData.settings);
        }

        const storedToken = localStorage.getItem('oroma_admin_token');
        if (!storedToken) {
          setIsVerifying(false);
          return;
        }

        const res = await fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${storedToken}` },
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.success && data.authenticated) {
          setToken(storedToken);
        } else if (data.authenticated === false) {
          localStorage.removeItem('oroma_admin_token');
          document.cookie = 'admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setToken(null);
        } else {
          // If server responded with a non-401 error or format issue, keep token
          setToken(storedToken);
        }
      } catch (e) {
        console.error('Session verify error:', e);
        // Do not immediately wipe token on transient network hiccup
        const localTok = localStorage.getItem('oroma_admin_token');
        if (localTok) {
          setToken(localTok);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('oroma_admin_token', newToken);
    try {
      document.cookie = `admin_token=${encodeURIComponent(newToken)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {
      // Ignore cookie write errors if in strict context
    }
    setToken(newToken);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      }
    } catch (e) {
      console.warn('Logout error', e);
    } finally {
      localStorage.removeItem('oroma_admin_token');
      try {
        document.cookie = 'admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      } catch {
      }
      setToken(null);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
        <span className="text-xs text-stone-400 font-semibold tracking-wider uppercase">
          Verifying Owner Authentication...
        </span>
      </div>
    );
  }

  if (!token) {
    return (
      <AdminLogin
        businessName={settings.businessName}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <AdminDashboard
      token={token}
      onLogout={handleLogout}
      initialSettings={settings}
    />
  );
}
