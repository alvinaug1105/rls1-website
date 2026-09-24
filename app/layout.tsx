import type { Metadata, Viewport } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';
import './globals.css';
import './polish.css';
import './ui.css';

const title = 'RLS1 eSports — Race week, results and championship';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title,
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_GB',
    images: [
      {
        url: '/og.png',
        width: 1733,
        height: 908,
        alt: 'RLS1 eSports — Season 01. Results, Championships, The Paddock.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
    title,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0d11',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
