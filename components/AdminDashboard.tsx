'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Product, Order, StoreSettings } from '@/lib/types';
import { optimizeImageFile } from '@/lib/image-utils';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Settings,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  ExternalLink,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  Droplets,
  Building2,
  Phone,
  Lock,
  MessageCircle,
  Cloud,
  AlertTriangle,
  Database,
  Copy,
  Check,
} from 'lucide-react';

interface StorageAuditData {
  firebaseStatus: {
    isConfigured: boolean;
    missingVars: string[];
    projectId?: string;
    storageBucket?: string;
  };
  productAudit: {
    id: string;
    name: string;
    imageUrl: string;
    filename?: string;
    status: string;
    exists: boolean;
    needsReupload: boolean;
  }[];
  settingsAudit: {
    banner: string;
    filename?: string;
    status: string;
    exists: boolean;
    needsReupload: boolean;
  };
  configInstructions: {
    title: string;
    variables: { name: string; description: string }[];
    steps: string[];
  };
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  initialSettings: StoreSettings;
}

type TabType = 'overview' | 'products' | 'orders' | 'summary' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  onLogout,
  initialSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Global feedback alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    quantity: '100',
    category: 'Palm Oil',
    description: '',
    imageUrl: '',
    isPublished: true,
    sortOrder: '0',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Delete product confirmation modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Order status update tracking
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Reset orders confirmation modal
  const [isResetOrdersModalOpen, setIsResetOrdersModalOpen] = useState(false);
  const [isResettingOrders, setIsResettingOrders] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Cloud Storage Audit and Setup Guide
  const [storageAudit, setStorageAudit] = useState<StorageAuditData | null>(null);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isMigratingToFirebase, setIsMigratingToFirebase] = useState(false);
  const [copiedVarName, setCopiedVarName] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  const notifyStoreSync = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('oroma_store_sync');
        channel.postMessage({ type: 'SYNC_PRODUCTS', timestamp: Date.now() });
        channel.close();
      }
    } catch {}
  }, []);

  const fetchStorageAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/storage-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStorageAudit(data);
        }
      }
    } catch (err) {
      console.error('Storage audit fetch error:', err);
    }
  }, [token]);

  // Fetch all data
  const fetchData = async () => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      fetchStorageAudit();
      const [prodRes, orderRes, setRes] = await Promise.all([
        fetch('/api/products?all=true', { cache: 'no-store' }),
        fetch('/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      const prodData = await prodRes.json();
      if (prodData.success) {
        setProducts(prodData.products);
      }

      const orderData = await orderRes.json();
      if (orderData.success) {
        setOrders(orderData.orders);
      } else if (orderRes.status === 401) {
        console.warn('Unauthorized session when fetching orders, checking verify');
        const verRes = await fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          cache: 'no-store',
        });
        const verData = await verRes.json();
        if (!verData.authenticated) {
          onLogout();
          return;
        }
      }

      const settingsData = await setRes.json();
      if (settingsData.success) {
        setSettings(settingsData.settings);
        setSettingsForm(settingsData.settings);
      }
    } catch (err: unknown) {
      console.error('Data fetch error:', err);
      showError('Failed to load store data. Please click Refresh.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const [prodRes, orderRes, setRes] = await Promise.all([
          fetch('/api/products', { cache: 'no-store' }),
          fetch('/api/orders', {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/settings', { cache: 'no-store' }),
        ]);

        const prodData = await prodRes.json();
        const orderData = await orderRes.json();
        const settingsData = await setRes.json();

        fetchStorageAudit();

        if (isMounted) {
          if (prodData.success) {
            setProducts(prodData.products);
          }
          if (orderData.success) {
            setOrders(orderData.orders);
          } else if (orderRes.status === 401) {
            const verRes = await fetch('/api/admin/verify', {
              headers: { Authorization: `Bearer ${token}` },
              credentials: 'include',
              cache: 'no-store',
            });
            const verData = await verRes.json();
            if (!verData.authenticated) {
              onLogout();
              return;
            }
          }
          if (settingsData.success) {
            setSettings(settingsData.settings);
            setSettingsForm(settingsData.settings);
          }
          setIsLoadingData(false);
        }
      } catch (err) {
        console.error('Initial admin load error:', err);
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [token, onLogout, fetchStorageAudit]);

  // ---------------- Image Upload for Products ----------------
  const uploadProductFile = async (file: File) => {
    if (!file) return;

    setIsUploadingImage(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const isImg = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|jfif|bmp)$/i.test(file.name);
      if (!isImg) {
        throw new Error('Please select a valid image file (JPG, PNG, WebP, SVG, etc.)');
      }

      // Compress/optimize client-side before uploading (with 1.5s safeguard)
      const optimizedFile = await optimizeImageFile(file, 1200, 0.85);

      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('type', 'products');

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          throw new Error('Your admin session has expired. Please refresh the page or log in again.');
        }
        throw new Error(data.error || 'Failed to upload product image');
      }

      setProductForm((prev) => ({ ...prev, imageUrl: data.url }));
      const sizeKb = Math.round(file.size / 1024);
      let successText = `Product image uploaded successfully (${sizeKb} KB)!`;
      if (data.storageProvider === 'firebase-storage') {
        successText = `Product image uploaded to Firebase Storage (${sizeKb} KB)!`;
      } else if (data.warning) {
        successText = `Product image uploaded (${sizeKb} KB). Connect Firebase Storage in Vercel to persist across all deployments.`;
      }
      setModalSuccess(successText);
      showSuccess(successText);
      fetchStorageAudit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      setModalError(msg);
      showError(msg);
    } finally {
      setIsUploadingImage(false);
      if (productFileInputRef.current) {
        productFileInputRef.current.value = '';
      }
    }
  };

  const handleProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadProductFile(file);
    }
  };

  // ---------------- Banner Upload for Settings ----------------
  const uploadBannerFile = async (file: File) => {
    if (!file) return;

    setIsUploadingBanner(true);
    setBannerError(null);
    setBannerSuccess(null);
    setErrorMessage(null);

    try {
      const isImg =
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|svg|avif|jfif|bmp)$/i.test(file.name);
      if (!isImg) {
        throw new Error('Please select a valid image file for the banner (JPG, PNG, WebP, SVG, etc.).');
      }

      // If under 10MB, upload directly without canvas manipulation to preserve full clarity
      let uploadFile: File = file;
      if (file.size > 10 * 1024 * 1024) {
        uploadFile = await optimizeImageFile(file, 2000, 0.85);
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', 'banners');

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      } else {
        throw new Error('Admin session missing. Please log in again to save settings.');
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          throw new Error('Admin session expired. Please refresh the page or log in again.');
        }
        throw new Error(data.error || 'Failed to upload banner');
      }

      const newBannerUrl = data.url;

      // Automatically persist to store database immediately
      const updatedSettings: StoreSettings = {
        ...settingsForm,
        banner: newBannerUrl,
      };

      const saveRes = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.trim()}`,
        },
        credentials: 'include',
        body: JSON.stringify(updatedSettings),
      });

      const saveData = await saveRes.json();
      if (saveRes.ok && saveData.success) {
        setSettings(saveData.settings);
        setSettingsForm(saveData.settings);
      } else {
        setSettingsForm(updatedSettings);
      }

      const sizeKb = Math.round(file.size / 1024);
      let msg = `New banner uploaded & saved to store database successfully (${sizeKb} KB)!`;
      if (data.storageProvider === 'firebase-storage') {
        msg = `New banner uploaded to Firebase Storage and saved (${sizeKb} KB)!`;
      }
      setBannerSuccess(msg);
      showSuccess(msg);
      notifyStoreSync();
      fetchStorageAudit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Banner upload failed';
      setBannerError(msg);
      showError(msg);
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBannerFile(file);
    }
  };

  const handleSelectPresetBanner = async (presetUrl: string, presetName: string) => {
    setIsUploadingBanner(true);
    setBannerError(null);
    setBannerSuccess(null);

    try {
      const updatedSettings: StoreSettings = {
        ...settingsForm,
        banner: presetUrl,
      };

      const saveRes = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ? token.trim() : ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(updatedSettings),
      });

      const saveData = await saveRes.json();
      if (saveRes.ok && saveData.success) {
        setSettings(saveData.settings);
        setSettingsForm(saveData.settings);
      } else {
        setSettingsForm(updatedSettings);
      }

      const msg = `Applied "${presetName}" banner and saved to store!`;
      setBannerSuccess(msg);
      showSuccess(msg);
      notifyStoreSync();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update banner';
      setBannerError(msg);
      showError(msg);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // ---------------- Product Modal Open ----------------
  const openAddProductModal = () => {
    setEditingProduct(null);
    setModalError(null);
    setModalSuccess(null);
    setProductForm({
      name: '',
      price: '',
      quantity: '100',
      category: 'Palm Oil',
      description: '',
      imageUrl: '/api/uploads/sample_5l.svg',
      isPublished: true,
      sortOrder: String(products.length),
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setModalError(null);
    setModalSuccess(null);
    setProductForm({
      name: prod.name,
      price: String(prod.price),
      quantity: String(prod.quantity ?? 100),
      category: prod.category || 'Palm Oil',
      description: prod.description,
      imageUrl: prod.imageUrl || '/api/uploads/sample_5l.svg',
      isPublished: prod.isPublished !== false,
      sortOrder: String(prod.sortOrder ?? 0),
    });
    setIsProductModalOpen(true);
  };

  // ---------------- Save Product (Create or Edit) ----------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const trimmedName = productForm.name.trim();
    if (!trimmedName) {
      setModalError('Product name is required.');
      return;
    }

    const priceCleaned = String(productForm.price ?? '').replace(/[^0-9.]/g, '');
    const priceNum = Number(priceCleaned);
    if (isNaN(priceNum) || priceNum <= 0) {
      setModalError('Please enter a valid price greater than ₦0.');
      return;
    }

    const qtyNum = Number(productForm.quantity);
    const validQuantity = isNaN(qtyNum) || qtyNum < 0 ? 100 : Math.floor(qtyNum);

    const trimmedDesc = productForm.description.trim();
    if (!trimmedDesc) {
      setModalError('Product description is required.');
      return;
    }

    const finalImage = productForm.imageUrl.trim() || '/api/uploads/sample_5l.svg';

    setIsSavingProduct(true);
    try {
      const isEdit = Boolean(editingProduct);
      const endpoint = isEdit ? `/api/products/${editingProduct?.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      } else {
        throw new Error('Your admin session is missing. Please log in again to save products.');
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          price: priceNum,
          quantity: validQuantity,
          category: productForm.category.trim() || 'Palm Oil',
          description: trimmedDesc,
          imageUrl: finalImage,
          isPublished: productForm.isPublished,
          sortOrder: Number(productForm.sortOrder) || 0,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        if (response.status === 401) {
          throw new Error('Your admin session has expired. Please refresh the page or log in again.');
        }
        throw new Error(data.error || 'Failed to save product to database');
      }

      if (isEdit) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct?.id ? data.product : p))
        );
        showSuccess(`Product "${data.product.name}" updated successfully in database.`);
      } else {
        setProducts((prev) => [data.product, ...prev]);
        showSuccess(`New product "${data.product.name}" created and saved to database!`);
      }

      notifyStoreSync();
      setIsProductModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      setModalError(msg);
      showError(msg);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ---------------- Delete Product ----------------
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeletingProduct(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete product from database');
      }

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      notifyStoreSync();
      showSuccess(`Product "${productToDelete.name}" deleted.`);
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product';
      showError(msg);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // ---------------- Order Status Update ----------------
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['orderStatus']) => {
    setUpdatingOrderId(orderId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? data.order : o))
      );
      showSuccess(`Order #${orderId} status updated to ${newStatus}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      showError(msg);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ---------------- Reset Orders ----------------
  const handleResetOrders = async () => {
    setIsResettingOrders(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/orders/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to clear orders');
      }

      setOrders([]);
      setIsResetOrdersModalOpen(false);
      showSuccess('All orders and sales records have been cleared from database.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      showError(msg);
    } finally {
      setIsResettingOrders(false);
    }
  };

  // ---------------- Save Settings ----------------
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(settingsForm),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update store settings');
      }

      setSettings(data.settings);
      setSettingsForm(data.settings);
      showSuccess('Store settings successfully updated in the database!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings';
      showError(msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ---------------- Change Password ----------------
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showError('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to change admin password');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Password updated! Please log in with your new password.');
      setTimeout(() => onLogout(), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password update failed';
      showError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Calculations for Sales Summary
  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending');
  const confirmedOrders = orders.filter((o) => o.orderStatus === 'Confirmed');
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'Delivered');

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
              <Droplets className="w-5 h-5 fill-white stroke-orange-200" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {settings.businessName}
              </span>
              <span className="block text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                Store Owner Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchData}
              disabled={isLoadingData}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
              title="Refresh store data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsStorageModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                storageAudit?.firebaseStatus?.isConfigured
                  ? 'bg-emerald-950/70 text-emerald-200 border-emerald-800 hover:bg-emerald-900'
                  : 'bg-amber-950/80 text-amber-200 border-amber-700 hover:bg-amber-900'
              }`}
              title="Cloud Image Storage & Vercel Persistence"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">
                {storageAudit?.firebaseStatus?.isConfigured ? 'Firebase Active' : 'Storage Setup'}
              </span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer Store</span>
            </Link>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
            {pendingOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-orange-600 text-[10px] text-white">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'summary'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Sales Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Store Settings</span>
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4">
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Missing Images Alert Banner */}
        {storageAudit?.productAudit?.some((p) => p.needsReupload) && (
          <div className="mt-3 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-sm">
                  ⚠️ Action Required: Missing Product Photo ({storageAudit.productAudit.filter((p) => p.needsReupload).length})
                </p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Product <strong>{storageAudit.productAudit.filter((p) => p.needsReupload).map((p) => `"${p.name}"`).join(', ')}</strong> references an image that was lost on Vercel before cloud storage was configured. Please edit the product and upload its photo.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('products');
                const missingProd = products.find((p) =>
                  storageAudit?.productAudit?.find((a) => a.id === p.id && a.needsReupload)
                );
                if (missingProd) openEditProductModal(missingProd);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
            >
              Upload Photo Now
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 flex-1">
        {/* ===================== OVERVIEW TAB ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">Dashboard Overview</h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Real-time sales, order fulfillment, and product metrics directly from the database.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsResetOrdersModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Clear all orders and sales records"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Clear All</span>
                </button>
                <button
                  onClick={openAddProductModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Product</span>
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Total Sales
                </div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
                  ₦{totalSales.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Across all order records</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Total Orders
                </div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
                  {totalOrders}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  {pendingOrders.length} pending verification
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Orders</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-2">
                  {pendingOrders.length}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  ₦{pendingOrders.reduce((s, o) => s + o.total, 0).toLocaleString()} awaiting confirmation
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Delivered Orders</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                  {deliveredOrders.length}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  {confirmedOrders.length} confirmed / in transit
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-base text-stone-900">Recent Customer Orders</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  View All Orders →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No orders yet. When customers check out on the website, they will appear here.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.orderId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900">
                            #{order.orderId}
                          </span>
                          <span className="text-xs text-stone-600 font-medium">
                            {order.customerName}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            ({order.customerLocation})
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs text-stone-900">
                          ₦{order.total.toLocaleString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.orderStatus === 'Confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== PRODUCTS TAB ===================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">Palm Oil Products</h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Upload, modify, or delete available palm oil packages. Changes immediately reflect on the customer website.
                </p>
              </div>
              <button
                onClick={openAddProductModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Product</span>
              </button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Image */}
                    <div className="relative aspect-square bg-stone-50 p-4 flex items-center justify-center border-b border-stone-100">
                      <img
                        src={product.imageUrl || '/api/uploads/sample_1l.svg'}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.missing-image-box')) {
                            const box = document.createElement('div');
                            box.className = 'missing-image-box w-full h-full flex flex-col items-center justify-center text-center p-3 bg-amber-50 rounded-xl text-amber-800';
                            box.innerHTML = '<span class="text-xs font-bold text-amber-900">⚠️ Image Missing</span><span class="text-[10px] text-amber-700 mt-1">File lost on Vercel.<br/>Click Edit to re-upload.</span>';
                            parent.appendChild(box);
                          }
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                          {product.category}
                        </span>
                        {product.isPublished === false && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-900 text-stone-200">
                            Hidden
                          </span>
                        )}
                        {storageAudit?.productAudit?.find((a) => a.id === product.id)?.needsReupload && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white flex items-center gap-1 shadow-xs animate-pulse">
                            <span>⚠️ Photo Missing</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-stone-900 line-clamp-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base font-black text-orange-600">
                          ₦{product.price.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          Stock: {product.quantity ?? 100}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditProductModal(product)}
                      className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== ORDERS TAB ===================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">Customer Orders</h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Track orders placed by guests, verify bank payments, and update order fulfillment status.
                </p>
              </div>

              {orders.length > 0 && (
                <button
                  onClick={() => setIsResetOrdersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset / Clear All Orders</span>
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
                <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <h3 className="text-base font-bold text-stone-700">No orders placed yet</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  When customers select palm oil products and check out, their full order details and WhatsApp contacts will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  let cleanPhone = order.customerWhatsApp.replace(/[^0-9]/g, '');
                  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
                    cleanPhone = '234' + cleanPhone.substring(1);
                  }

                  return (
                    <div
                      key={order.orderId}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Customer & Items */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            #{order.orderId}
                          </span>
                          <span className="text-xs text-stone-400">
                            {new Date(order.createdAt).toLocaleString('en-NG', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              order.orderStatus === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.orderStatus === 'Confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Status: {order.orderStatus}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700">
                            {order.paymentStatus}
                          </span>
                        </div>

                        {/* Customer details */}
                        <div className="text-xs text-stone-700 space-y-0.5">
                          <div className="font-bold text-stone-900">
                            Customer: {order.customerName}
                          </div>
                          <div>Location: {order.customerLocation}</div>
                          <div className="flex items-center gap-2">
                            <span>WhatsApp: {order.customerWhatsApp}</span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Chat</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl space-y-1">
                          <span className="font-semibold text-stone-700 block text-[11px] uppercase tracking-wider">
                            Ordered Items:
                          </span>
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                {it.quantity}x {it.name}
                              </span>
                              <span className="font-semibold text-stone-800">
                                ₦{(it.quantity * it.price).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Total & Status controls */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                        <div className="text-right">
                          <span className="text-[11px] text-stone-400 block font-medium">
                            Total Order Amount
                          </span>
                          <span className="text-xl font-black text-orange-600">
                            ₦{order.total.toLocaleString()}
                          </span>
                        </div>

                        {/* Status Change Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-stone-400 mr-1">
                            Set Status:
                          </span>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.orderId, 'Pending')}
                            disabled={updatingOrderId === order.orderId || order.orderStatus === 'Pending'}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              order.orderStatus === 'Pending'
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            Pending
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.orderId, 'Confirmed')}
                            disabled={updatingOrderId === order.orderId || order.orderStatus === 'Confirmed'}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              order.orderStatus === 'Confirmed'
                                ? 'bg-blue-600 text-white'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            Confirmed
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.orderId, 'Delivered')}
                            disabled={updatingOrderId === order.orderId || order.orderStatus === 'Delivered'}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              order.orderStatus === 'Delivered'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            Delivered
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== SALES SUMMARY TAB ===================== */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">Sales Summary</h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Aggregated revenue and performance statistics calculated live from real database orders.
                </p>
              </div>

              {orders.length > 0 && (
                <button
                  onClick={() => setIsResetOrdersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Sales Summary</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Total Gross Sales
                </div>
                <div className="text-3xl font-black text-stone-900">
                  ₦{totalSales.toLocaleString()}
                </div>
                <div className="text-xs text-stone-500">
                  Total revenue recorded across {totalOrders} customer order(s).
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Average Order Value
                </div>
                <div className="text-3xl font-black text-stone-900">
                  ₦{totalOrders > 0 ? Math.round(totalSales / totalOrders).toLocaleString() : 0}
                </div>
                <div className="text-xs text-stone-500">
                  Average amount spent per palm oil order.
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Delivered Revenue
                </div>
                <div className="text-3xl font-black text-emerald-600">
                  ₦{deliveredOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}
                </div>
                <div className="text-xs text-stone-500">
                  {deliveredOrders.length} fulfilled &amp; delivered order(s).
                </div>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <h3 className="font-black text-base text-stone-900 mb-4">
                Fulfillment Status Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-500 font-bold uppercase border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Count</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    <tr>
                      <td className="py-3 px-4 text-amber-700 font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </td>
                      <td className="py-3 px-4 font-bold">{pendingOrders.length}</td>
                      <td className="py-3 px-4 font-black">
                        ₦{pendingOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {totalOrders > 0 ? Math.round((pendingOrders.length / totalOrders) * 100) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-blue-700 font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirmed / Processing</span>
                      </td>
                      <td className="py-3 px-4 font-bold">{confirmedOrders.length}</td>
                      <td className="py-3 px-4 font-black">
                        ₦{confirmedOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {totalOrders > 0 ? Math.round((confirmedOrders.length / totalOrders) * 100) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-emerald-700 font-bold flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </td>
                      <td className="py-3 px-4 font-bold">{deliveredOrders.length}</td>
                      <td className="py-3 px-4 font-black">
                        ₦{deliveredOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {totalOrders > 0 ? Math.round((deliveredOrders.length / totalOrders) * 100) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== STORE SETTINGS TAB ===================== */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-8">
            <div>
              <h1 className="text-2xl font-black text-stone-900">Store Settings</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Customize your store name, banner image, WhatsApp order contact, and official bank transfer details.
                These settings are saved to the database and update the customer shopping website immediately.
              </p>
            </div>

            {/* General & Bank Settings Form */}
            <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
              <h3 className="font-black text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-600" />
                <span>Business &amp; WhatsApp Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Store / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.businessName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, businessName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Owner WhatsApp Contact Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.whatsappName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, whatsappName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-600" />
                  <span>Owner WhatsApp Number (Receives Customer Orders) *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2348031234567 or 08031234567"
                  value={settingsForm.whatsappNumber}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  When a customer places an order, the website generates an order link directly addressed to this WhatsApp number.
                </span>
              </div>

              {/* Banner Upload Area */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Store Banner Image *
                  </label>
                  {settingsForm.banner && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Active on Storefront
                    </span>
                  )}
                </div>

                {/* Banner Status Alerts */}
                {bannerError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 font-semibold">{bannerError}</div>
                  </div>
                )}
                {bannerSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 font-semibold">{bannerSuccess}</div>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={bannerFileInputRef}
                  onChange={handleBannerSelect}
                  accept="image/*"
                  className="hidden"
                />

                {/* Banner Dropzone & Preview Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) {
                      uploadBannerFile(droppedFile);
                    }
                  }}
                  className="border-2 border-dashed border-stone-300 hover:border-orange-400 rounded-2xl p-4 transition-colors bg-stone-50/60"
                >
                  {/* Current Banner Preview */}
                  {settingsForm.banner && (
                    <div className="relative w-full aspect-[3/1] max-h-48 rounded-xl border border-stone-200 overflow-hidden bg-stone-900 mb-3 shadow-xs">
                      <img
                        src={settingsForm.banner}
                        alt="Store Banner Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] font-bold text-white">
                        Live Store Preview
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="text-center sm:text-left">
                      <p className="text-xs font-bold text-stone-800">
                        Upload Custom Store Banner
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Drag and drop your image file here or browse from device (JPG, PNG, WebP, SVG up to 25MB).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isUploadingBanner}
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isUploadingBanner ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Uploading &amp; Saving Banner...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Upload Banner from Device</span>
                          </>
                        )}
                      </button>

                      {settingsForm.banner && settingsForm.banner !== '/api/uploads/default_banner.svg' && (
                        <button
                          type="button"
                          disabled={isUploadingBanner}
                          onClick={() => handleSelectPresetBanner('/api/uploads/default_banner.svg', 'Default Golden Banner')}
                          className="px-3 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset Palm Oil Banners Selection */}
                  <div className="mt-4 pt-3 border-t border-stone-200">
                    <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                      Or select a standard palm oil banner theme:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          name: 'Golden Palm Oil',
                          url: '/api/uploads/default_banner.svg',
                          tag: 'Default Warm Theme',
                        },
                        {
                          name: 'Edo & Delta Plantations',
                          url: '/api/uploads/banner_plantation.svg',
                          tag: 'Deep Red Harvest',
                        },
                        {
                          name: 'Traditional Palm Press',
                          url: '/api/uploads/banner_harvest.svg',
                          tag: 'Direct Mill Theme',
                        },
                      ].map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          disabled={isUploadingBanner}
                          onClick={() => handleSelectPresetBanner(preset.url, preset.name)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                            settingsForm.banner === preset.url
                              ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="w-full h-12 rounded-lg overflow-hidden border border-stone-100 bg-stone-900">
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-stone-800">{preset.name}</span>
                            <span className="text-[10px] text-stone-500">{preset.tag}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Banner Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={settingsForm.bannerSubtitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, bannerSubtitle: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="pt-4 border-t border-stone-100 space-y-4">
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>Official Bank Transfer Details</span>
                </h4>
                <p className="text-xs text-stone-500">
                  Customers see these exact bank details during checkout to make direct transfers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zenith Bank PLC"
                      value={settingsForm.bankName}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, bankName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Oroma Palm Oil Ventures"
                      value={settingsForm.accountName}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, accountName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1018942365"
                      value={settingsForm.accountNumber}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, accountNumber: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-mono font-bold text-orange-700"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Settings...</span>
                    </>
                  ) : (
                    <span>Save Store Settings</span>
                  )}
                </button>
              </div>
            </form>

            {/* Admin Security / Change Password Form */}
            <form onSubmit={handleChangePassword} className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
              <h3 className="font-black text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-600" />
                <span>Admin Password Management</span>
              </h3>
              <p className="text-xs text-stone-500">
                Update the store owner password. Securely stored in the database.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Admin Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ===================== ADD / EDIT PRODUCT MODAL ===================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <h2 className="text-xl font-black text-stone-900">
                {editingProduct ? 'Edit Palm Oil Product' : 'Upload Palm Oil Product'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                disabled={isSavingProduct}
                className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Alert Feedback Inside Modal */}
              {modalError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">{modalError}</span>
                    {modalError.toLowerCase().includes('session') && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="ml-2 font-black underline text-red-900 hover:text-red-950 cursor-pointer"
                      >
                        Log in again
                      </button>
                    )}
                  </div>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-semibold">{modalSuccess}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Litres Palm Oil (Kitchen Keg)"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  disabled={isSavingProduct}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Price (₦ Naira) *
                    </label>
                    {productForm.price && (
                      <span className="text-[11px] font-bold text-orange-600">
                        ₦{Number(String(productForm.price).replace(/[^0-9.]/g, '') || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="e.g. 11500"
                    value={productForm.price}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setProductForm({ ...productForm, price: val });
                    }}
                    disabled={isSavingProduct}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Stock Quantity *
                    </label>
                    <span className="text-[11px] font-semibold text-stone-500">
                      Units / Bottles
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 100"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    disabled={isSavingProduct}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    disabled={isSavingProduct}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-semibold bg-white"
                  >
                    <option value="Palm Oil">Palm Oil</option>
                    <option value="Bulk Palm Oil">Bulk Palm Oil</option>
                    <option value="Packaged Palm Oil">Packaged Palm Oil</option>
                    <option value="Raw Palm Oil">Raw Palm Oil</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Publication Status & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Website Visibility *
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={productForm.isPublished}
                      onChange={(e) => setProductForm({ ...productForm, isPublished: e.target.checked })}
                      disabled={isSavingProduct}
                      className="w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-stone-800">
                      {productForm.isPublished ? 'Published on Customer Homepage' : 'Hidden / Unpublished (Draft)'}
                    </span>
                  </label>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Unchecked products are kept safely in database but hidden from shoppers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Display Order (Position)
                  </label>
                  <input
                    type="number"
                    value={productForm.sortOrder}
                    onChange={(e) => setProductForm({ ...productForm, sortOrder: e.target.value })}
                    disabled={isSavingProduct}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-300 focus:border-orange-500 text-xs font-semibold bg-white"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Lower numbers appear first on the customer homepage.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the packaging, quality, freshness, and oil volume..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  disabled={isSavingProduct}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-xs sm:text-sm"
                />
              </div>

              {/* Product Image File Upload (File Upload directly from Device) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Product Image *
                </label>

                {editingProduct && storageAudit?.productAudit?.find((a) => a.id === editingProduct.id)?.needsReupload && (
                  <div className="mb-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">⚠️ Photo File Missing from Server</p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        The previous image ({productForm.imageUrl}) was lost on Vercel before persistent storage was configured. Please click &quot;Upload Photo from Device&quot; below to select a fresh image.
                      </p>
                    </div>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={productFileInputRef}
                  onChange={handleProductImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                {/* Upload Card / Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) {
                      uploadProductFile(droppedFile);
                    }
                  }}
                  className="border-2 border-dashed border-stone-300 hover:border-orange-400 rounded-2xl p-4 transition-colors bg-stone-50/50"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {productForm.imageUrl ? (
                      <div className="relative w-24 h-24 rounded-2xl bg-white border border-stone-200 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        <img
                          src={productForm.imageUrl}
                          alt="Product preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                        <Package className="w-8 h-8" />
                      </div>
                    )}

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          disabled={isUploadingImage || isSavingProduct}
                          onClick={() => productFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isUploadingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Uploading Image...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>
                                {productForm.imageUrl ? 'Change Product Image' : 'Upload Image from Device'}
                              </span>
                            </>
                          )}
                        </button>

                        {productForm.imageUrl && !productForm.imageUrl.startsWith('/api/uploads/sample_') && (
                          <button
                            type="button"
                            onClick={() => setProductForm({ ...productForm, imageUrl: '/api/uploads/sample_5l.svg' })}
                            className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-500">
                        Select any image from your device or drag & drop. Supported: JPG, PNG, WebP, SVG. Stored cleanly on disk.
                      </p>
                    </div>
                  </div>

                  {/* Preset Packaging Illustrations for quick selection */}
                  <div className="mt-4 pt-3 border-t border-stone-200/80">
                    <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                      Or select standard palm oil packaging illustration:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { label: '1L Bottle', url: '/api/uploads/sample_1l.svg' },
                        { label: '2L Keg', url: '/api/uploads/sample_2l.svg' },
                        { label: '5L Keg', url: '/api/uploads/sample_5l.svg' },
                        { label: '10L Keg', url: '/api/uploads/sample_10l.svg' },
                        { label: '25L Jerrycan', url: '/api/uploads/sample_25l.svg' },
                        { label: '200L Drum', url: '/api/uploads/sample_drum.svg' },
                      ].map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => {
                            setProductForm({ ...productForm, imageUrl: preset.url });
                            setModalSuccess(`Applied ${preset.label} image.`);
                          }}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            productForm.imageUrl === preset.url
                              ? 'border-orange-500 bg-orange-50/70 text-orange-800 font-bold'
                              : 'border-stone-200 bg-white hover:border-stone-300 text-stone-600'
                          }`}
                        >
                          <img src={preset.url} alt={preset.label} className="w-8 h-8 object-contain" />
                          <span className="text-[10px] leading-tight line-clamp-1">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <div className="text-[11px] text-stone-500">
                  {isSavingProduct ? 'Saving to store database...' : 'All fields marked * are required'}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    disabled={isSavingProduct}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct || isUploadingImage}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all"
                  >
                    {isSavingProduct ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Product...</span>
                      </>
                    ) : isUploadingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Image...</span>
                      </>
                    ) : (
                      <span>{editingProduct ? 'Update Product' : 'Save & Publish Product'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Delete Product</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to permanently delete{' '}
                <strong className="text-stone-800">{productToDelete.name}</strong>? It will be removed
                from the database and customer store immediately.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeletingProduct}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isDeletingProduct ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Product...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== RESET ORDERS CONFIRMATION MODAL ===================== */}
      {isResetOrdersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Clear All Orders &amp; Sales?</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                This will permanently remove all {orders.length} order records from the database and
                reset your Sales Summary. <strong>Your products and store settings will NOT be touched.</strong>
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsResetOrdersModalOpen(false)}
                disabled={isResettingOrders}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetOrders}
                disabled={isResettingOrders}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isResettingOrders ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting Records...</span>
                  </>
                ) : (
                  <span>Yes, Clear All Orders</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================== CLOUD STORAGE & FIREBASE SETUP MODAL ===================== */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Cloud Image Storage &amp; Vercel Persistence</h3>
                  <p className="text-xs text-stone-500">
                    Configuration and health audit for product photos and store banners.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStorageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
              {/* Storage Status Box */}
              <div
                className={`p-4 rounded-2xl border ${
                  storageAudit?.firebaseStatus?.isConfigured
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {storageAudit?.firebaseStatus?.isConfigured ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-black text-sm">
                        {storageAudit?.firebaseStatus?.isConfigured
                          ? 'Firebase Storage: Active & Persistent'
                          : 'Firebase Storage: Not Configured (Local/Ephemeral Mode)'}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        {storageAudit?.firebaseStatus?.isConfigured
                          ? `All new product uploads automatically upload to your Firebase Storage bucket (${storageAudit.firebaseStatus.storageBucket}) and persist forever across all Vercel deployments.`
                          : 'On Vercel, serverless function filesystems are ephemeral. Any product photos uploaded without Firebase Storage will disappear after container restarts or redeployments. Follow the guide below to enable cloud persistence.'}
                      </p>
                    </div>
                  </div>

                  {storageAudit?.firebaseStatus?.isConfigured && (
                    <button
                      onClick={async () => {
                        setIsMigratingToFirebase(true);
                        try {
                          const res = await fetch('/api/admin/storage-status', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            showSuccess(`Migrated ${data.migratedCount} images to Firebase Storage!`);
                            fetchData();
                            fetchStorageAudit();
                          } else {
                            showError(data.error || 'Migration failed');
                          }
                        } catch {
                          showError('Network error during migration');
                        } finally {
                          setIsMigratingToFirebase(false);
                        }
                      }}
                      disabled={isMigratingToFirebase}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isMigratingToFirebase ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Migrating...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          <span>Migrate Local Images to Cloud</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Product Image Audit Table */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-2">
                  Image Health Audit ({storageAudit?.productAudit?.length || 0} Products)
                </h4>
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-stone-100 max-h-56 overflow-y-auto">
                  {storageAudit?.productAudit?.map((prod) => (
                    <div key={prod.id} className="p-3 flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 truncate">{prod.name}</p>
                        <p className="text-[11px] text-stone-400 font-mono truncate">{prod.imageUrl}</p>
                      </div>
                      <div className="shrink-0">
                        {prod.needsReupload ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Missing (Re-upload required)</span>
                          </span>
                        ) : prod.status === 'firebase-cloud' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Cloud Storage
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                            Bundled Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vercel Configuration Guide */}
              {!storageAudit?.firebaseStatus?.isConfigured && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500">
                    Required Vercel Environment Variables
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    To connect Firebase Storage, add these environment variables in your{' '}
                    <strong>Vercel Project Settings → Environment Variables</strong>:
                  </p>
                  <div className="space-y-2">
                    {storageAudit?.configInstructions?.variables.map((v) => (
                      <div
                        key={v.name}
                        className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <code className="font-mono font-bold text-stone-900 text-[11px]">{v.name}</code>
                          <p className="text-[10px] text-stone-500 mt-0.5">{v.description}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(v.name);
                            setCopiedVarName(v.name);
                            setTimeout(() => setCopiedVarName(null), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-[11px] font-semibold text-stone-700 flex items-center gap-1 transition-colors"
                        >
                          {copiedVarName === v.name ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-stone-400" />
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-stone-900">Connected Firebase Console Project:</p>
                      <a
                        href={`https://console.firebase.google.com/project/${storageAudit?.firebaseStatus?.projectId || 'project-d8dd0e03-cbfc-4ee5-a7a'}/storage`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Firebase Console Storage</span>
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 leading-relaxed">
                      <li>Click the button above to open your project in Firebase Console.</li>
                      <li>If Storage is not yet initialized, click <strong>Get Started</strong> in the Storage tab to activate the bucket.</li>
                      <li>In Vercel, open your project → <strong>Settings → Environment Variables</strong> and verify the keys.</li>
                      <li>All future uploads will automatically store on Firebase Storage!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
              <button
                onClick={() => setIsStorageModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
