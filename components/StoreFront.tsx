'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Product, StoreSettings } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { CartDrawer } from '@/components/CartDrawer';
import { GuestCheckoutModal } from '@/components/GuestCheckoutModal';
import { PaymentDetailsModal } from '@/components/PaymentDetailsModal';
import { OrderReadyModal } from '@/components/OrderReadyModal';
import { useCart, useCustomerInfo } from '@/lib/cart-store';
import {
  Droplets,
  Search,
  Filter,
  Phone,
  ShieldCheck,
  Building2,
  RefreshCw,
  ShoppingBag,
  Truck,
  HeartHandshake,
  CheckCircle,
  AlertCircle,
  PackageOpen,
} from 'lucide-react';
import Link from 'next/link';

interface StoreFrontProps {
  initialProducts: Product[];
  initialSettings: StoreSettings;
  initialDbError?: boolean;
}

// Deep equality checks to prevent unnecessary state updates, DOM reflows and image flickering
function areProductsEqual(a: Product[], b: Product[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p1 = a[i];
    const p2 = b[i];
    if (
      p1.id !== p2.id ||
      p1.name !== p2.name ||
      p1.price !== p2.price ||
      p1.quantity !== p2.quantity ||
      p1.category !== p2.category ||
      p1.imageUrl !== p2.imageUrl ||
      p1.description !== p2.description ||
      p1.isPublished !== p2.isPublished ||
      p1.sortOrder !== p2.sortOrder ||
      p1.updatedAt !== p2.updatedAt
    ) {
      return false;
    }
  }
  return true;
}

function areSettingsEqual(a: StoreSettings, b: StoreSettings): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.businessName === b.businessName &&
    a.banner === b.banner &&
    a.bannerSubtitle === b.bannerSubtitle &&
    a.whatsappNumber === b.whatsappNumber &&
    a.bankName === b.bankName &&
    a.accountNumber === b.accountNumber &&
    a.accountName === b.accountName
  );
}

