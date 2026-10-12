'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Building2, AlertCircle, Loader2, ArrowLeft, Send, ShoppingBag } from 'lucide-react';
import { CartItem, StoreSettings } from '@/lib/types';
import { CustomerFormData } from './GuestCheckoutModal';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCustomerInfo: () => void;
  cart: CartItem[];
  customerData: CustomerFormData;
  settings: StoreSettings;
  onOrderSuccess: (orderData: {
    orderId: string;
    whatsappUrl: string;
    total: number;
    customerName: string;
    customerLocation: string;
    customerWhatsApp: string;
    items: CartItem[];
  }) => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  onBackToCustomerInfo,
  cart,
  customerData,
  settings,
  onOrderSuccess,
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCopyAccountNumber = () => {
    if (settings.accountNumber) {
      navigator.clipboard.writeText(settings.accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2500);
    }
  };

  const handleOrderOnWhatsApp = async () => {
    setErrorMessage(null);

    // 1. Validate that order and customer information are available
    if (!customerData.name || !customerData.location || !customerData.whatsapp) {
      setErrorMessage('Customer contact information is missing. Please go back and re-enter your details.');
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add products to cart before placing an order.');
      return;
    }

    setIsSavingOrder(true);

    try {
      // 2. Save the order to the database
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerData.name,
          customerLocation: customerData.location,
          customerWhatsApp: customerData.whatsapp,
          items: cart,
        }),
      });

      const data = await response.json();

      // 3. Confirm that the order was successfully saved
      if (!response.ok || !data.success || !data.order?.orderId) {
        throw new Error(data.error || 'Failed to record order in the database. Please try again.');
      }

      // 4. Open WhatsApp with pre-formatted message
      if (data.whatsappUrl) {
        try {
          window.open(data.whatsappUrl, '_blank');
        } catch (e) {
          console.warn('Popup blocked by browser:', e);
        }
      }

      // 5. Notify parent to show "Order Ready" confirmation pop-up
      onOrderSuccess({
        orderId: data.order.orderId,
        whatsappUrl: data.whatsappUrl,
        total: data.order.total,
        customerName: data.order.customerName,
        customerLocation: data.order.customerLocation,
        customerWhatsApp: data.order.customerWhatsApp,
        items: cart,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save order to database';
      setErrorMessage(msg);
    } finally {
      setIsSavingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToCustomerInfo}
              disabled={isSavingOrder}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
              title="Back to Customer Info"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Payment Details
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Bank Transfer &amp; WhatsApp Order Placement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSavingOrder}
            className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Summary Bar */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <span className="text-stone-400">Ordering for: </span>
              <strong className="text-stone-800">{customerData.name}</strong>
              <span className="text-stone-500"> ({customerData.location})</span>
            </div>
            <button
              onClick={onBackToCustomerInfo}
              className="text-orange-600 hover:underline font-bold shrink-0 text-xs cursor-pointer"
            >
              Edit Details
            </button>
          </div>

          {/* BANK ACCOUNT INFORMATION (Loaded live from Database / Store Settings) */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-orange-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Official Store Bank Account</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-orange-200/70 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">Bank Name:</span>
                <span className="font-bold text-stone-900 text-sm">
                  {settings.bankName || 'Opay'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">Account Name:</span>
                <span className="font-bold text-stone-900 text-sm">
                  {settings.accountName || 'Samson Kehinde Favour'}
                </span>
              </div>

              {/* Prominent Account Number with Copy Button */}
              <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-stone-500 block">Account Number:</span>
                  <span className="text-xl sm:text-2xl font-mono font-black text-orange-700 tracking-wider">
                    {settings.accountNumber || '7014685873'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyAccountNumber}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  {copiedAccount ? (
                    <>
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                      <span>Account number copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Account Number</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Simple Instructions */}
            <p className="text-xs text-orange-950 font-medium leading-relaxed bg-orange-100/60 p-3 rounded-xl border border-orange-200/60">
              Please make your payment to the account details above. After making the transfer, click the button below to send your order through WhatsApp.
            </p>
          </div>

          {/* ORDER SUMMARY */}
          <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                <span>Order Summary</span>
              </span>
              <span>{cart.length} Product(s)</span>
            </div>

            <div className="divide-y divide-stone-200/60 max-h-40 overflow-y-auto pr-1 text-xs">
              {cart.map((item) => (
                <div key={item.id} className="py-2 flex justify-between items-center text-stone-800">
                  <div className="truncate pr-3">
                    <span className="font-bold">{item.name}</span>
                    <span className="text-stone-400 block text-[11px]">
                      Qty: {item.quantity} × ₦{item.price.toLocaleString()}
                    </span>
                  </div>
                  <span className="font-black text-stone-900 shrink-0">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-stone-500 block font-medium">Total Amount:</span>
                <span className="text-2xl font-black text-orange-600">
                  ₦{total.toLocaleString()}
                </span>
              </div>
              <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-2.5 py-1 rounded-full">
                Payment: Bank Transfer
              </span>
            </div>
          </div>
        </div>

        {/* Footer with "Order on WhatsApp" Button */}
        <div className="p-5 border-t border-stone-100 bg-stone-50/70 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleOrderOnWhatsApp}
            disabled={isSavingOrder}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-base shadow-lg shadow-orange-600/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.99] cursor-pointer"
          >
            {isSavingOrder ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Order to Database...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Order on WhatsApp (₦{total.toLocaleString()})</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-stone-400">
            Clicking will save your order to the database, generate your Order Reference, and open WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};
