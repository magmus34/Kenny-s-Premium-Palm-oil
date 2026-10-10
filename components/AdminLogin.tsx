'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Droplet, Lock, Loader2, ArrowLeft, AlertCircle, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  businessName: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  businessName,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setErrorMessage('Please enter the store owner password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: cleanPassword }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid admin credentials');
      }

      onLoginSuccess(data.token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDefaultPassword = () => {
    setPassword('palmoil2025');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Back to store */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shopping Website</span>
        </Link>

        {/* Brand Icon */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-600/30 text-white">
            <Droplet className="w-7 h-7 fill-white stroke-orange-200" />
          </div>
        </div>

        <h2 className="text-center text-2xl sm:text-3xl font-black text-white tracking-tight">
          Store Owner Portal
        </h2>
        <p className="mt-1 text-center text-xs text-stone-400">
          Authorized store administrator access for {businessName || "Kenny's Premium Palm oil"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-stone-800/90 border border-stone-700/80 rounded-3xl py-8 px-6 sm:px-10 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-orange-400" />
                <span>Store Owner Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-stone-900 border border-stone-700 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all placeholder:text-stone-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1 rounded-lg transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Quick autofill helper */}
          <div className="mt-6 pt-5 border-t border-stone-700/70 text-center">
            <button
              type="button"
              onClick={handleFillDefaultPassword}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-700/80 border border-stone-700 text-xs text-stone-300 transition-colors cursor-pointer group"
            >
              <KeyRound className="w-3.5 h-3.5 text-orange-400 group-hover:rotate-12 transition-transform" />
              <span>Fill default password: </span>
              <code className="text-orange-400 font-mono font-bold bg-stone-950 px-1.5 py-0.5 rounded">palmoil2025</code>
            </button>
            <p className="text-[11px] text-stone-500 mt-2">
              (You can change or customize your password anytime in Store Settings)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