export function StoreFront({ initialProducts, initialSettings, initialDbError = false }: StoreFrontProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  
  // Loading & Database Status:
  // If we already have products from SSR and no initial error, initial loading is false immediately.
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
    initialDbError || initialProducts.length === 0
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(
    initialDbError ? 'Could not connect to store database' : null
  );

  // In-flight guard to eliminate duplicate concurrent network calls & race conditions
  const isFetchingRef = useRef<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Store-backed cart and customer info (SSR-safe, zero hydration mismatch)
  const { cart, addToCart, updateQuantity, removeItem, clearCart } = useCart();
  const { customerData, saveCustomer } = useCustomerInfo();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isGuestCheckoutOpen, setIsGuestCheckoutOpen] = useState(false);
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
  const [orderReadyData, setOrderReadyData] = useState<{
    orderId: string;
    whatsappUrl: string;
    total: number;
    customerName: string;
    customerLocation: string;
    customerWhatsApp: string;
  } | null>(null);

  // Sync background updates smoothly
  const refreshStoreData = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isManual) setIsRefreshing(true);

    try {
      const [prodRes, setRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      if (prodRes.ok && setRes.ok) {
        const prodData = await prodRes.json();
        const setData = await setRes.json();
        if (prodData?.success && Array.isArray(prodData.products)) {
          setDbError(null);
          setProducts((prev) => areProductsEqual(prev, prodData.products) ? prev : prodData.products);
        } else if (!prodData?.success && products.length === 0) {
          setDbError(prodData?.error || 'Database error loading products');
        }
        if (setData?.success && setData.settings) {
          setSettings((prev) => areSettingsEqual(prev, setData.settings) ? prev : setData.settings);
        }
      } else {
        if (products.length === 0) {
          setDbError('Unable to connect to store database');
        }
      }
    } catch (err) {
      if (products.length === 0) {
        setDbError('Temporary network delay connecting to store database');
      }
    } finally {
      setIsInitialLoading(false);
      if (isManual) setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [products.length]);

  useEffect(() => {
    let isMounted = true;

    const performSync = async () => {
      if (!isMounted || isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const [prodRes, setRes] = await Promise.all([
          fetch('/api/products', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }),
        ]);

        if (prodRes.ok && setRes.ok && isMounted) {
          const prodData = await prodRes.json();
          const setData = await setRes.json();
          if (prodData?.success && Array.isArray(prodData.products)) {
            setDbError(null);
            setProducts((prev) => areProductsEqual(prev, prodData.products) ? prev : prodData.products);
          }
          if (setData?.success && setData.settings) {
            setSettings((prev) => areSettingsEqual(prev, setData.settings) ? prev : setData.settings);
          }
        }
      } catch (err) {
        // Safe silent background catch, never overwrite state on temporary network delay
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
        isFetchingRef.current = false;
      }
    };

    // 1. Fetch fresh products from database on mount if needed
    performSync();

    // 2. Fast background sync on window focus & tab visibility
    const handleFocusSync = () => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        performSync();
      }
    };
    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('visibilitychange', handleFocusSync);

    // 3. Smooth background poll every 6 seconds for instant cross-device and admin sync
    const interval = setInterval(() => {
      if (isMounted && typeof window !== 'undefined' && window.navigator.onLine && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        performSync();
      }
    }, 6000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('visibilitychange', handleFocusSync);
      clearInterval(interval);
    };
  }, []);

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    addToCart(product, quantity);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    updateQuantity(id, delta);
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
  };

  const handleClearCart = () => {
    clearCart();
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    set.add('Palm Oil');
    set.add('Bulk Palm Oil');
    set.add('Packaged Palm Oil');
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToProducts = () => {
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        businessName={settings.businessName}
        whatsappNumber={settings.whatsappNumber}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Hero Banner with live Database Settings */}
      <HeroBanner
        businessName={settings.businessName}
        bannerUrl={settings.banner}
        bannerSubtitle={settings.bannerSubtitle}
        onBrowseClick={scrollToProducts}
      />

      {/* Main Shopping Body */}
      <main id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 flex-1">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-widest bg-orange-100/70 px-3 py-1 rounded-full mb-2">
              <Droplets className="w-3.5 h-3.5" />
              <span>Direct Mill Produce</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Pure Nigerian Palm Oil Collection
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
              Select your required volume below. All products are tested 100% natural and packaged in clean, food-grade containers.
            </p>
          </div>

          {/* Quick Refresh Status */}
          <button
            onClick={() => refreshStoreData(true)}
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Refresh products list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-orange-600" />
            <span>Filter:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-2xs ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Count & Query Info */}
        <div className="mt-4 flex items-center justify-between text-xs text-stone-500 font-medium">
          <div>
            Showing <strong className="text-stone-900">{filteredProducts.length}</strong> product(s)
            {selectedCategory !== 'All' && <span> in <em>{selectedCategory}</em></span>}
            {searchQuery && <span> matching <em>&ldquo;{searchQuery}&rdquo;</em></span>}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-orange-600 hover:underline font-bold"
            >
              Clear Search
            </button>
          )}
        </div>

        {/* Products Grid & State Handling */}
        {isInitialLoading && products.length === 0 ? (
          /* 1. Loading -> show proper loading state (never show empty products while loading) */
          <div className="mt-8">
            <div className="mb-6 flex items-center justify-between bg-orange-50/80 border border-orange-200/60 rounded-2xl px-5 py-3 text-orange-800 text-xs font-semibold">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
                Loading fresh products from database...
              </span>
              <span className="text-orange-600 text-[11px] font-bold">Connecting...</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse">
                  <div className="aspect-square bg-stone-100 rounded-xl mb-4" />
                  <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-stone-100 rounded w-full mb-4" />
                  <div className="h-6 bg-stone-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ) : dbError && products.length === 0 ? (
          /* 2. Database error -> show an error state */
          <div className="mt-8 text-center py-16 bg-white rounded-3xl border border-rose-200 p-8 shadow-xs">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Database Connection Issue</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {dbError || 'We encountered an error loading products from the database.'}
            </p>
            <button
              onClick={() => refreshStoreData(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : products.length === 0 ? (
          /* 3. Products successfully loaded but database is empty -> show "No products available" */
          <div className="mt-8 text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 shadow-xs">
            <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PackageOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">No products available</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              There are currently no palm oil products in the store database. New batches are added regularly by the admin.
            </p>
            <button
              onClick={() => refreshStoreData(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Check for Updates</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* 4. Filter/Search empty state (database has products, but none match current filter/search) */
          <div className="mt-8 text-center py-16 bg-white rounded-3xl border border-dashed border-stone-300 p-8">
            <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">No matching palm oil products found</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search keyword or selecting a different category from above.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-xs hover:bg-orange-700 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* 5. Products successfully loaded -> show products */
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((c) => c.id === product.id);
              const qtyInCart = inCartItem ? inCartItem.quantity : 0;

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={qtyInCart}
                  onAddToCart={(p) => handleAddToCart(p, 1)}
                  onViewDetails={(p) => setDetailProduct(p)}
                />
              );
            })}
          </div>
        )}

        {/* Why Choose Our Palm Oil Banner */}
        <section className="mt-20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white rounded-3xl border border-orange-200/80 p-8 sm:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 uppercase tracking-widest bg-orange-100 px-3 py-1 rounded-full mb-3">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Guaranteed Authentic Nigerian Produce</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Why Chefs, Families &amp; Wholesalers Trust {settings.businessName}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
              In Nigerian markets, adulterated palm oil mixed with harmful industrial colorants (like Sudan dye) is a common danger.
              Our palm oil is sourced directly from certified rural plantation mills in the Niger Delta, tested for zero chemical additives, and delivered fresh in sterile containers.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-2xl border border-orange-200/60 shadow-2xs">
                <ShieldCheck className="w-6 h-6 text-orange-600 mb-2" />
                <h4 className="font-bold text-xs sm:text-sm text-stone-900">100% Unadulterated</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Zero chemical colorants, pure natural extraction with rich carotene red hue.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-orange-200/60 shadow-2xs">
                <Truck className="w-6 h-6 text-orange-600 mb-2" />
                <h4 className="font-bold text-xs sm:text-sm text-stone-900">Swift Logistics</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Fast interstate waybill and local doorstep delivery across Nigerian states.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-orange-200/60 shadow-2xs">
                <HeartHandshake className="w-6 h-6 text-orange-600 mb-2" />
                <h4 className="font-bold text-xs sm:text-sm text-stone-900">Direct Mill Pricing</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Enjoy competitive factory and plantation wholesale prices with no middleman inflation.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                  <Droplets className="w-5 h-5 fill-white stroke-orange-200" />
                </div>
                <span className="font-extrabold text-lg text-white">
                  {settings.businessName}
                </span>
              </div>
              <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                {settings.bannerSubtitle}
              </p>
              <div className="text-[11px] text-orange-400 font-semibold">
                Guest Online Store • Direct Bank Transfer • Fast WhatsApp Ordering
              </div>
            </div>

            {/* Official Bank Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Store Bank Details</span>
              </h4>
              <div className="text-xs text-stone-400 space-y-1 bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
                <div>
                  <span className="text-stone-500">Bank:</span>{' '}
                  <span className="text-white font-semibold">{settings.bankName}</span>
                </div>
                <div>
                  <span className="text-stone-500">Account:</span>{' '}
                  <span className="text-white font-semibold">{settings.accountName}</span>
                </div>
                <div>
                  <span className="text-stone-500">Number:</span>{' '}
                  <span className="text-orange-400 font-mono font-bold">{settings.accountNumber}</span>
                </div>
              </div>
            </div>

            {/* Order Desk & Owner Portal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                <span>Order Desk Contact</span>
              </h4>
              <p className="text-xs text-stone-400">
                {settings.whatsappName}: <br />
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 font-mono font-bold"
                >
                  +{settings.whatsappNumber}
                </a>
              </p>

              <div className="pt-2 border-t border-stone-800">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-orange-400 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Store Owner Portal</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-stone-800 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              &copy; {new Date().getFullYear()} {settings.businessName}. All rights reserved.
            </div>
            <div className="text-[11px] text-stone-500">
              No customer registration required • Safe guest shopping
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Cart Button for Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 sm:hidden">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold p-3.5 rounded-full shadow-2xl shadow-orange-600/40 active:scale-95 transition-all"
            aria-label="Open Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="px-2 py-0.5 rounded-full bg-white text-orange-700 text-xs font-black">
              {totalCartCount}
            </span>
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCartWithQty={handleAddToCart}
        onProceedToCheckout={(product, quantity) => {
          handleAddToCart(product, quantity);
          setDetailProduct(null);
          setIsGuestCheckoutOpen(true);
        }}
        cartQuantity={
          detailProduct ? cart.find((c) => c.id === detailProduct.id)?.quantity || 0 : 0
        }
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsGuestCheckoutOpen(true);
        }}
      />

      {/* STEP 1: Guest Checkout Pop-Up (Name, Location, WhatsApp only) */}
      <GuestCheckoutModal
        isOpen={isGuestCheckoutOpen}
        onClose={() => setIsGuestCheckoutOpen(false)}
        cart={cart}
        customerData={customerData}
        onContinueToPayment={(data) => {
          saveCustomer(data);
          setIsGuestCheckoutOpen(false);
          setIsPaymentDetailsOpen(true);
        }}
      />

      {/* STEP 2: Payment Details Pop-Up (Bank info from admin, copy button, order summary, Order on WhatsApp) */}
      <PaymentDetailsModal
        isOpen={isPaymentDetailsOpen}
        onClose={() => setIsPaymentDetailsOpen(false)}
        onBackToCustomerInfo={() => {
          setIsPaymentDetailsOpen(false);
          setIsGuestCheckoutOpen(true);
        }}
        cart={cart}
        customerData={customerData}
        settings={settings}
        onOrderSuccess={(orderData) => {
          setIsPaymentDetailsOpen(false);
          clearCart(); // Clear cart once database save is confirmed
          setOrderReadyData(orderData);
        }}
      />

      {/* STEP 3: Order Ready Confirmation Pop-Up */}
      <OrderReadyModal
        orderData={orderReadyData}
        settings={settings}
        onClose={() => setOrderReadyData(null)}
      />
    </div>
  );
}
