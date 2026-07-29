'use client';
import dynamic from 'next/dynamic';
import BrandLoader from '../../src/components/BrandLoader';

// The branded loader is passed to next/dynamic as the `loading` fallback, so Next
// renders it into the INITIAL server HTML even though the app itself is
// client-only (ssr:false). The moment a client taps the email button they see
// brand paint immediately, on any connection, instead of a blank screen while the
// app bundle downloads. Do NOT revert this to a bare dynamic re-export.
const UploadZelle = dynamic(() => import('../../src/views/UploadZelle'), {
  ssr: false,
  loading: () => <BrandLoader caption="Preparing your secure upload" />,
});

export default function UploadZellePage() {
  return <UploadZelle />;
}
