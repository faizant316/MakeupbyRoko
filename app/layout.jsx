import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import SmoothScroll from '@/components/SmoothScroll';

const GA_ID = 'G-HE25CGQHH4';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Makeup by Roko',
  description: 'Luxury makeup artistry by Roqia Moshref. Bridal, editorial, special occasions, and makeup classes in the Bay Area.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: 'Makeup by Roko',
    description: 'Luxury makeup artistry by Roqia Moshref. Bridal, editorial, special occasions, and makeup classes in the Bay Area.',
    url: siteUrl,
    siteName: 'Makeup by Roko',
    images: [
      {
        url: '/roko_pic.png',
        width: 1200,
        height: 630,
        alt: 'Roqia Moshref — Makeup by Roko',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Makeup by Roko',
    description: 'Luxury makeup artistry by Roqia Moshref. Bridal, editorial, special occasions, and makeup classes in the Bay Area.',
    images: ['/roko_pic.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        <Providers>{children}</Providers>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>
      </body>
    </html>
  );
}
