import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import initialDbJson from '@/data/database.json';
import {
  getProductsFromFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  getStoreSettingsFromFirestore,
  saveStoreSettingsToFirestore,
  saveOrderToFirestore,
} from './firestore-rest';

import { Product, StoreSettings } from './types';
export type { Product, StoreSettings };

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  orderId: string;
  customerName: string;
  customerLocation: string;
  customerWhatsApp: string;
  items: OrderItem[];
  total: number;
  paymentStatus: string; // 'Pending Bank Transfer' | 'Confirmed'
  orderStatus: 'Pending' | 'Confirmed' | 'Delivered';
  createdAt: string;
}


export interface AdminCredentials {
  username: string;
  passwordHash: string;
  sessions: string[]; // Active session tokens
}

export interface UploadedImageData {
  contentType: string;
  data: string; // base64 encoded
  size?: number;
  updatedAt?: string;
}

interface DatabaseSchema {
  products: Product[];
  orders: Order[];
  settings: StoreSettings;
  admin: AdminCredentials;
  uploadedImages?: Record<string, UploadedImageData>;
}

function getAppRoot(): string {
  if (typeof process !== 'undefined' && process.cwd) {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      return cwd;
    }
  }
  if (fs.existsSync('/app/applet/package.json')) {
    return '/app/applet';
  }
  return process.cwd ? process.cwd() : '.';
}

const APP_ROOT = getAppRoot();
const DATA_DIR = path.join(APP_ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Public static directories for Next.js and Vercel CDN static file serving
export const PUBLIC_DIR = path.join(APP_ROOT, 'public');
export const PUBLIC_UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
export const PUBLIC_API_UPLOADS_DIR = path.join(PUBLIC_DIR, 'api', 'uploads');

// Safe writable directory for serverless environments (e.g. Vercel, AWS Lambda)
export const TMP_DIR = path.join(os.tmpdir(), 'palm_oil_data');
export const TMP_DB_FILE = path.join(TMP_DIR, 'database.json');
export const TMP_UPLOADS_DIR = path.join(TMP_DIR, 'uploads');

function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem (e.g. Vercel / serverless runtime), ignore
  }

  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem, ignore
  }

  try {
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
      fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem, ignore
  }

  try {
    if (!fs.existsSync(PUBLIC_API_UPLOADS_DIR)) {
      fs.mkdirSync(PUBLIC_API_UPLOADS_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem, ignore
  }

  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
  } catch {
    // Ignore tmp error
  }

  try {
    if (!fs.existsSync(TMP_UPLOADS_DIR)) {
      fs.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });
    }
  } catch {
    // Ignore tmp error
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'salt_oroma_palm_oil_2025').digest('hex');
}

const DEFAULT_SETTINGS: StoreSettings = (initialDbJson?.settings as StoreSettings) || {
  businessName: "Kenny's Premium Palm oil",
  banner: '/api/uploads/default_banner.svg',
  bannerSubtitle: '100% Unadulterated, Freshly Milled Nigerian Red Palm Oil from Edo & Delta Plantations',
  whatsappName: "Kenny's Premium Palm oil",
  whatsappNumber: '2347014685873',
  bankName: 'Opay',
  accountName: 'Samson Kehinde Favour',
  accountNumber: '7014685873',
};

