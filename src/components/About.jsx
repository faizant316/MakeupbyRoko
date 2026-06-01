import { useEffect, useRef, useState } from 'react';

const WORDS = ['stunning', 'beautiful', 'flawless'];

function TypewriterWord({ started }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!started) return;
    const word = WORDS[idx];
    let timer;
    if (!deleting) {
      if (text.length < word.length) {
        timer = setTimeout(() => setText(word.slice(0, text.length + 1)), 85);
      } else {
        timer = setTimeout(() => setDeleting(true), 1600);
      }
    } else {
      if (text.length > 0) {
        timer = setTimeout(() => setText(t => t.slice(0, -1)), 70);
      } else {
        timer = setTimeout(() => { setIdx(i => (i + 1) % WORDS.length); setDeleting(false); }, 320);
      }
    }
    return () => clearTimeout(timer);
  }, [text, deleting, idx, started]);

  return (
    <>
      <style>{`
        @keyframes tw-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .tw-cursor {
          display: inline-block;
          width: 1.5px;
          height: 0.82em;
          background: #D4A0B0;
          margin-left: 2px;
          margin-right: 1px;
          vertical-align: text-bottom;
          animation: tw-blink 0.9s step-end infinite;
        }
      `}</style>
      <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>{text}</em>
      <span className="tw-cursor" />
      <span style={{ color: '#D4A0B0' }}>.</span>
    </>
  );
}

export default function About() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="border-b border-[#f0ebe6] px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]"
    >
      <div className="max-w-[1200px] mx-auto">

        {/* Section label */}
        <div
          className="flex items-center gap-2.5 mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          }}
        >
          <span className="w-6 h-px bg-[#D4A0B0]" />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A0B0' }}>
            About
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-20 items-center">

          {/* Photo */}
          <div
            className="overflow-hidden rounded-xl bg-[#f5f0eb]"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.7s ease-out 0.1s, transform 0.7s ease-out 0.1s',
            }}
          >
            <img
              src="/roko_pic.png"
              alt="Roqia Moshref"
              loading="lazy"
              className="w-full h-auto block hover:scale-[1.02] transition-transform duration-700"
            />
          </div>

          {/* Content */}
          <div
            className="flex flex-col"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.7s ease-out 0.22s, transform 0.7s ease-out 0.22s',
            }}
          >
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)',
                fontWeight: 300,
                color: '#111',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                marginBottom: '1.5rem',
              }}
            >
              Making every woman feel genuinely{' '}
              <TypewriterWord started={visible} />
            </h2>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              I was 12 years old when I first picked up a makeup brush and instantly fell in love with the art of making people feel beautiful. By the age of 14, I had already completed my first bridal client. She trusted me with one of the most important days of her life, even though she had no idea how young I really was. Looking back, that experience sparked a passion that would shape the next 17 years of my career.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              My journey hasn't always been easy. Like many women, I've faced challenges, setbacks, and moments that tested my strength. Through it all, makeup became more than a profession, it became my purpose.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              For me, makeup has never been about changing someone's face. It's about enhancing what already makes them beautiful and creating a look that reflects who they truly are. Every bride has a unique personality, energy, and vision, and my goal is to make sure the makeup feels like an extension of her, not a mask.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              One of the things I value most is creating an environment where my clients feel comfortable, heard, and confident enough to tell me exactly what they love and what they don't. I want every woman who sits in my chair to feel like she's getting ready with a trusted friend, not just a makeup artist.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              I don't simply provide a service, I create an experience. Whether it's a bridal preview, wedding morning, or special event, I give my clients my full attention, care, and dedication. No matter what is happening in my personal life, my clients will always receive my very best. I believe professionalism, trust, communication, and consistency are just as important as the final look itself.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              The most rewarding part of what I do isn't the makeup, it's the reaction. It's seeing someone look in the mirror and smile with confidence. It's watching a bride light up when she finally sees herself exactly the way she envisioned. Those moments never get old, and they're the reason I still love what I do after all these years.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '2rem' }}>
              Thank you for trusting me to be a part of your story. It is truly an honor to help women feel beautiful, confident, and celebrated during some of the most important moments of their lives.
            </p>

            {/* Instagram CTA */}
            <a
              href="https://www.instagram.com/makeupbyroko_/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group w-fit"
              style={{ textDecoration: 'none' }}
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0">
                <defs>
                  <linearGradient id="ig-about" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#feda75"/>
                    <stop offset="25%" stopColor="#fa7e1e"/>
                    <stop offset="50%" stopColor="#d62976"/>
                    <stop offset="75%" stopColor="#962fbf"/>
                    <stop offset="100%" stopColor="#4f5bd5"/>
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="url(#ig-about)" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="4" fill="none" stroke="url(#ig-about)" strokeWidth="1.8"/>
                <circle cx="17.5" cy="6.5" r="1.1" fill="url(#ig-about)"/>
              </svg>
              <span
                style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', transition: 'color 0.2s' }}
                className="group-hover:text-[#111]"
              >
                View my work on Instagram
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" className="w-3 h-3 group-hover:stroke-[#111] group-hover:translate-x-0.5 transition-all">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>

          </div>
        </div>
      </div>
    </section>
  );
}
