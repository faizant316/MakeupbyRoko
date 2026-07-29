'use client';
import dynamic from 'next/dynamic';
import BrandLoader from '../../src/components/BrandLoader';

// ssr:false means nothing paints until the app bundle lands, so the `loading`
// fallback is all that stands between the visitor and a blank white screen.
// See src/components/BrandLoader.jsx.
const AdminInvite = dynamic(() => import('../../src/views/AdminInvite'), {
  ssr: false,
  loading: () => <BrandLoader caption="Preparing your invite" />,
});

export default function AdminInvitePage() {
  return <AdminInvite />;
}