const DEFAULT_PRODUCTS: Product[] = ((initialDbJson as DatabaseSchema)?.products as Product[]) || [
  {
    id: 'prod_1l',
    name: '1 Litre Palm Oil (Food Grade Bottle)',
    price: 2500,
    description: 'Pure, fresh, unadulterated red palm oil in a sealed 1-litre tamper-proof bottle. Deep natural red color, zero odor, high smoking point. Perfect for everyday home cooking.',
    category: 'Packaged Palm Oil',
    imageUrl: '/api/uploads/sample_1l.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_2l',
    name: '2 Litres Palm Oil (Family Size)',
    price: 4800,
    description: 'Freshly tapped and milled palm oil directly from our village presses. Rich in vitamin E and beta-carotene with authentic Nigerian aroma. Sealed with safety cap.',
    category: 'Packaged Palm Oil',
    imageUrl: '/api/uploads/sample_2l.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_5l',
    name: '5 Litres Palm Oil (Kitchen Keg)',
    price: 11500,
    description: 'Durable 5L heavy-duty food-safe container with pour spout and carry handle. Thick consistency, pure sedimentation-free palm oil for family soups, stews, and frying.',
    category: 'Palm Oil',
    imageUrl: '/api/uploads/sample_5l.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_10l',
    name: '10 Litres Palm Oil (Catering Keg)',
    price: 22000,
    description: '10L keg of unrefined virgin red palm oil. Preferred by caterers, restaurants, and large families for its natural richness, zero chemical additives, and long shelf life.',
    category: 'Palm Oil',
    imageUrl: '/api/uploads/sample_10l.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_25l',
    name: '25 Litres Palm Oil (Commercial Jerrycan)',
    price: 52000,
    description: 'Standard 25L commercial yellow jerrycan. Milled under hygienic conditions from ripe Elaeis guineensis palm fruit bunches. Unbeatable commercial value and premium quality.',
    category: 'Bulk Palm Oil',
    imageUrl: '/api/uploads/sample_25l.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_50l',
    name: '50 Litres Palm Oil (Double Bulk Kegs)',
    price: 100000,
    description: 'Wholesale package consisting of two 25L commercial containers (50 Litres total). Guaranteed pure with thick red consistency. Highly sought after by market retailers.',
    category: 'Bulk Palm Oil',
    imageUrl: '/api/uploads/sample_50l.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_bulk_drum',
    name: 'Bulk Palm Oil (200 Litres Industrial Drum)',
    price: 380000,
    description: 'Heavy gauge steel/plastic 200L drum of unadulterated oil for industrial food processors, wholesale distributors, soap manufacturers, and large-scale catering operations.',
    category: 'Bulk Palm Oil',
    imageUrl: '/api/uploads/sample_drum.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const BUILT_IN_SVG_SAMPLES: Record<string, string> = {
    'default_banner.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
      <defs>
        <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7c2d12" />
          <stop offset="35%" stop-color="#c2410c" />
          <stop offset="70%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#fdba74" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#bannerGrad)" />
      <circle cx="950" cy="180" r="240" fill="url(#glow)" />
      <!-- Palm leaf silhouettes -->
      <path d="M 50 400 Q 150 180 350 250 Q 200 350 50 400 Z" fill="#9a3412" opacity="0.4"/>
      <path d="M 0 320 Q 200 120 450 200 Q 250 320 0 320 Z" fill="#431407" opacity="0.25"/>
      <g transform="translate(100, 110)">
        <rect x="0" y="0" width="180" height="32" rx="16" fill="#ffedd5" opacity="0.9" />
        <text x="16" y="21" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#c2410c">100% UNADULTERATED</text>
        <text x="0" y="80" font-family="system-ui, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.5">OROMA GOLDEN PALM OIL</text>
        <text x="0" y="125" font-family="system-ui, sans-serif" font-size="20" font-weight="400" fill="#ffedd5">Pure, Rich & Freshly Milled from Southern Nigerian Plantations</text>
        <g transform="translate(0, 160)">
          <rect width="210" height="48" rx="8" fill="#ffffff" />
          <text x="24" y="30" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ea580c">Browse Available Litres</text>
        </g>
      </g>
      <!-- Palm Oil Droplet art on right -->
      <g transform="translate(900, 120)">
        <path d="M 80 0 C 80 0 160 120 160 180 C 160 230 124 270 80 270 C 36 270 0 230 0 180 C 0 120 80 0 80 0 Z" fill="#ffedd5" opacity="0.25"/>
        <path d="M 80 25 C 80 25 145 130 145 180 C 145 220 115 250 80 250 C 45 250 15 220 15 180 C 15 130 80 25 80 25 Z" fill="#fdba74" opacity="0.6"/>
        <path d="M 80 50 C 80 50 130 140 130 180 C 130 210 105 235 80 235 C 55 235 30 210 30 180 C 30 140 80 50 80 50 Z" fill="#c2410c"/>
      </g>
    </svg>`,
    'banner_plantation.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
      <defs>
        <linearGradient id="plantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#431407" />
          <stop offset="40%" stop-color="#9a3412" />
          <stop offset="80%" stop-color="#c2410c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#plantGrad)" />
      <g opacity="0.15">
        <circle cx="1000" cy="200" r="300" fill="#ffffff" />
        <circle cx="200" cy="350" r="150" fill="#ffffff" />
      </g>
      <g transform="translate(100, 110)">
        <rect x="0" y="0" width="220" height="34" rx="17" fill="#ffedd5" opacity="0.95" />
        <text x="20" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#c2410c">EDO &amp; DELTA PLANTATIONS</text>
        <text x="0" y="85" font-family="system-ui, sans-serif" font-size="46" font-weight="900" fill="#ffffff" letter-spacing="-0.5">FRESH MILL-PRESSED RED OIL</text>
        <text x="0" y="130" font-family="system-ui, sans-serif" font-size="19" font-weight="500" fill="#ffedd5">Premium Harvested Elaeis Guineensis Palm Produce</text>
      </g>
    </svg>`,
    'banner_harvest.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
      <defs>
        <linearGradient id="harvestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7c2d12" />
          <stop offset="50%" stop-color="#c2410c" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#harvestGrad)" />
      <g transform="translate(100, 110)">
        <rect x="0" y="0" width="190" height="34" rx="17" fill="#fef3c7" opacity="0.95" />
        <text x="18" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#b45309">100% UNADULTERATED</text>
        <text x="0" y="85" font-family="system-ui, sans-serif" font-size="46" font-weight="900" fill="#ffffff" letter-spacing="-0.5">TRADITIONAL PALM PRESS</text>
        <text x="0" y="130" font-family="system-ui, sans-serif" font-size="19" font-weight="500" fill="#fed7aa">Direct From Rural Processing Mills Across Nigeria</text>
      </g>
    </svg>`,
    'sample_1l.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- Bottle neck and body -->
      <rect x="220" y="90" width="60" height="25" rx="5" fill="#ea580c" />
      <rect x="230" y="115" width="40" height="45" fill="#c2410c" />
      <!-- Bottle shoulder & body -->
      <path d="M 230 160 C 200 180 180 210 180 250 L 180 400 Q 180 415 195 415 L 305 415 Q 320 415 320 400 L 320 250 C 320 210 300 180 270 160 Z" fill="#c2410c" />
      <!-- Palm oil rich gradient fill inside bottle -->
      <path d="M 186 240 L 314 240 L 314 395 Q 314 407 302 407 L 198 407 Q 186 407 186 395 Z" fill="#9a3412" />
      <!-- Label -->
      <rect x="195" y="260" width="110" height="100" rx="6" fill="#fff7ed" />
      <rect x="202" y="268" width="96" height="20" rx="3" fill="#ea580c" />
      <text x="250" y="282" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#ffffff">PURE PALM OIL</text>
      <text x="250" y="318" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#9a3412">1 LITRE</text>
      <text x="250" y="342" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#c2410c">NO ADDITIVES</text>
      <!-- Cap details -->
      <rect x="215" y="70" width="70" height="22" rx="4" fill="#fb923c" />
    </svg>`,
    'sample_2l.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- Bottle neck and handle -->
      <rect x="220" y="75" width="60" height="25" rx="4" fill="#fb923c" />
      <rect x="228" y="100" width="44" height="40" fill="#c2410c" />
      <!-- 2L Bottle with handle -->
      <path d="M 228 140 C 185 165 160 200 160 250 L 160 405 Q 160 420 175 420 L 325 420 Q 340 420 340 405 L 340 250 C 340 200 315 165 272 140 Z" fill="#c2410c" />
      <!-- Side handle -->
      <path d="M 160 200 C 120 200 120 290 160 300 L 160 270 C 138 265 138 225 160 220 Z" fill="#9a3412" />
      <!-- Label -->
      <rect x="180" y="240" width="140" height="120" rx="8" fill="#ffffff" />
      <rect x="190" y="250" width="120" height="22" rx="4" fill="#ea580c" />
      <text x="250" y="266" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#ffffff">OROMA GOLDEN</text>
      <text x="250" y="308" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#9a3412">2 LITRES</text>
      <text x="250" y="335" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#c2410c">PREMIUM RED PALM OIL</text>
    </svg>`,
    'sample_5l.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- 5L Keg Body -->
      <rect x="140" y="160" width="220" height="250" rx="20" fill="#c2410c" />
      <!-- Top cap -->
      <rect x="170" y="115" width="50" height="45" rx="5" fill="#f97316" />
      <!-- Sturdy handle bridge -->
      <path d="M 230 125 L 330 125 L 330 160 L 230 160 Z" fill="#9a3412" />
      <path d="M 240 100 Q 280 80 320 100 L 320 125 L 240 125 Z" fill="#c2410c" />
      <!-- Front Label -->
      <rect x="165" y="210" width="170" height="150" rx="10" fill="#ffffff" />
      <rect x="175" y="222" width="150" height="28" rx="6" fill="#ea580c" />
      <text x="250" y="241" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff">NIGERIAN RED PALM OIL</text>
      <text x="250" y="295" text-anchor="middle" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="#9a3412">5 LITRES</text>
      <text x="250" y="330" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#c2410c">KITCHEN KEG • 100% PURE</text>
    </svg>`,
    'sample_10l.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- 10L Keg Body -->
      <rect x="125" y="145" width="250" height="275" rx="22" fill="#c2410c" />
      <!-- Top spouts and handle -->
      <rect x="155" y="105" width="55" height="40" rx="6" fill="#f97316" />
      <rect x="235" y="90" width="110" height="55" rx="8" fill="#9a3412" />
      <rect x="250" y="105" width="80" height="25" rx="5" fill="#fff7ed" />
      <!-- Front Label -->
      <rect x="150" y="210" width="200" height="160" rx="12" fill="#ffffff" />
      <rect x="165" y="224" width="170" height="30" rx="6" fill="#ea580c" />
      <text x="250" y="244" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff">CATERING QUALITY</text>
      <text x="250" y="302" text-anchor="middle" font-family="system-ui, sans-serif" font-size="42" font-weight="900" fill="#9a3412">10 LITRES</text>
      <text x="250" y="340" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#c2410c">UNREFINED VIRGIN OIL</text>
    </svg>`,
    'sample_25l.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- Yellow Commercial Jerrycan -->
      <rect x="110" y="140" width="280" height="290" rx="24" fill="#eab308" />
      <!-- Jerrycan ribs and handle -->
      <rect x="120" y="150" width="260" height="270" rx="20" fill="#facc15" />
      <!-- Heavy top handle -->
      <rect x="210" y="80" width="80" height="60" rx="10" fill="#ca8a04" />
      <rect x="225" y="95" width="50" height="30" rx="6" fill="#fff7ed" />
      <!-- Cap on corner -->
      <rect x="135" y="100" width="55" height="40" rx="6" fill="#ea580c" />
      <!-- Large Label -->
      <rect x="145" y="210" width="210" height="170" rx="12" fill="#ffffff" />
      <rect x="160" y="225" width="180" height="32" rx="6" fill="#ea580c" />
      <text x="250" y="246" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">COMMERCIAL JERRYCAN</text>
      <text x="250" y="310" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="900" fill="#9a3412">25 LITRES</text>
      <text x="250" y="352" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#c2410c">WHOLESALE &amp; COMMERCIAL</text>
    </svg>`,
    'sample_50l.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- Two 25L Jerrycans side by side -->
      <g transform="translate(-50, 0)">
        <rect x="120" y="150" width="190" height="270" rx="18" fill="#eab308" />
        <rect x="190" y="95" width="60" height="55" rx="8" fill="#ca8a04" />
        <rect x="135" y="110" width="45" height="40" rx="5" fill="#ea580c" />
      </g>
      <g transform="translate(110, 20)">
        <rect x="120" y="140" width="190" height="260" rx="18" fill="#facc15" stroke="#ca8a04" stroke-width="4" />
        <rect x="190" y="85" width="60" height="55" rx="8" fill="#ca8a04" />
        <rect x="135" y="100" width="45" height="40" rx="5" fill="#ea580c" />
      </g>
      <!-- Center badge -->
      <circle cx="250" cy="290" r="75" fill="#ffffff" stroke="#ea580c" stroke-width="5" />
      <text x="250" y="275" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#ea580c">2x 25L KEGS</text>
      <text x="250" y="315" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#9a3412">50L</text>
      <text x="250" y="338" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#c2410c">BULK VALUE</text>
    </svg>`,
    'sample_drum.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" fill="#fff7ed" />
      <circle cx="250" cy="250" r="190" fill="#ffedd5" />
      <!-- 200L Industrial Drum -->
      <rect x="120" y="110" width="260" height="320" rx="20" fill="#1e293b" />
      <!-- Drum ribs -->
      <line x1="120" y1="180" x2="380" y2="180" stroke="#475569" stroke-width="8" />
      <line x1="120" y1="280" x2="380" y2="280" stroke="#475569" stroke-width="8" />
      <line x1="120" y1="360" x2="380" y2="360" stroke="#475569" stroke-width="8" />
      <!-- Top drum lid and bungs -->
      <ellipse cx="250" cy="110" rx="130" ry="25" fill="#334155" />
      <circle cx="200" cy="110" r="10" fill="#94a3b8" />
      <circle cx="300" cy="110" r="14" fill="#94a3b8" />
      <!-- Drum hazard / label band -->
      <rect x="140" y="200" width="220" height="130" rx="8" fill="#ea580c" />
      <text x="250" y="235" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#ffffff">INDUSTRIAL SUPPLY</text>
      <text x="250" y="280" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" font-weight="900" fill="#ffffff">200 LITRES</text>
      <text x="250" y="310" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#ffedd5">STEEL DRUM • FACTORY GRADE</text>
    </svg>`,
};

function seedDefaultAssets() {
  ensureDirectories();

  for (const [filename, content] of Object.entries(BUILT_IN_SVG_SAMPLES)) {
    try {
      const filePath = path.join(UPLOADS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    } catch {
      // If UPLOADS_DIR is read-only, try TMP_UPLOADS_DIR
      try {
        const tmpPath = path.join(TMP_UPLOADS_DIR, filename);
        if (!fs.existsSync(tmpPath)) {
          fs.writeFileSync(tmpPath, content, 'utf-8');
        }
      } catch {
        // Fallback: svgSamples will be served from memory by /api/uploads/[filename]
      }
    }
  }
}

// In-memory runtime cache for serverless environments
let memoryDb: DatabaseSchema | null = null;
let lastLoadedMtime = 0;
let lastLoadedSource = '';

export function getDatabase(): DatabaseSchema {
  ensureDirectories();
  seedDefaultAssets();

  let primaryStats: fs.Stats | null = null;
  let tmpStats: fs.Stats | null = null;

  try {
    if (fs.existsSync(DB_FILE)) {
      primaryStats = fs.statSync(DB_FILE);
    }
  } catch {}

  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      tmpStats = fs.statSync(TMP_DB_FILE);
    }
  } catch {}

  // Determine which file is authoritative (the newer one)
  let candidateFile: string | null = null;
  let candidateMtime = 0;

  if (primaryStats && tmpStats) {
    if (tmpStats.mtimeMs > primaryStats.mtimeMs) {
      candidateFile = TMP_DB_FILE;
      candidateMtime = tmpStats.mtimeMs;
    } else {
      candidateFile = DB_FILE;
      candidateMtime = primaryStats.mtimeMs;
    }
  } else if (tmpStats) {
    candidateFile = TMP_DB_FILE;
    candidateMtime = tmpStats.mtimeMs;
  } else if (primaryStats) {
    candidateFile = DB_FILE;
    candidateMtime = primaryStats.mtimeMs;
  }

  // If memoryDb is already loaded and newer or equal to disk file mtime, reuse it
  if (memoryDb && candidateMtime > 0 && candidateMtime <= lastLoadedMtime) {
    return memoryDb;
  }

  // If candidate file exists, load it
  if (candidateFile) {
    try {
      const data = fs.readFileSync(candidateFile, 'utf-8');
      const parsed = JSON.parse(data) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.products) && parsed.settings) {
        memoryDb = parsed;
        lastLoadedMtime = candidateMtime;
        lastLoadedSource = candidateFile;

        // If TMP_DB_FILE was newer, attempt to sync it back to DB_FILE if DB_FILE is writable
        if (candidateFile === TMP_DB_FILE && primaryStats) {
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            const newStats = fs.statSync(DB_FILE);
            lastLoadedMtime = Math.max(lastLoadedMtime, newStats.mtimeMs);
          } catch {}
        }
        return memoryDb;
      }
    } catch (err) {
      console.warn(`Failed reading candidate file ${candidateFile}:`, err);
    }
  }

  // If memoryDb is already populated, return it
  if (memoryDb) {
    return memoryDb;
  }

  // Default fallback seed
  const fallbackDb: DatabaseSchema = {
    products: (initialDbJson as DatabaseSchema)?.products || DEFAULT_PRODUCTS,
    orders: (initialDbJson as DatabaseSchema)?.orders || [],
    settings: (initialDbJson as DatabaseSchema)?.settings || DEFAULT_SETTINGS,
    admin: (initialDbJson as DatabaseSchema)?.admin || {
      username: 'admin',
      passwordHash: hashPassword('palmoil2025'),
      sessions: [],
    },
  };

  memoryDb = fallbackDb;
  lastLoadedMtime = Date.now();

  try {
    if (!fs.existsSync(TMP_DB_FILE)) {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(fallbackDb, null, 2), 'utf-8');
      lastLoadedMtime = fs.statSync(TMP_DB_FILE).mtimeMs;
    }
  } catch {}

  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(fallbackDb, null, 2), 'utf-8');
      lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
    }
  } catch {}

  return memoryDb;
}

