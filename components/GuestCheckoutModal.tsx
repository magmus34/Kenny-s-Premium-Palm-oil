'use client';

import React, { useState } from 'react';
import { X, User, MapPin, Phone, ArrowRight, AlertCircle, ShoppingBag } from 'lucide-react';
import { CartItem } from '@/lib/types';

export interface CustomerFormData {
  name: string;
  location: string;
  whatsapp: string;
}

interface GuestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  customerData: CustomerFormData;
  onContinueToPayment: (data: CustomerFormData) => void;
}

export const GuestCheckoutModal: React.FC<GuestCheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  customerData,
  onContinueToPayment,
}) => {
  const [name, setName] = useState(customerData.name || '');
  const [location, setLocation] = useState(customerData.location || '');
  const [whatsapp, setWhatsapp] = useState(customerData.whatsapp || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const trimmedWhatsapp = whatsapp.trim();

    if (!trimmedName) {
      setValidationError('Please enter your Customer Name to continue.');
      return;
    }

    if (!trimmedLocation) {
      setValidationError('Please enter your Customer Location / City / State.');
      return;
    }

    if (!trimmedWhatsapp) {
      setValidationError('Please enter your Customer WhatsApp Number.');
      return;
    }

    // Pass validated data to open the Payment Details modal
    onContinueToPayment({
      name: trimmedName,
      location: trimmedLocation,
      whatsapp: trimmedWhatsapp,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Guest Checkout
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              No account required. Please provide your contact details for delivery.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Quick cart badge */}
          <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-orange-900 font-semibold">
              <ShoppingBag className="w-4 h-4 text-orange-600" />
              <span>Ordering {cart.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
            </div>
            <span className="font-black text-stone-900 text-sm">
              ₦{total.toLocaleString()}
            </span>
          </div>

          {/* ONLY 3 CUSTOMER FIELDS */}
          <div className="space-y-4">
            {/* 1. Customer Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-600" />
                <span>1. Customer Name *</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Adesanya Ayanfe"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold text-stone-900 placeholder:text-stone-400 placeholder:font-normal"
              />
            </div>

            {/* 2. Customer Location */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span>2. Customer Location / City / State *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ibadan, Oyo State / Ikeja, Lagos"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold text-stone-900 placeholder:text-stone-400 placeholder:font-normal"
              />
            </div>

            {/* 3. Customer WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-600" />
                <span>3. Customer WhatsApp Number *</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 08012345678 or +234..."
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold text-stone-900 placeholder:text-stone-400 placeholder:font-normal"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Your order receipt and delivery updates will be sent to this WhatsApp number.
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm shadow-lg shadow-orange-600/25 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[11px] text-stone-400 mt-2">
              Next step: Official bank transfer account details and order summary.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
