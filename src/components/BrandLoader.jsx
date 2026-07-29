// The site's ONE loading screen. Dependency-free and styled inline on purpose:
// this is used as the `loading` fallback for next/dynamic, so Next renders it
// into the INITIAL server HTML even on pages that are client-only (ssr: false).
// It therefore has to look correct before Tailwind, the custom font, or any app
// CSS has downloaded. Do not convert this to Tailwind classes or import it into
// a stylesheet-dependent path (that reintroduces the blank-white-screen bug this
// component exists to kill).
//
// The motion is the brand's one motif: a rose hairline that sweeps left to right,
// the same brush-stroke travel as svcSweep in index.css. Nothing spins.
//
// The wordmark and bar paint with NO entrance animation so the brand is on screen
// on the very first frame; only the caption fades up behind it.
//
// Props:
//   caption - what is actually happening, e.g. "Preparing your secure upload"

const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const CSS = `
@keyframes rokoSweep{0%{transform:translateX(-120%)}100%{transform:translateX(260%)}}
@keyframes rokoCaptionIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.roko-load-bar{animation:rokoSweep 1.05s cubic-bezier(.4,0,.2,1) infinite}
.roko-load-cap{animation:rokoCaptionIn .5s cubic-bezier(.22,1,.36,1) .12s both}
@media (prefers-reduced-motion:reduce){
.roko-load-bar{animation:none;width:100%;opacity:.4}
.roko-load-cap{animation:none}
}
`;

export default function BrandLoader({ caption = 'One moment' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF6F8 100%)',
        fontFamily: SANS,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.7rem', fontWeight: 300, lineHeight: 1, color: '#2C1A14', margin: 0 }}>
          Makeup by <em style={{ fontStyle: 'italic', color: '#C4849A' }}>Roko</em>
        </p>
        <div
          style={{
            marginTop: 16,
            height: 3,
            width: 128,
            marginLeft: 'auto',
            marginRight: 'auto',
            borderRadius: 999,
            overflow: 'hidden',
            background: '#F1E2EA',
          }}
        >
          <div
            className="roko-load-bar"
            style={{ height: '100%', width: '33%', borderRadius: 999, background: '#C4849A' }}
          />
        </div>
        <p
          className="roko-load-cap"
          style={{
            marginTop: 20,
            fontSize: '0.58rem',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#A89098',
            margin: '20px 0 0',
          }}
        >
          {caption}
        </p>
      </div>
    </div>
  );
}
