import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirestoreInstance, isFirebaseConfigured } from './firebase';
import { Product, StoreSettings, Order } from './types';
import {
  getAllProducts as getLocalProducts,
  getProductById as getLocalProductById,
  createProduct as createLocalProduct,
  updateProduct as updateLocalProduct,
  deleteProduct as deleteLocalProduct,
  getStoreSettings as getLocalSettings,
  updateStoreSettings as updateLocalSettings,
  getOrders as getLocalOrders,
  createOrder as createLocalOrder,
  updateOrderStatus as updateLocalOrderStatus,
  clearAllOrders as clearLocalOrders,
} from './db';
import initialDbJson from '@/data/database.json';

// In-memory flag to skip redundant checks in same process
let isSeededInMemory = false;

/**
 * Initializes and seeds Firestore with initial data ONLY if Firestore is truly uninitialized.
 * Uses a persistent Firestore metadata document to ensure deleted products are NEVER re-seeded.
 */
export async function ensureFirestoreSeeded(): Promise<void> {
  if (isSeededInMemory) return;
  const firestore = getFirestoreInstance();
  if (!firestore) return;

  try {
    // 1. Check if the database was already marked as initialized
    const metaDocRef = doc(firestore, 'settings', 'metadata');
    const metaSnap = await getDoc(metaDocRef);

    if (metaSnap.exists() && metaSnap.data()?.isSeeded === true) {
      isSeededInMemory = true;
      return;
    }

    // 2. Check if products collection already has any documents
    const productsCol = collection(firestore, 'products');
    const existingSnap = await getDocs(productsCol);

    if (!existingSnap.empty) {
      // Products already exist in Firestore, mark seeded in metadata doc
      await setDoc(metaDocRef, { isSeeded: true, seededAt: new Date().toISOString() }, { merge: true });
      isSeededInMemory = true;
      return;
    }

    // 3. Firestore is truly empty for the first time, seed from initial catalog
    console.log('Seeding initial products into Firestore...');
    const initialProducts: Product[] = (initialDbJson as { products?: Product[] })?.products || [];
    const batch = writeBatch(firestore);

    for (const prod of initialProducts) {
      const prodRef = doc(firestore, 'products', prod.id);
      batch.set(prodRef, {
        ...prod,
        isPublished: prod.isPublished !== false,
        sortOrder: typeof prod.sortOrder === 'number' ? prod.sortOrder : 0,
      });
    }

    // Ensure settings document exists in Firestore
    const settingsDocRef = doc(firestore, 'settings', 'store');
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) {
      const initialSettings = (initialDbJson as { settings?: StoreSettings })?.settings || getLocalSettings();
      batch.set(settingsDocRef, initialSettings);
    }

    // Mark as seeded in persistent metadata
    batch.set(metaDocRef, {
      isSeeded: true,
      seededAt: new Date().toISOString(),
      initialCount: initialProducts.length,
    });

    await batch.commit();
    isSeededInMemory = true;
    console.log(`Seeded ${initialProducts.length} products and settings into Firestore.`);
  } catch (err) {
    console.error('Error during Firestore initialization seeding:', err);
  }
}

// ==========================================
// PRODUCTS: SINGLE SOURCE OF TRUTH
// ==========================================

export async function getFirestoreProducts(includeAll: boolean = false): Promise<Product[]> {
  const firestore = getFirestoreInstance();
  if (!firestore || !isFirebaseConfigured()) {
    return getLocalProducts(includeAll);
  }

  try {
    await ensureFirestoreSeeded();
    const productsCol = collection(firestore, 'products');
    const snap = await getDocs(productsCol);

    const products: Product[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Product;
      products.push({
        ...data,
        id: docSnap.id,
      });
    });

    // Firestore is authoritative: filter published if customer-facing
    const filtered = includeAll
      ? products
      : products.filter((p) => p.isPublished !== false);

    // Deterministic sort: sortOrder ascending, then createdAt descending, then ID
    filtered.sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
      if (orderA !== orderB) return orderA - orderB;

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;

      return a.id.localeCompare(b.id);
    });

    return filtered;
  } catch (err) {
    console.error('Error reading products from Firestore, emergency local fallback:', err);
    return getLocalProducts(includeAll);
  }
}

