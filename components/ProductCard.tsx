'use client';

import React from 'react';
import { Product } from '@/lib/types';
import { ShoppingBag, Check, Eye } from 'lucide-react';

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
  return (
    <div className="group bg-white rounded-2xl border border-stone-200/90 hover:border-orange-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image Area */}
      <div
        onClick={() => onViewDetails(product)}
        className="relative w-full aspect-square bg-stone-50 overflow-hidden cursor-pointer flex items-center justify-center p-4"
      >
        <img
          src={product.imageUrl || '/api/uploads/sample_1l.svg'}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

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
            title={product.name}
          >
            {product.name}
          </h3>

          <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs text-stone-400 block font-medium">Price</span>
            <span className="text-lg font-black text-stone-900">
              ₦{product.price.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
              quantityInCart > 0
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
            }`}
          >
            {quantityInCart > 0 ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>In Cart ({quantityInCart})</span>
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