export function saveDatabase(data: DatabaseSchema): void {
  // Always update in-memory cache first
  memoryDb = data;
  ensureDirectories();

  let maxMtime = Date.now();

  // 1. Write to TMP_DB_FILE (always writable even in serverless)
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    const tmpStat = fs.statSync(TMP_DB_FILE);
    if (tmpStat.mtimeMs > maxMtime) maxMtime = tmpStat.mtimeMs;
  } catch (err) {
    console.warn('Notice: TMP_DB_FILE write note:', err);
  }

  // 2. Write to primary DB_FILE (authoritative when persistent filesystem is available)
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    const primaryStat = fs.statSync(DB_FILE);
    if (primaryStat.mtimeMs > maxMtime) maxMtime = primaryStat.mtimeMs;
  } catch (err) {
    // Read-only filesystem on serverless, completely safe
  }

  lastLoadedMtime = maxMtime;
}

// ----------------- Product Operations -----------------

/**
 * Authoritative cloud fetch from Firestore.
 * Updates local memoryDb cache and returns latest products.
 */
export async function fetchProductsAsync(includeUnpublished = false): Promise<Product[]> {
  try {
    const cloudProducts = await getProductsFromFirestore(includeUnpublished);
    if (cloudProducts !== null) {
      const db = getDatabase();
      if (includeUnpublished) {
        db.products = cloudProducts;
      } else {
        const unpublished = db.products.filter((p) => p.isPublished === false);
        const existingIds = new Set(cloudProducts.map((p) => p.id));
        db.products = [...cloudProducts, ...unpublished.filter((p) => !existingIds.has(p.id))];
      }
      saveDatabase(db);
      return cloudProducts;
    }
  } catch (err) {
    console.warn('Notice: Firestore product fetch notice:', err);
  }
  return getAllProducts(includeUnpublished);
}

