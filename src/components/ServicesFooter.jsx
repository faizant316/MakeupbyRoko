import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InfoModal from './InfoModal';
import { base44 } from '@/api/apiClient';

export default function ServicesFooter() {
  const currentYear = new Date().getFullYear();
  const [activeTopic, setActiveTopic] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    base44.auth.me().then(u => { if (u?.role === 'admin') setIsAdmin(true); }).catch(() => {});
  }, []);

  return (
    <>
      <footer className="bg-[#111] border-t border-[#222]">
      <div className="max-w-[1200px] mx-auto px-[clamp(1.25rem,5vw,3rem)] py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="font-serif text-2xl text-white mb-3 tracking-wide">Roqia Moshref</h3>
            <p className="text-[0.8rem] text-[#888] leading-[1.8] max-w-[280px]">
              Makeup Artist + Content Creator based in Mountain House, California. Traveling artist available for destination bookings ✈️
            </p>
            {/* Socials */}
            <div className="flex items-center gap-4 mt-5">
              <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-[#333] flex items-center justify-center text-[#888] hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@makeupbyroko_" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-[#333] flex items-center justify-center text-[#888] hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.18z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[0.65rem] font-semibold tracking-[0.16em] uppercase text-[#D4A0B0] mb-4">Services</h4>
            <ul className="flex flex-col gap-2.5">
              {['Luxury Bridal Look', 'Full Day Service', 'Non-Bridal Makeup', 'Photoshoot Makeup', 'Makeup Courses'].map(item => (
                <li key={item}>
                  <a href="#services-grid" className="text-[0.8rem] text-[#888] hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-[0.65rem] font-semibold tracking-[0.16em] uppercase text-[#D4A0B0] mb-4">Info</h4>
            <ul className="flex flex-col gap-2.5">
              {['Booking Policy', 'Travel Policy', 'FAQ', 'Cancellation Terms'].map(item => (
                <li key={item}>
                  <button onClick={() => setActiveTopic(item)} className="text-[0.8rem] text-[#888] hover:text-white transition-colors text-left">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[0.65rem] font-semibold tracking-[0.16em] uppercase text-[#D4A0B0] mb-4">Contact</h4>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 mt-0.5 text-[#555] flex-shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href="mailto:makeupbyroko22@gmail.com" className="text-[0.8rem] text-[#888] hover:text-white transition-colors">makeupbyroko22@gmail.com</a>
              </li>
              <li className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 mt-0.5 text-[#555] flex-shrink-0">
                  <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
                <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer" className="text-[0.8rem] text-[#888] hover:text-white transition-colors">@makeupbyroko_</a>
              </li>
              <li className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 mt-0.5 text-[#555] flex-shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-[0.8rem] text-[#888]">Mountain House, California</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[#222] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-[0.7rem] text-[#555]">© {currentYear} Roqia Moshref. All rights reserved.</p>
            <a href="/privacy-policy" className="text-[0.65rem] text-[#444] hover:text-[#888] transition-colors">Privacy Policy</a>
            <a href="/terms-of-service" className="text-[0.65rem] text-[#444] hover:text-[#888] transition-colors">Terms of Service</a>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 text-[0.65rem] text-[#D4A0B0] hover:text-white transition-colors tracking-[0.08em] uppercase font-medium"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Admin Dashboard
              </button>
            )}
            <p className="text-[0.65rem] text-[#444]">Crafted with care ✦</p>
          </div>
        </div>
      </div>
      </footer>

      {activeTopic && <InfoModal topic={activeTopic} onClose={() => setActiveTopic(null)} />}
    </>
  );
}