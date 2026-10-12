'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { ShoppingBag, Check, Eye, ImageOff } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  quantityInCart,
  onAddToCart,
  onViewDetails,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error whenever image URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [product.imageUrl, product.id]);

  const targetImage = product.imageUrl || '/api/uploads/sample_1l.svg';

  return (
    <div className="group bg-white rounded-2xl border border-stone-200/90 hover:border-orange-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image Area */}
      <div
        onClick={() => onViewDetails(product)}
        className="relative w-full aspect-square bg-stone-50 overflow-hidden cursor-pointer flex items-center justify-center p-4"
      >
        {!imageError ? (
          <img
            key={targetImage}
            src={targetImage}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            decoding="async"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-orange-50/50 rounded-xl border border-orange-100">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
              <ImageOff className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-stone-700">{product.name}</p>
            <span className="text-[10px] text-stone-400 mt-1">Photo pending re-upload</span>
          </div>
        )}

        {/* Category & Stock Pill */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
          <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-orange-100 text-orange-800 border border-orange-200/60 shadow-xs">
            {product.category || 'Palm Oil'}
          </span>
          {product.quantity !== undefined && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-900/80 text-white backdrop-blur-xs">
              {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
            </span>
          )}
        </div>

        {/* Quick View Hover overlay */}
        <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-stone-900 text-xs font-semibold shadow-md">
            <Eye className="w-3.5 h-3.5 text-orange-600" />
            Quick View
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onViewDetails(product)}
            className="font-bold text-base text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1 cursor-pointer"
          >
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-stone-500 line-clamp-2">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 block">
              Price
            </span>
            <span className="text-lg font-extrabold text-stone-900">
              ₦{product.price.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              quantityInCart > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-orange-600/20 hover:shadow-md'
            }`}
          >
            {quantityInCart > 0 ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{quantityInCart} in Cart</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
