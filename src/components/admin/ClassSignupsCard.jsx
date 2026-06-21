import { useMemo } from 'react';

// Home overview card for class sign-ups. Replaces the old emoji + inline pills
// with a clearer breakdown (Pending / Confirmed / Enrolled) and a real
// "just signed up" list so it's obvious who registered and when, at a glance.

const CLASS_LABELS = {
  private_basic_lesson: 'Basic Lesson',
  masterclass: 'Advanced Lesson',
  virtual_lesson: 'Virtual Lesson',
  intermediate_lesson: 'Intermediate Lesson',
  glam_class: 'Glam Class',
};

const STATUS_META = {
  pending:   { color: '#F59E0B', label: 'Pending'   },
  confirmed: { color: '#3B82F6', label: 'Confirmed' },
  enrolled:  { color: '#22C55E', label: 'Enrolled'  },
};

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function classLabelOf(reg) {
  const cls = Object.keys(CLASS_LABELS).filter(k => reg[k]);
  return cls.length ? cls.map(k => CLASS_LABELS[k]).join(' · ') : 'Makeup Class';
}

export default function ClassSignupsCard({ classRegs = [], onOpenAll, onOpenReg, darkMode: dm }) {
  const counts = useMemo(() => ({
    pending:   classRegs.filter(r => (r.status || 'pending') === 'pending').length,
    confirmed: classRegs.filter(r => r.status === 'confirmed').length,
    enrolled:  classRegs.filter(r => r.status === 'enrolled').length,
  }), [classRegs]);

  const recent = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return classRegs
      .filter(r => r.created_date && new Date(r.created_date).getTime() > dayAgo)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [classRegs]);

  return (
    <div className="w-full mb-14 rounded-2xl overflow-hidden"
      style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e4'}` }}>
      {/* Header — opens the full Class Sign-Ups tab */}
      <button onClick={onOpenAll}
        className="group w-full flex items-center gap-3.5 px-5 pt-4 pb-3.5 text-left transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = dm ? '#2e2a2e' : '#FDFAFB'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(160,96,122,0.1)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#A0607A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.85rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>Class Sign-Ups</p>
          <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#71717a' : '#a99e95' }}>
            {classRegs.length} {classRegs.length === 1 ? 'registration' : 'registrations'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[0.65rem] font-semibold transition-colors group-hover:text-[#A0607A]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>View all</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-3.5 h-3.5 transition-all group-hover:translate-x-0.5 group-hover:stroke-[#A0607A]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </button>

      {/* Status breakdown — always shows all three */}
      <div className="grid grid-cols-3 gap-2 px-5 pb-4">
        {['pending', 'confirmed', 'enrolled'].map(k => {
          const m = STATUS_META[k];
          return (
            <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: dm ? '#1e1e24' : '#FBFAF8', border: `1px solid ${dm ? '#34343d' : '#f0ebe5'}` }}>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                <span className="text-[1.15rem] font-serif leading-none" style={{ color: counts[k] > 0 ? (dm ? '#e4e4e7' : '#1a1a1a') : (dm ? '#52525b' : '#c9bfb7') }}>{counts[k]}</span>
              </div>
              <p className="text-[0.55rem] font-semibold tracking-[0.1em] uppercase mt-1.5" style={{ color: dm ? '#71717a' : '#b0a59c' }}>{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Just signed up — recent registrations (last 24 hrs), each opens the reg */}
      {recent.length > 0 && (
        <div className="px-5 pb-4 pt-3.5" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe5'}` }}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#A0607A' }} />
            <span className="text-[0.55rem] font-bold tracking-[0.14em] uppercase" style={{ color: dm ? '#c78fa3' : '#A0607A' }}>Just Signed Up</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {recent.slice(0, 3).map(r => {
              const m = STATUS_META[r.status || 'pending'] || STATUS_META.pending;
              const initial = (r.full_name || '?').trim().charAt(0).toUpperCase() || '?';
              return (
                <button key={r.id} onClick={() => onOpenReg?.(r)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
                  style={{ background: dm ? '#1e1e24' : '#FCF8FA', border: `1px solid ${dm ? '#34343d' : '#F0E4EA'}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(160,96,122,0.5)'; e.currentTarget.style.background = dm ? '#2a242a' : '#FBF3F7'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#34343d' : '#F0E4EA'; e.currentTarget.style.background = dm ? '#1e1e24' : '#FCF8FA'; }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[0.72rem]"
                    style={{ background: dm ? 'rgba(154,84,116,0.22)' : '#F1DCE7', color: dm ? '#e7c9d5' : '#8A4A63' }}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.78rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>{r.full_name || 'Unknown'}</p>
                    <p className="text-[0.65rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#a99e95' }}>
                      {classLabelOf(r)} · {timeAgo(r.created_date)}
                    </p>
                  </div>
                  <span className="text-[0.5rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${m.color}1a`, color: m.color }}>{m.label}</span>
                </button>
              );
            })}
            {recent.length > 3 && (
              <button onClick={onOpenAll} className="text-[0.65rem] font-semibold py-1 transition-colors hover:opacity-70" style={{ color: dm ? '#c78fa3' : '#A0607A' }}>
                +{recent.length - 3} more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
