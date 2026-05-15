'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../src/lib/supabase/client';

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const next = searchParams.get('next') || '/admin';
      router.push(next);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0C0A09' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-[360px] px-8">
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: 'rgba(212,160,176,0.12)', border: '1px solid rgba(212,160,176,0.2)' }}>
            <span className="text-[#D4A0B0] text-2xl">✦</span>
          </div>
          <h1 className="font-serif text-[1.6rem] tracking-[0.18em] uppercase text-white/90 font-light">
            Roqia Moshref
          </h1>
          <p className="text-[0.6rem] tracking-[0.22em] uppercase text-[#D4A0B0]/70 font-medium">
            Studio Dashboard
          </p>
        </div>

        <div className="w-px h-10 mx-auto mb-8" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,160,176,0.3), transparent)' }} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[0.6rem] font-semibold tracking-[0.16em] uppercase text-white/30 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="w-full px-4 py-3 rounded-xl text-[0.85rem] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,160,176,0.2)', color: '#F0EBE6' }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(212,160,176,0.2)'}
            />
          </div>

          <div>
            <label className="block text-[0.6rem] font-semibold tracking-[0.16em] uppercase text-white/30 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-[0.85rem] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,160,176,0.2)', color: '#F0EBE6' }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(212,160,176,0.2)'}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-[0.78rem] text-red-300"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.08em] uppercase transition-all mt-2"
            style={{
              background: loading ? 'rgba(212,160,176,0.3)' : '#D4A0B0',
              color: loading ? 'rgba(255,255,255,0.5)' : '#1A0F14',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#1A0F14]/30 border-t-[#1A0F14] rounded-full animate-spin" />
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <a href="/" className="block text-center text-[0.62rem] tracking-[0.1em] uppercase mt-8 transition-colors"
          style={{ color: 'rgba(212,160,176,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(212,160,176,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,160,176,0.4)'}>
          ← Back to Site
        </a>
      </div>
    </div>
  );
}
