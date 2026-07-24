'use client';
import dynamic from 'next/dynamic';

// Branded, dependency-free loader. Passed to next/dynamic as the `loading`
// fallback, so Next renders it into the INITIAL server HTML even though the app
// itself is client-only (ssr:false). The moment a client taps the email button,
// they see this brand paint immediately, on any connection, instead of a blank
// screen while the app bundle downloads. Styles are inline (no Tailwind / custom
// font dependency) so it renders correctly before any stylesheet has loaded.
function UploadLoader() {
  const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF6F8 100%)',
        fontFamily: sans,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: '@keyframes uzBoot{0%{transform:translateX(-120%)}100%{transform:translateX(260%)}}' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.7rem', fontWeight: 300, lineHeight: 1, color: '#2C1A14', margin: 0 }}>
          Makeup by <em style={{ fontStyle: 'italic', color: '#C4849A' }}>Roko</em>
        </p>
        <div style={{ marginTop: 16, height: 3, width: 128, marginLeft: 'auto', marginRight: 'auto', borderRadius: 999, overflow: 'hidden', background: '#F1E2EA' }}>
          <div style={{ height: '100%', width: '33%', borderRadius: 999, background: '#C4849A', animation: 'uzBoot 1.05s cubic-bezier(.4,0,.2,1) infinite' }} />
        </div>
        <p style={{ marginTop: 20, fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#A89098' }}>
          Preparing your secure upload
        </p>
      </div>
    </div>
  );
}

const UploadZelle = dynamic(() => import('../../src/views/UploadZelle'), {
  ssr: false,
  loading: () => <UploadLoader />,
});

export default function UploadZellePage() {
  return <UploadZelle />;
}
