import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InfoModal from './InfoModal';

const SocialIg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width={17} height={17}>
    <rect x="2" y="2" width="20" height="20" rx="5.5"/>
    <circle cx="12" cy="12" r="4.2"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const SocialTt = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={15} height={15}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.18z"/>
  </svg>
);

export default function ServicesFooter() {
  const currentYear = new Date().getFullYear();
  const [activeTopic, setActiveTopic] = useState(null);
  const router = useRouter();

  const infoTopics = ['Booking Policy', 'Travel Policy', 'FAQ', 'Cancellation Terms'];
  const serviceLinks = ['Luxury Bridal Look', 'Full Day Service', 'Non-Bridal Makeup', 'Photoshoot Makeup', 'Makeup Courses'];

  return (
    <>
      <footer className="bg-[#0d0d0d] text-white">
        <div className="max-w-[1200px] mx-auto px-[clamp(1.5rem,5vw,3rem)]">

          {/* Top row: brand + socials */}
          <div className="flex items-end justify-between pt-16 pb-12 border-b border-[#D4A0B0]/20">
            <div>
              <p className="font-serif text-[1.7rem] tracking-[0.12em] uppercase text-white leading-none mb-3">
                Roqia Moshref
              </p>
              <p className="text-[0.78rem] text-white/35 tracking-[0.04em]">
                Makeup Artist. Mountain House, California.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer"
                className="text-white/35 hover:text-[#D4A0B0] transition-colors duration-200">
                <SocialIg />
              </a>
              <a href="https://www.tiktok.com/@makeupbyroko_" target="_blank" rel="noopener noreferrer"
                className="text-white/35 hover:text-[#D4A0B0] transition-colors duration-200">
                <SocialTt />
              </a>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 py-12 border-b border-[#D4A0B0]/20">
            {/* Services */}
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-5">Services</p>
              <ul className="flex flex-col gap-3.5">
                {serviceLinks.map(item => (
                  <li key={item}>
                    <a href="#services-grid"
                      className="text-[0.82rem] text-white/45 hover:text-[#D4A0B0] transition-colors duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info */}
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-5">Info</p>
              <ul className="flex flex-col gap-3.5">
                {infoTopics.map(item => (
                  <li key={item}>
                    <button
                      onClick={() => setActiveTopic(item)}
                      className="text-[0.82rem] text-white/45 hover:text-[#D4A0B0] transition-colors duration-200 text-left"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-5">Contact</p>
              <ul className="flex flex-col gap-3.5">
                <li>
                  <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer"
                    className="text-[0.82rem] text-white/45 hover:text-[#D4A0B0] transition-colors duration-200">
                    @makeupbyroko_
                  </a>
                </li>
                <li>
                  <a href="mailto:makeupbyroko22@gmail.com"
                    className="text-[0.82rem] text-white/45 hover:text-[#D4A0B0] transition-colors duration-200">
                    makeupbyroko22@gmail.com
                  </a>
                </li>
                <li>
                  <a href="https://www.tiktok.com/@makeupbyroko_" target="_blank" rel="noopener noreferrer"
                    className="text-[0.82rem] text-white/45 hover:text-[#D4A0B0] transition-colors duration-200">
                    TikTok
                  </a>
                </li>
              </ul>
            </div>

            {/* Location */}
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-5">Location</p>
              <p className="text-[0.82rem] text-white/45 leading-[1.85]">
                Mountain House, CA<br />
                Traveling artist available<br />
                for destination bookings.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between py-5 flex-wrap gap-3">
            <p className="text-[0.7rem] text-white/20 tracking-[0.02em]">
              © {currentYear} Roqia Moshref. All rights reserved.
            </p>
            <button
              onClick={() => router.push('/admin')}
              className="text-[0.7rem] text-[#D4A0B0]/30 hover:text-[#D4A0B0] transition-colors duration-200 tracking-[0.06em] uppercase"
            >
              Admin
            </button>
          </div>

        </div>
      </footer>

      {activeTopic && <InfoModal topic={activeTopic} onClose={() => setActiveTopic(null)} />}
    </>
  );
}
