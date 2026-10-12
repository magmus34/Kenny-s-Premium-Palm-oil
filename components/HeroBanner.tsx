'use client';

import React from 'react';
import { Droplets, CheckCircle2, ShieldCheck, Truck, ArrowDown } from 'lucide-react';

interface HeroBannerProps {
  businessName: string;
  bannerUrl: string;
  bannerSubtitle: string;
  onBrowseClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  businessName,
  bannerUrl,
  bannerSubtitle,
  onBrowseClick,
}) => {
  const [bannerError, setBannerError] = React.useState(false);

  return (
    <section className="relative overflow-hidden bg-stone-900 text-white">
      {/* Banner Background Image or Graphic */}
      <div className="absolute inset-0 z-0">
        {bannerUrl && !bannerError ? (
          <img
            src={bannerUrl}
            alt={businessName}
            className="w-full h-full object-cover object-center opacity-40 brightness-90 transform scale-105 transition-transform duration-700"
            onError={() => setBannerError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-950 via-stone-900 to-amber-950 opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
        <div className="max-w-3xl">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/30 border border-orange-400/40 text-orange-200 text-xs sm:text-sm font-semibold mb-6 backdrop-blur-xs">
            <Droplets className="w-4 h-4 text-orange-400" />
            <span>Guaranteed 100% Natural Nigerian Palm Oil • Zero Coloring or Additives</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Fresh, Rich &amp; Unadulterated{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              {businessName || 'Golden Palm Oil'}
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-xl text-stone-200 font-normal leading-relaxed">
            {bannerSubtitle ||
              'Milled directly from ripe palm fruit bunches. Clean, thick, and aromatic red palm oil packaged in food-grade bottles, kegs, and commercial jerrycans for homes, caterers, and wholesale distributors.'}
          </p>

          {/* Action Button */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={onBrowseClick}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Explore Palm Oil Sizes</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>

          {/* Value Highlights */}
          <div className="mt-12 pt-8 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-stone-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Zero Artificial Coloring</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Tamper-Proof Sealed Kegs</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Truck className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Nationwide Delivery &amp; Pickup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