export function getAllProducts(includeUnpublished = false): Product[] {
  const db = getDatabase();
  const list = includeUnpublished
    ? db.products
    : db.products.filter((p) => p.isPublished !== false);

  // Return sorted by sortOrder if available, or maintain saved order
  return [...list].sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    return 0;
  });
}

export function getProductById(id: string): Product | null {
  const db = getDatabase();
  return db.products.find((p) => p.id === id) || null;
}

export async function createProductAsync(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const newProduct = createProduct(product);
  try {
    await saveProductToFirestore(newProduct);
  } catch (err) {
    console.warn('Notice: Firestore product creation notice:', err);
  }
  return newProduct;
}

export function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
  const db = getDatabase();
  const numericPrice = Number(product.price);
  const numericQty = product.quantity !== undefined ? Number(product.quantity) : 100;
  const numericSortOrder = product.sortOrder !== undefined ? Number(product.sortOrder) : undefined;

  const newProduct: Product = {
    id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: product.name.trim(),
    price: isNaN(numericPrice) || numericPrice <= 0 ? 0 : numericPrice,
    quantity: isNaN(numericQty) || numericQty < 0 ? 100 : numericQty,
    description: product.description.trim(),
    category: product.category.trim() || 'Palm Oil',
    imageUrl: product.imageUrl.trim() || '/api/uploads/sample_1l.svg',
    isPublished: product.isPublished !== false, // default to true
    sortOrder: numericSortOrder !== undefined && !isNaN(numericSortOrder) ? numericSortOrder : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.products.unshift(newProduct);
  saveDatabase(db);

  // Background sync to Firestore
  saveProductToFirestore(newProduct).catch((err) => {
    console.warn('Background firestore product save notice:', err);
  });

  return newProduct;
}

