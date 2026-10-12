/**
 * Direct, ultra-fast Firestore REST client using standard fetch.
 * Designed to work reliably in Node.js, Next.js App Router, and Vercel Serverless.
 * Bypasses long-polling / WebChannel overhead of client SDKs in server environments.
 */

import appletConfig from '../firebase-applet-config.json';
import { Product, StoreSettings } from './types';

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  appletConfig.projectId;

const DATABASE_ID =
  appletConfig.firestoreDatabaseId ||
  process.env.FIREBASE_DATABASE_ID ||
  '(default)';

const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  appletConfig.apiKey;

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

// Helper: Convert JS Value to Firestore REST Field Value
function jsValueToFirestore(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => jsValueToFirestore(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = jsValueToFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Helper: Convert Firestore REST Field Value to JS Value
function firestoreValueToJs(field: Record<string, any>): unknown {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) {
    return (field.arrayValue?.values || []).map((v: any) => firestoreValueToJs(v));
  }
  if ('mapValue' in field) {
    const obj: Record<string, unknown> = {};
    const fields = field.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = firestoreValueToJs(v as any);
    }
    return obj;
  }
  return null;
}

// Convert Firestore REST document to Product
function docToProduct(doc: any): Product {
  const fields = doc.fields || {};
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = firestoreValueToJs(v as any);
  }

  // Derive ID from document name if not in fields
  const pathParts = (doc.name || '').split('/');
  const docId = pathParts[pathParts.length - 1];

  return {
    id: data.id || docId,
    name: data.name || '',
    price: Number(data.price) || 0,
    quantity: data.quantity !== undefined ? Number(data.quantity) : 100,
    description: data.description || '',
    category: data.category || 'Palm Oil',
    imageUrl: data.imageUrl || '/api/uploads/sample_1l.svg',
    isPublished: data.isPublished !== false,
    sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
    createdAt: data.createdAt || doc.createTime || new Date().toISOString(),
    updatedAt: data.updatedAt || doc.updateTime || new Date().toISOString(),
  };
}

// Convert Product to Firestore REST fields
function productToFields(prod: Product): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(prod)) {
    if (v !== undefined) {
      fields[k] = jsValueToFirestore(v);
    }
  }
  return fields;
}

/**
 * Checks if Firestore has been initialized with the meta flag.
 */
export async function isFirestoreInitialized(): Promise<boolean> {
  try {
    const url = `${BASE_URL}/settings/meta?key=${API_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 200) {
      const data = await res.json();
      const val = firestoreValueToJs(data?.fields?.initialized);
      return val === true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sets the initialized flag in Firestore so default products are NEVER restored after user deletes them.
 */
export async function markFirestoreInitialized(): Promise<void> {
  try {
    const url = `${BASE_URL}/settings/meta?key=${API_KEY}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          initialized: { booleanValue: true },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      }),
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('Failed marking firestore as initialized:', err);
  }
}

/**
 * Fetches all products from Firestore collection /products using :runQuery.
 * Returns null if Firestore could not be contacted.
 */
export async function getProductsFromFirestore(includeUnpublished = false): Promise<Product[] | null> {
  try {
    const url = `${BASE_URL}:runQuery?key=${API_KEY}`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'products' }],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(query),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`Firestore runQuery returned HTTP ${res.status}`);
      return null;
    }

    const items = await res.json();
    const products: Product[] = [];

    for (const item of items) {
      if (item.document) {
        products.push(docToProduct(item.document));
      }
    }

    const filtered = includeUnpublished
      ? products
      : products.filter((p) => p.isPublished !== false);

    // Sort by sortOrder then createdAt
    return filtered.sort((a, b) => {
      const soA = a.sortOrder ?? 0;
      const soB = b.sortOrder ?? 0;
      if (soA !== soB) return soA - soB;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  } catch (err) {
    console.error('Error fetching products from Firestore REST:', err);
    return null;
  }
}

/**
 * Saves or updates a product in Firestore /products/{id}.
 */
export async function saveProductToFirestore(product: Product): Promise<boolean> {
  try {
    const url = `${BASE_URL}/products/${product.id}?key=${API_KEY}`;
    const fields = productToFields(product);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Firestore save product failed: HTTP ${res.status}`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error saving product to Firestore REST:', err);
    return false;
  }
}

/**
 * Permanently deletes a product from Firestore /products/{id}.
 */
export async function deleteProductFromFirestore(id: string): Promise<boolean> {
  try {
    const url = `${BASE_URL}/products/${id}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'DELETE',
      cache: 'no-store',
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      console.error(`Firestore delete product failed: HTTP ${res.status}`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting product from Firestore REST:', err);
    return false;
  }
}

/**
 * Gets store settings from Firestore /settings/store.
 */
export async function getStoreSettingsFromFirestore(): Promise<StoreSettings | null> {
  try {
    const url = `${BASE_URL}/settings/store?key=${API_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const doc = await res.json();
    const fields = doc.fields || {};
    const data: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      data[k] = firestoreValueToJs(v as any);
    }

    return {
      businessName: data.businessName || "Kenny's Premium Palm oil",
      banner: data.banner || '/api/uploads/default_banner.svg',
      bannerSubtitle:
        data.bannerSubtitle ||
        '100% Unadulterated, Freshly Milled Nigerian Red Palm Oil from Edo & Delta Plantations',
      whatsappName: data.whatsappName || "Kenny's Premium Palm oil",
      whatsappNumber: data.whatsappNumber || '2347014685873',
      bankName: data.bankName || 'Opay',
      accountName: data.accountName || 'Samson Kehinde Favour',
      accountNumber: data.accountNumber || '7014685873',
    };
  } catch (err) {
    console.warn('Error reading store settings from Firestore:', err);
    return null;
  }
}

/**
 * Saves store settings to Firestore /settings/store.
 */
export async function saveStoreSettingsToFirestore(settings: StoreSettings): Promise<boolean> {
  try {
    const url = `${BASE_URL}/settings/store?key=${API_KEY}`;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(settings)) {
      if (v !== undefined) {
        fields[k] = jsValueToFirestore(v);
      }
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      cache: 'no-store',
    });

    return res.ok;
  } catch (err) {
    console.error('Error saving store settings to Firestore:', err);
    return false;
  }
}

/**
 * Saves a customer order to Firestore /orders/{orderId}.
 */
export async function saveOrderToFirestore(order: any): Promise<boolean> {
  try {
    const url = `${BASE_URL}/orders/${order.orderId}?key=${API_KEY}`;
    const fields: Record<string, unknown> = {
      orderId: { stringValue: order.orderId },
      customerName: { stringValue: order.customerName },
      customerLocation: { stringValue: order.customerLocation },
      customerWhatsApp: { stringValue: order.customerWhatsApp },
      itemsJson: { stringValue: JSON.stringify(order.items || []) },
      total: { doubleValue: Number(order.total) || 0 },
      paymentStatus: { stringValue: order.paymentStatus || 'Pending' },
      orderStatus: { stringValue: order.orderStatus || 'Pending' },
      createdAt: { stringValue: order.createdAt || new Date().toISOString() },
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      cache: 'no-store',
    });

    return res.ok;
  } catch (err) {
    console.warn('Error saving order to Firestore:', err);
    return false;
  }
}

