'use client';
import dynamic from 'next/dynamic';
import BrandLoader from '../src/components/BrandLoader';

// ssr:false means the page paints nothing until the app bundle lands, so the
// `loading` fallback is what stands between a visitor and a blank white screen.
// See src/components/BrandLoader.jsx.
const ServicesPage = dynamic(() => import('../src/views/Services'), {
  ssr: false,
  loading: () => <BrandLoader caption="Loading the studio" />,
});

export default function HomePage() {
  return <ServicesPage />;
}