export async function updateProductAsync(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product | null> {
  const updated = updateProduct(id, updates);
  if (updated) {
    try {
      await saveProductToFirestore(updated);
    } catch (err) {
      console.warn('Notice: Firestore product update notice:', err);
    }
  }
  return updated;
}

export function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Product | null {
  const db = getDatabase();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = db.products[index];
  const updated: Product = {
    ...current,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    price: updates.price !== undefined ? Number(updates.price) : current.price,
    quantity: updates.quantity !== undefined ? Number(updates.quantity) : (current.quantity ?? 100),
    description: updates.description !== undefined ? updates.description.trim() : current.description,
    category: updates.category !== undefined ? updates.category.trim() : current.category,
    imageUrl: updates.imageUrl !== undefined ? updates.imageUrl.trim() : current.imageUrl,
    isPublished: updates.isPublished !== undefined ? Boolean(updates.isPublished) : (current.isPublished !== false),
    sortOrder: updates.sortOrder !== undefined ? Number(updates.sortOrder) : current.sortOrder,
    updatedAt: new Date().toISOString(),
  };

  db.products[index] = updated;
  saveDatabase(db);

  // Background sync to Firestore
  saveProductToFirestore(updated).catch((err) => {
    console.warn('Background firestore product update notice:', err);
  });

  return updated;
}

export async function deleteProductAsync(id: string): Promise<boolean> {
  const deleted = deleteProduct(id);
  if (deleted) {
    try {
      await deleteProductFromFirestore(id);
    } catch (err) {
      console.warn('Notice: Firestore product delete notice:', err);
    }
  }
  return deleted;
}

export function deleteProduct(id: string): boolean {
  const db = getDatabase();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return false;

  const [removed] = db.products.splice(index, 1);
  saveDatabase(db);

  // Background delete from Firestore
  deleteProductFromFirestore(id).catch((err) => {
    console.warn('Background firestore product delete notice:', err);
  });

  // If the removed product had a custom uploaded image in our uploads dir (not sample SVGs),
  // clean up the physical file
  if (removed.imageUrl && removed.imageUrl.startsWith('/api/uploads/')) {
    const filename = removed.imageUrl.replace('/api/uploads/', '');
    if (!filename.startsWith('sample_') && !filename.startsWith('default_')) {
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Failed to delete associated image:', e);
        }
      }
    }
  }

  return true;
}

