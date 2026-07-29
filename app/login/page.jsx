'use client';
import dynamic from 'next/dynamic';
import BrandLoader from '../../src/components/BrandLoader';

// ssr:false means nothing paints until the app bundle lands, so the `loading`
// fallback is all that stands between the visitor and a blank white screen.
// See src/components/BrandLoader.jsx.
const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => <BrandLoader caption="Secure sign in" />,
});

export default function LoginPage() {
  return <LoginClient />;
}
