import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import SmoothScroll from '@/components/SmoothScroll';

const GA_ID = 'G-HE25CGQHH4';

// The one public domain we want Google to rank. Everything SEO-facing (canonical
// URL, Open Graph, sitemap, structured data) points here so Google consolidates
// all ranking signals onto makeupbyroko.org instead of the raw vercel URL.
const CANONICAL_URL = 'https://makeupbyroko.org';

const DESCRIPTION = 'Luxury makeup artistry by Roqia Moshref (Makeup by Roko). Bridal, editorial, and special-occasion makeup plus makeup classes, serving the San Francisco Bay Area and traveling statewide.';

// Structured data so Google understands makeupbyroko.org is the official home of
// the "Makeup by Roko" brand and links every social profile back to it. This is
// what powers a knowledge panel and helps outrank look-alike sites.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'HealthAndBeautyBusiness',
  '@id': `${CANONICAL_URL}/#business`,
  name: 'Makeup by Roko',
  alternateName: ['Roqia Moshref Makeup Artistry', 'makeupbyroko'],
  description: DESCRIPTION,
  url: CANONICAL_URL,
  image: `${CANONICAL_URL}/roko_pic.png`,
  founder: { '@type': 'Person', name: 'Roqia Moshref' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Mountain House',
    addressRegion: 'CA',
    addressCountry: 'US',
  },
  areaServed: { '@type': 'Place', name: 'San Francisco Bay Area, California' },
  sameAs: [
    'https://www.instagram.com/makeupbyroko_/',
    'https://www.tiktok.com/@makeupbyroko',
  ],
};

export const metadata = {
  metadataBase: new URL(CANONICAL_URL),
  title: 'Makeup by Roko | Bay Area Bridal & Luxury Makeup Artist',
  description: DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Makeup by Roko | Bay Area Bridal & Luxury Makeup Artist',
    description: DESCRIPTION,
    url: CANONICAL_URL,
    siteName: 'Makeup by Roko',
    images: [
      {
        url: '/roko_pic.png',
        width: 1200,
        height: 630,
        alt: 'Roqia Moshref, Makeup by Roko',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Makeup by Roko | Bay Area Bridal & Luxury Makeup Artist',
    description: DESCRIPTION,
    images: ['/roko_pic.png'],
  },
};

// Its own export, not a `viewport` key on `metadata` — Next 14 moved it, and
// the old shape is ignored with a build warning.
//
// maximumScale/userScalable are deliberately absent. They used to be set to 1
// and false, which switches off pinch-to-zoom: on a site whose visitors are
// almost entirely on phones, that takes away the one gesture someone with low
// vision has for reading a price or a date. It fails WCAG 1.4.4, and the thing
// it is usually pasted in to prevent (iOS zooming a focused input) is already
// handled properly here by giving form fields a 16px font size.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
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