// ----------------- Order Operations -----------------

export function getAllOrders(): Order[] {
  const db = getDatabase();
  return db.orders;
}

export function createOrder(data: {
  customerName: string;
  customerLocation: string;
  customerWhatsApp: string;
  items: OrderItem[];
  total: number;
}): Order {
  const db = getDatabase();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const orderId = `PO-${randomSuffix}`;

  const newOrder: Order = {
    orderId,
    customerName: data.customerName.trim(),
    customerLocation: data.customerLocation.trim(),
    customerWhatsApp: data.customerWhatsApp.trim(),
    items: data.items,
    total: data.total,
    paymentStatus: 'Pending',
    orderStatus: 'Pending',
    createdAt: new Date().toISOString(),
  };

  db.orders.unshift(newOrder);
  saveDatabase(db);
  return newOrder;
}

export function updateOrderStatus(orderId: string, orderStatus: Order['orderStatus'], paymentStatus?: string): Order | null {
  const db = getDatabase();
  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) return null;

  order.orderStatus = orderStatus;
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  } else if (orderStatus === 'Confirmed' || orderStatus === 'Delivered') {
    order.paymentStatus = 'Payment Confirmed';
  }

  saveDatabase(db);
  return order;
}

export function resetOrders(): boolean {
  const db = getDatabase();
  db.orders = [];
  saveDatabase(db);
  return true;
}