export async function getFirestoreProductById(id: string): Promise<Product | null> {
  const firestore = getFirestoreInstance();
  if (!firestore || !isFirebaseConfigured()) {
    return getLocalProductById(id);
  }

  try {
    const docRef = doc(firestore, 'products', id);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return {
        ...(snap.data() as Product),
        id: snap.id,
      };
    }

    // Do NOT fall back to local DB if the document does not exist in Firestore!
    // A missing document in Firestore means it was deleted or never existed.
    return null;
  } catch (err) {
    console.error(`Error reading product ${id} from Firestore:`, err);
    return null;
  }
}

export async function createFirestoreProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const newProduct: Product = {
    ...productData,
    id,
    price: Number(productData.price) || 0,
    quantity: productData.quantity !== undefined ? Number(productData.quantity) : 100,
    category: productData.category?.trim() || 'Palm Oil',
    imageUrl: productData.imageUrl?.trim() || '/api/uploads/sample_5l.svg',
    isPublished: productData.isPublished !== false,
    sortOrder: typeof productData.sortOrder === 'number' ? productData.sortOrder : 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save directly to Firestore (Authoritative)
  const firestore = getFirestoreInstance();
  if (firestore && isFirebaseConfigured()) {
    try {
      const docRef = doc(firestore, 'products', id);
      await setDoc(docRef, newProduct);
    } catch (err) {
      console.error('Firestore createProduct error:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to save product in Firestore');
    }
  }

  // 2. Mirror to local DB cache with the exact same ID
  try {
    createLocalProduct(newProduct);
  } catch (e) {
    console.warn('Local product cache sync note:', e);
  }

  return newProduct;
}

