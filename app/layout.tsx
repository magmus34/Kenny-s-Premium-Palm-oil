import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Oroma Palm Oil Store | Pure & Unadulterated Nigerian Palm Oil',
  description: 'Premium pure and unadulterated Nigerian palm oil online store with guest checkout and store management.',
  openGraph: {
    title: 'Oroma Palm Oil Store | Pure & Unadulterated Nigerian Palm Oil',
    description: 'Premium pure and unadulterated Nigerian palm oil online store with guest checkout and store management.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oroma Palm Oil Store | Pure & Unadulterated Nigerian Palm Oil',
    description: 'Premium pure and unadulterated Nigerian palm oil online store with guest checkout and store management.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