// ----------------- Store Settings -----------------

export async function fetchStoreSettingsAsync(): Promise<StoreSettings> {
  try {
    const cloudSettings = await getStoreSettingsFromFirestore();
    if (cloudSettings !== null) {
      const db = getDatabase();
      db.settings = cloudSettings;
      saveDatabase(db);
      return cloudSettings;
    }
  } catch (err) {
    console.warn('Notice: Firestore settings fetch notice:', err);
  }
  return getStoreSettings();
}

export function getStoreSettings(): StoreSettings {
  const db = getDatabase();
  return db.settings;
}

export async function updateStoreSettingsAsync(newSettings: Partial<StoreSettings>): Promise<StoreSettings> {
  const updated = updateStoreSettings(newSettings);
  try {
    await saveStoreSettingsToFirestore(updated);
  } catch (err) {
    console.warn('Notice: Firestore settings update notice:', err);
  }
  return updated;
}

export function updateStoreSettings(newSettings: Partial<StoreSettings>): StoreSettings {
  const db = getDatabase();
  db.settings = {
    ...db.settings,
    ...newSettings,
  };
  saveDatabase(db);

  // Background sync to Firestore
  saveStoreSettingsToFirestore(db.settings).catch((err) => {
    console.warn('Background firestore settings save notice:', err);
  });

  return db.settings;
}

// ----------------- Admin Auth -----------------

const SESSION_SECRET = 'oroma_admin_jwt_secret_salt_2025_kenny';

export function extractTokenFromRequest(request: {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
  nextUrl?: { searchParams: { get(name: string): string | null } };
}): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const clean = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (clean) return clean;
  }
  const cookieVal = request.cookies.get('admin_token')?.value?.trim();
  if (cookieVal) return cookieVal;

  if (request.nextUrl) {
    const queryToken = request.nextUrl.searchParams.get('token')?.trim();
    if (queryToken) return queryToken;
  }
  return '';
}

export function verifyAdminPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  const trimmed = password.trim();
  const db = getDatabase();
  const hash = hashPassword(trimmed);
  const rawHash = hashPassword(password);

  // Check against stored password hash
  if (db.admin && (db.admin.passwordHash === hash || db.admin.passwordHash === rawHash)) {
    return true;
  }

  // Master recovery fallback password: palmoil2025
  const defaultMasterHash = hashPassword('palmoil2025');
  if (hash === defaultMasterHash || rawHash === defaultMasterHash) {
    return true;
  }

  return false;
}

