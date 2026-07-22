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
              Making every woman feel truly{' '}
              <TypewriterWord started={visible} />
            </h2>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              With over 17 years of experience and thousands of faces behind my brush, I've learned that makeup is never one-size-fits-all.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '1rem' }}>
              Every client who sits in my chair is a reflection of my artistry, which is why I approach each face with intention, precision, and genuine care. I take the time to understand your features, personality, and vision to create a look that feels elevated, timeless, and authentically you.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6d6460', lineHeight: 1.85, marginBottom: '2rem' }}>
              My goal has never been to change who you are, but to enhance what already makes you beautiful. On your special day, you're trusting me with one of life's biggest moments, and I don't take that responsibility lightly. Every face matters to me, and every client leaves my chair representing the standard I've proudly built for over 17 years.
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
