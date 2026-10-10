'use client';

import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, Copy, Check, ArrowRight, Building2, Droplets } from 'lucide-react';
import { StoreSettings } from '@/lib/types';

interface OrderReadyModalProps {
  orderData: {
    orderId: string;
    whatsappUrl: string;
    total: number;
    customerName: string;
    customerLocation: string;
    customerWhatsApp: string;
  } | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const OrderReadyModal: React.FC<OrderReadyModalProps> = ({
  orderData,
  settings,
  onClose,
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!orderData) return null;

  const copyAccountNumber = () => {
    if (settings.accountNumber) {
      navigator.clipboard.writeText(settings.accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-6 sm:p-8 text-center space-y-6">
          {/* Success Check Icon */}
          <div className="mx-auto w-18 h-18 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest bg-orange-100 px-3 py-1 rounded-full">
              Order #{orderData.orderId}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mt-3 tracking-tight">
              Order Ready
            </h2>
            <p className="text-sm text-stone-600 mt-2 font-medium leading-relaxed max-w-md mx-auto">
              Your order has been prepared. Please send the WhatsApp message to complete your order.
            </p>
          </div>

          {/* Quick Recap */}
          <div className="bg-stone-50 rounded-2xl p-4 text-left border border-stone-200/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Customer:</span>
              <span className="font-bold text-stone-900">{orderData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Location:</span>
              <span className="font-semibold text-stone-800">{orderData.customerLocation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">WhatsApp:</span>
              <span className="font-semibold text-stone-800">{orderData.customerWhatsApp}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-stone-200 text-sm">
              <span className="font-bold text-stone-900">Total Amount:</span>
              <span className="font-black text-orange-600">
                ₦{orderData.total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Bank Transfer Recap */}
          <div className="bg-orange-50/70 rounded-2xl p-4 text-left border border-orange-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-orange-950">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Bank Transfer Details:</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Bank:</span>
              <span className="font-bold">{settings.bankName || 'Zenith Bank PLC'}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Account Name:</span>
              <span className="font-bold">{settings.accountName || 'Oroma Palm Oil Ventures'}</span>
            </div>
            <div className="flex justify-between items-center text-stone-700 pt-1 border-t border-orange-200/70">
              <span>Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-orange-800">
                  {settings.accountNumber || '1018942365'}
                </span>
                <button
                  type="button"
                  onClick={copyAccountNumber}
                  className="px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedAccount ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {orderData.whatsappUrl && (
              <a
                href={orderData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Send WhatsApp Order Message</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Back to Store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
