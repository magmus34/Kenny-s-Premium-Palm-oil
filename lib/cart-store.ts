'use client';

import { useSyncExternalStore, useMemo } from 'react';
import { CartItem, Product } from './types';
import { CustomerFormData } from '@/components/GuestCheckoutModal';

const CART_KEY = 'oroma_guest_cart';
const CUSTOMER_KEY = 'oroma_customer_info';

function subscribeCart(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('oroma_cart_updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('oroma_cart_updated', callback);
  };
}

function getCartSnapshot(): string {
  try {
    return localStorage.getItem(CART_KEY) || '[]';
  } catch {
    return '[]';
  }
}

function getCartServerSnapshot(): string {
  return '[]';
}

export function useCart() {
  const rawCart = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartServerSnapshot);

  const cart: CartItem[] = useMemo(() => {
    try {
      return JSON.parse(rawCart);
    } catch {
      return [];
    }
  }, [rawCart]);

  const save = (newItems: CartItem[]) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(newItems));
      window.dispatchEvent(new Event('oroma_cart_updated'));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    const existingIndex = cart.findIndex((item) => item.id === product.id);
    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = [...cart];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + quantity,
      };
    } else {
      updated = [
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          imageUrl: product.imageUrl,
        },
      ];
    }
    save(updated);
  };

  const updateQuantity = (id: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);
    save(updated);
  };

  const removeItem = (id: string) => {
    save(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    save([]);
  };

  return {
    cart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
  };
}

function subscribeCustomer(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('oroma_customer_updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('oroma_customer_updated', callback);
  };
}

function getCustomerSnapshot(): string {
  try {
    return localStorage.getItem(CUSTOMER_KEY) || '{"name":"","location":"","whatsapp":""}';
  } catch {
    return '{"name":"","location":"","whatsapp":""}';
  }
}

function getCustomerServerSnapshot(): string {
  return '{"name":"","location":"","whatsapp":""}';
}

export function useCustomerInfo() {
  const rawCustomer = useSyncExternalStore(
    subscribeCustomer,
    getCustomerSnapshot,
    getCustomerServerSnapshot
  );

  const customerData: CustomerFormData = useMemo(() => {
    try {
      return JSON.parse(rawCustomer);
    } catch {
      return { name: '', location: '', whatsapp: '' };
    }
  }, [rawCustomer]);

  const saveCustomer = (data: CustomerFormData) => {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event('oroma_customer_updated'));
    } catch (e) {
      console.warn('Could not save customer info to localStorage', e);
    }
  };

  return {
    customerData,
    saveCustomer,
  };
}
