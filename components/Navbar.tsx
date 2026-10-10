'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, ShieldCheck, Droplet, Phone } from 'lucide-react';

interface NavbarProps {
  businessName: string;
  whatsappNumber: string;
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  businessName,
  whatsappNumber,
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Logo / Brand Name */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-md shadow-orange-500/20 text-white group-hover:scale-105 transition-transform">
              <Droplet className="w-6 h-6 fill-white stroke-orange-200" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl text-stone-900 tracking-tight block leading-tight group-hover:text-orange-600 transition-colors">
                {businessName || 'Oroma Palm Oil'}
              </span>
              <span className="text-[11px] font-semibold text-orange-600 tracking-wider uppercase">
                Pure Natural Palm Oil
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search palm oil by litres, kegs, drums..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-100 hover:bg-stone-50 focus:bg-white text-stone-800 text-sm rounded-full border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-orange-600" />
                <span>Help</span>
              </a>
            )}

            <Link
              href="/admin"
              className="text-xs text-stone-600 hover:text-orange-600 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
              title="Store Owner Portal"
            >
              <ShieldCheck className="w-4 h-4 text-stone-500" />
              <span className="hidden sm:inline font-semibold">Owner</span>
            </Link>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-orange-600/20 transition-all hover:shadow-lg hover:shadow-orange-600/30 active:scale-95"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-bold">Cart</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-black bg-white text-orange-700 rounded-full shadow-xs">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="pb-3 md:hidden">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search palm oil bottles, kegs, drums..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 focus:bg-white text-stone-800 text-sm rounded-full border border-stone-200 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
