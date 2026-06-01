'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DevSwitcher() {
  const path = usePathname();
  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      gap: '6px',
      background: 'rgba(15,12,10,0.88)',
      backdropFilter: 'blur(12px)',
      borderRadius: '999px',
      padding: '5px 8px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center', paddingLeft: '4px', paddingRight: '2px' }}>DEV</span>
      {[
        { label: 'Home', href: '/' },
        { label: 'Admin', href: '/admin' },
      ].map(({ label, href }) => {
        const active = path === href || (href !== '/' && path.startsWith(href));
        return (
          <Link key={href} href={href} style={{
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 500,
            letterSpacing: '0.03em',
            textDecoration: 'none',
            background: active ? '#D4A0B0' : 'transparent',
            color: active ? '#fff' : 'rgba(255,255,255,0.55)',
            transition: 'all 0.15s',
          }}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
