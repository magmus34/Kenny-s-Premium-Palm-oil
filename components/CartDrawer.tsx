'use client';

import React from 'react';
import { CartItem, Product } from '@/lib/types';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  availableProducts?: Product[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  availableProducts,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  // Validate items against authoritative available products if available
  const validatedCartItems = cart.map((item) => {
    const liveProd = availableProducts?.find((p) => p.id === item.id);
    const isUnavailable = Boolean(availableProducts && (!liveProd || liveProd.isPublished === false));
    const currentPrice = liveProd ? liveProd.price : item.price;
    return {
      ...item,
      price: currentPrice,
      isUnavailable,
    };
  });

  const hasUnavailableItems = validatedCartItems.some((item) => item.isUnavailable);
  const total = validatedCartItems.reduce(
    (sum, item) => sum + (item.isUnavailable ? 0 : item.price * item.quantity),
    0
  );
  const totalUnits = validatedCartItems.reduce(
    (sum, item) => sum + (item.isUnavailable ? 0 : item.quantity),
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-black text-stone-900">Your Shopping Cart</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {totalUnits} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-stone-800">Your cart is empty</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-xs">
                  Browse our pure Nigerian red palm oil collection and add your preferred sizes.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {hasUnavailableItems && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Some items in your cart are no longer available in the store. Please remove them to proceed.</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-stone-500 pb-1">
                  <span>Selected Products</span>
                  <button
                    onClick={onClearCart}
                    className="text-stone-400 hover:text-red-600 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                </div>

                {validatedCartItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex gap-3 transition-colors ${
                      item.isUnavailable
                        ? 'bg-red-50/50 border-red-200'
                        : 'bg-stone-50/70 hover:bg-stone-50 border-stone-200/80'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-white p-1 border border-stone-100 flex items-center justify-center shrink-0">
                      <img
                        src={item.imageUrl || '/api/uploads/sample_1l.svg'}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/api/uploads/sample_1l.svg';
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                            {item.name}
                          </h4>
                          {item.isUnavailable && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              Item Removed or Unavailable
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-stone-400 hover:text-red-500 p-0.5 cursor-pointer"
                          title="Remove product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs font-semibold text-orange-600">
                        ₦{item.price.toLocaleString()} each
                      </div>

                      {/* Quantity & Subtotal */}
                      {!item.isUnavailable ? (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="px-2 py-0.5 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-bold text-stone-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="px-2 py-0.5 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-black text-stone-900">
                            ₦{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="mt-2 text-xs font-bold text-red-600 hover:underline text-left cursor-pointer"
                        >
                          Click to remove from cart
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-stone-50/50 space-y-4">
              <div className="space-y-1.5 text-xs text-stone-500">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-800">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Payment Method</span>
                  <span className="font-semibold text-orange-700">Bank Transfer Only</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-black text-stone-900 pt-2 border-t border-stone-200">
                  <span>Total Amount</span>
                  <span className="text-orange-600">₦{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200 text-[11px] text-orange-800 leading-tight">
                🔒 <strong>No Customer Account Required:</strong> You will review your order and pay directly via bank transfer.
              </div>

              <button
                onClick={onProceedToCheckout}
                disabled={hasUnavailableItems}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all ${
                  hasUnavailableItems
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white shadow-lg shadow-orange-600/25 active:scale-[0.99] cursor-pointer'
                }`}
              >
                <span>Proceed to Guest Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