export async function updateFirestoreProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product | null> {
  const firestore = getFirestoreInstance();
  if (!firestore || !isFirebaseConfigured()) {
    return updateLocalProduct(id, updates);
  }

  // Read existing product from Firestore
  const docRef = doc(firestore, 'products', id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  const existing = { ...(snap.data() as Product), id: snap.id };
  const now = new Date().toISOString();

  const updatedProduct: Product = {
    ...existing,
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    price: updates.price !== undefined ? Number(updates.price) : existing.price,
    quantity: updates.quantity !== undefined ? Number(updates.quantity) : (existing.quantity ?? 100),
    description: updates.description !== undefined ? updates.description.trim() : existing.description,
    category: updates.category !== undefined ? updates.category.trim() : existing.category,
    imageUrl: updates.imageUrl !== undefined ? updates.imageUrl.trim() : existing.imageUrl,
    isPublished: updates.isPublished !== undefined ? Boolean(updates.isPublished) : (existing.isPublished !== false),
    sortOrder: updates.sortOrder !== undefined ? Number(updates.sortOrder) : existing.sortOrder,
    updatedAt: now,
  };

  // Update in Firestore
  try {
    await setDoc(docRef, updatedProduct);
  } catch (err) {
    console.error(`Firestore updateProduct ${id} error:`, err);
    throw new Error(err instanceof Error ? err.message : 'Failed to update product in Firestore');
  }

  // Mirror update to local DB cache
  try {
    updateLocalProduct(id, updates);
  } catch (e) {
    console.warn('Local product update cache note:', e);
  }

  return updatedProduct;
}

export async function deleteFirestoreProduct(id: string): Promise<boolean> {
  const firestore = getFirestoreInstance();
  if (!firestore || !isFirebaseConfigured()) {
    return deleteLocalProduct(id);
  }

  // 1. Delete from Firestore
  try {
    const docRef = doc(firestore, 'products', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // Clean up local cache if present
      deleteLocalProduct(id);
      return false;
    }
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Firestore deleteProduct error for ${id}:`, err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete product from Firestore');
  }

  // 2. Clean up from local DB cache
  try {
    deleteLocalProduct(id);
  } catch (e) {
    console.warn('Local product delete cache note:', e);
  }

  return true;
}

// ==========================================
// STORE SETTINGS: PERSISTENT & SYNCHRONIZED
// ==========================================

const DEFAULT_KENNY_SETTINGS: StoreSettings = {
  businessName: "Kenny's Premium Palm oil",
  banner: '/api/uploads/default_banner.svg',
  bannerSubtitle: '100% Unadulterated, Freshly Milled Nigerian Red Palm Oil from Edo & Delta Plantations',
  whatsappName: "Kenny's Premium Palm oil",
  whatsappNumber: '2347014685873',
  bankName: 'Opay',
  accountName: 'Samson Kehinde Favour',
  accountNumber: '7014685873',
};

export async function getFirestoreSettings(): Promise<StoreSettings> {
  const firestore = getFirestoreInstance();
  if (!firestore || !isFirebaseConfigured()) {
    return getLocalSettings() || DEFAULT_KENNY_SETTINGS;
  }

  try {
    const docRef = doc(firestore, 'settings', 'store');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<StoreSettings>;
      return {
        ...DEFAULT_KENNY_SETTINGS,
        ...data,
      };
    }

    // Seed default settings into Firestore
    await setDoc(docRef, DEFAULT_KENNY_SETTINGS);
    return DEFAULT_KENNY_SETTINGS;
  } catch (err) {
    console.error('Error fetching settings from Firestore:', err);
    return getLocalSettings() || DEFAULT_KENNY_SETTINGS;
  }
}

export async function updateFirestoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getFirestoreSettings();
  const updatedSettings: StoreSettings = {
    ...current,
    ...settings,
  };

  // 1. Update Firestore (Authoritative)
  const firestore = getFirestoreInstance();
  if (firestore && isFirebaseConfigured()) {
    try {
      const docRef = doc(firestore, 'settings', 'store');
      await setDoc(docRef, updatedSettings);
    } catch (err) {
      console.error('Firestore updateSettings error:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to save store settings in Firestore');
    }
  }

  // 2. Mirror to local DB cache
  try {
    updateLocalSettings(updatedSettings);
  } catch (e) {
    console.warn('Local settings update cache note:', e);
  }

  return updatedSettings;
}

// ==========================================
// ORDERS: PERSISTENT IN FIRESTORE
// ==========================================

export async function getFirestoreOrders(): Promise<Order[]> {
  const firestore = getFirestoreInstance();
  if (!firestore || !isFirebaseConfigured()) {
    return getLocalOrders();
  }

  try {
    const ordersCol = collection(firestore, 'orders');
    const snap = await getDocs(ordersCol);

    const orders: Order[] = [];
    snap.forEach((docSnap) => {
      orders.push(docSnap.data() as Order);
    });

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return orders;
  } catch (err) {
    console.error('Error fetching orders from Firestore:', err);
    return getLocalOrders();
  }
}

export async function createFirestoreOrder(order: Order): Promise<Order> {
  // 1. Save to Firestore (Authoritative)
  const firestore = getFirestoreInstance();
  if (firestore && isFirebaseConfigured()) {
    try {
      const docRef = doc(firestore, 'orders', order.orderId);
      await setDoc(docRef, order);
    } catch (err) {
      console.error('Firestore createOrder error:', err);
    }
  }

  // 2. Mirror to local DB
  try {
    createLocalOrder(order);
  } catch (e) {
    console.warn('Local order cache note:', e);
  }

  return order;
}

export async function updateFirestoreOrderStatus(
  orderId: string,
  status: 'Pending' | 'Confirmed' | 'Delivered'
): Promise<boolean> {
  const firestore = getFirestoreInstance();
  if (firestore && isFirebaseConfigured()) {
    try {
      const docRef = doc(firestore, 'orders', orderId);
      await setDoc(docRef, { orderStatus: status }, { merge: true });
    } catch (err) {
      console.error(`Firestore updateOrderStatus error for ${orderId}:`, err);
      return false;
    }
  }

  try {
    updateLocalOrderStatus(orderId, status);
  } catch {}

  return true;
}

export async function clearAllFirestoreOrders(): Promise<boolean> {
  const firestore = getFirestoreInstance();
  if (firestore && isFirebaseConfigured()) {
    try {
      const ordersCol = collection(firestore, 'orders');
      const snap = await getDocs(ordersCol);
      const batch = writeBatch(firestore);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error('Firestore clearAllOrders error:', err);
      return false;
    }
  }

  try {
    clearLocalOrders();
  } catch {}

  return true;
}
