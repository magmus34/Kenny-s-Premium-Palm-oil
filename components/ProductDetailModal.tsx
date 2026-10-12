'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { X, ShoppingBag, ShieldCheck, Sparkles, Plus, Minus, ArrowRight } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCartWithQty: (product: Product, quantity: number) => void;
  onProceedToCheckout?: (product: Product, quantity: number) => void;
  cartQuantity: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCartWithQty,
  onProceedToCheckout,
  cartQuantity,
}) => {
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [imageError, setImageError] = useState<boolean>(false);

  if (!product) return null;

  const handleProceedToCheckout = () => {
    if (onProceedToCheckout) {
      onProceedToCheckout(product, selectedQty);
    } else {
      onAddToCartWithQty(product, selectedQty);
      onClose();
    }
  };

  const handleAddOnly = () => {
    onAddToCartWithQty(product, selectedQty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-center">
            {/* Image container */}
            <div className="relative aspect-square bg-stone-50 rounded-2xl p-6 flex items-center justify-center border border-stone-100">
              {!imageError ? (
                <img
                  src={product.imageUrl || '/api/uploads/sample_1l.svg'}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-orange-50/60 rounded-xl border border-orange-100">
                  <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2 font-black text-xl">
                    ₦
                  </div>
                  <p className="text-sm font-bold text-stone-800">{product.name}</p>
                  <span className="text-xs text-stone-500 mt-1">Photo pending re-upload</span>
                </div>
              )}
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {product.category || 'Palm Oil'}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-snug">
                  {product.name}
                </h2>

                <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-orange-600">
                    ₦{product.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-stone-400 font-medium">per unit</span>
                  {product.quantity !== undefined && (
                    <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                      Stock: {product.quantity} units available
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Description &amp; Specifications
                  </h4>
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>

                {/* Badges */}
                <div className="mt-4 space-y-1.5 text-xs text-stone-600 bg-orange-50/70 p-3 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2 text-orange-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Tested Pure: No Sudan IV dye or chemical adulterants</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-600">
                    <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>High vitamin E &amp; natural carotenes preserved</span>
                  </div>
                </div>
              </div>

              {/* Quantity Selector and Add Button */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-700">Quantity</span>
                  <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                    <button
                      onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                      disabled={selectedQty <= 1}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-1 text-sm font-bold text-stone-900 min-w-8 text-center">
                      {selectedQty}
                    </span>
                    <button
                      onClick={() => setSelectedQty((q) => q + 1)}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                  <span>Subtotal:</span>
                  <span className="text-sm font-bold text-stone-900">
                    ₦{(product.price * selectedQty).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold shadow-lg shadow-orange-600/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    Proceed to Guest Checkout • ₦{(product.price * selectedQty).toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleAddOnly}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                  <span>Add to Cart &amp; Continue Shopping</span>
                </button>

                {cartQuantity > 0 && (
                  <p className="text-center text-xs text-orange-600 font-medium">
                    (You already have {cartQuantity} unit(s) of this item in your cart)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