export function createAdminSession(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  const payload = `adm_${timestamp}_${random}`;
  // Pure stateless HMAC signature using server secret
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  const token = `${payload}.${signature}`;

  try {
    const db = getDatabase();
    if (!db.admin) {
      db.admin = {
        username: 'admin',
        passwordHash: hashPassword('palmoil2025'),
        sessions: [],
      };
    }
    if (!Array.isArray(db.admin.sessions)) {
      db.admin.sessions = [];
    }
    db.admin.sessions.push(token);
    if (db.admin.sessions.length > 20) {
      db.admin.sessions = db.admin.sessions.slice(-20);
    }
    saveDatabase(db);
  } catch {
    // Stateless token is valid on its own even if persistence fails
  }

  return token;
}

export function isValidAdminSession(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  let clean = token.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();
  if (!clean) return false;

  // 1. Check stateless HMAC cryptographic signature (works identically on ALL serverless instances)
  if (clean.includes('.')) {
    const [payload, signature] = clean.split('.');
    if (payload && signature) {
      // Primary verification: Pure stateless HMAC signature
      const expectedPureSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(payload)
        .digest('hex');

      // Secondary verification: Password-bound HMAC signature (for backward compatibility)
      let expectedHashBoundSig = '';
      try {
        const db = getDatabase();
        const currentHash = db.admin?.passwordHash || hashPassword('palmoil2025');
        expectedHashBoundSig = crypto
          .createHmac('sha256', SESSION_SECRET)
          .update(`${payload}:${currentHash}`)
          .digest('hex');
      } catch {
        // Ignore DB read failure
      }

      // Tertiary verification: Default master password-bound signature
      const expectedMasterBoundSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${payload}:${hashPassword('palmoil2025')}`)
        .digest('hex');

      const isPureMatch =
        Buffer.byteLength(signature) === Buffer.byteLength(expectedPureSig) &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedPureSig));

      const isHashBoundMatch =
        expectedHashBoundSig.length > 0 &&
        Buffer.byteLength(signature) === Buffer.byteLength(expectedHashBoundSig) &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHashBoundSig));

      const isMasterBoundMatch =
        Buffer.byteLength(signature) === Buffer.byteLength(expectedMasterBoundSig) &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedMasterBoundSig));

      if (isPureMatch || isHashBoundMatch || isMasterBoundMatch) {
        const parts = payload.split('_');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[1], 10);
          if (!isNaN(timestamp)) {
            const age = Date.now() - timestamp;
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            // Allow 5 minutes clock skew between serverless regions
            if (age >= -300000 && age < maxAge) {
              return true;
            }
          }
        }
      }
    }
  }

  // 2. Check in-memory or persisted sessions list (backward compatibility)
  try {
    const db = getDatabase();
    if (db.admin && Array.isArray(db.admin.sessions) && db.admin.sessions.includes(clean)) {
      return true;
    }
  } catch {
    // Ignore db read error
  }

  return false;
}

export function clearAdminSession(token: string): void {
  const db = getDatabase();
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  if (db.admin && Array.isArray(db.admin.sessions)) {
    db.admin.sessions = db.admin.sessions.filter((t) => t !== clean && t !== token);
    saveDatabase(db);
  }
}

export function changeAdminPassword(oldPassword: string, newPassword: string): boolean {
  const db = getDatabase();
  if (!verifyAdminPassword(oldPassword)) {
    return false;
  }
  const cleanNew = newPassword.trim();
  db.admin.passwordHash = hashPassword(cleanNew);
  db.admin.sessions = []; // Revoke previous sessions on password change
  saveDatabase(db);
  return true;
}

export function saveUploadedImage(filename: string, contentType: string, buffer: Buffer): void {
  const db = getDatabase();
  if (!db.uploadedImages) {
    db.uploadedImages = {};
  }
  db.uploadedImages[filename] = {
    contentType,
    data: buffer.toString('base64'),
    size: buffer.length,
    updatedAt: new Date().toISOString(),
  };
  saveDatabase(db);
}

export function getUploadedImage(filename: string): { contentType: string; buffer: Buffer } | null {
  const db = getDatabase();
  const item = db.uploadedImages?.[filename];
  if (item && item.data) {
    return {
      contentType: item.contentType || 'image/jpeg',
      buffer: Buffer.from(item.data, 'base64'),
    };
  }
  return null;
}
