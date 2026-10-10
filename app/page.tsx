import { getAllProducts, getStoreSettings } from '@/lib/db';
import { StoreFront } from '@/components/StoreFront';
import { Product, StoreSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function HomePage() {
  let products: Product[] = [];
  let settings: StoreSettings = {
    businessName: "Kenny's Premium Palm oil",
    banner: '/api/uploads/default_banner.svg',
    bannerSubtitle: '100% Unadulterated, Freshly Milled Nigerian Red Palm Oil from Edo & Delta Plantations',
    whatsappName: "Kenny's Premium Palm oil",
    whatsappNumber: '2347014685873',
    bankName: 'Opay',
    accountName: 'Samson Kehinde Favour',
    accountNumber: '7014685873',
  };
  let initialDbError = false;

  try {
    products = getAllProducts();
    settings = getStoreSettings();
  } catch (err) {
    console.error('Database read error in HomePage:', err);
    initialDbError = true;
  }

  return (
    <StoreFront
      initialProducts={products}
      initialSettings={settings}
      initialDbError={initialDbError}
    />
  );
}
