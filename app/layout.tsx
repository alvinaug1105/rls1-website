import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rls-website.alvin1105alvin.workers.dev/'),
  title: 'RLS1 eSports — Season 01',
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    title: 'RLS1 eSports — Season 01',
    description:
      'Race results, qualifying, championship standings and the driver paddock.',
    url: 'https://rls-website.alvin1105alvin.workers.dev/',
    siteName: 'RLS1 eSports',
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
    title: 'RLS1 eSports — Season 01',
    description: 'Race results, qualifying and the championship title fight.',
  },
  description:
    'Qualifying, race results, championship standings and stories from the RLS1 racing community.',
};

export const viewport: Viewport = {
  themeColor: '#0b101b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
