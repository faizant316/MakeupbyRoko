export default function AdminStats({ today, pending, confirmed, completed, darkMode: dm, onFilterClick }) {
  const stats = [
    { label: 'Today', value: today, color: '#D4A0B0', iconBg: dm ? 'rgba(212,160,176,0.12)' : '#FDF2F5', filter: null, icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )},
    { label: 'Pending', value: pending, color: '#E8B339', iconBg: dm ? 'rgba(232,179,57,0.1)' : '#FFF8E7', filter: 'pending', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#E8B339" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    )},
    { label: 'Confirmed', value: confirmed, color: '#5BA8E8', iconBg: dm ? 'rgba(91,168,232,0.1)' : '#EEF5FC', filter: 'confirmed', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#5BA8E8" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/>
      </svg>
    )},
    { label: 'Completed', value: completed, color: '#4CAF50', iconBg: dm ? 'rgba(76,175,80,0.1)' : '#EEFAEE', filter: 'completed', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="1.5" className="w-4 h-4">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )},
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(s => (
        <button key={s.label} onClick={() => s.filter && onFilterClick?.(s.filter)}
          className="rounded-xl p-5 flex flex-col gap-3 transition-all text-left"
          style={{
            background: dm ? '#26262e' : '#fff',
            border: `1px solid ${dm ? '#3a3a48' : '#E5E7EB'}`,
            cursor: s.filter ? 'pointer' : 'default',
          }}
          onMouseEnter={e => { if (s.filter) e.currentTarget.style.borderColor = s.color; }}
          onMouseLeave={e => { if (s.filter) e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#E5E7EB'; }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.iconBg }}>
            {s.icon}
          </div>
          <div>
            <div className="font-serif text-[2rem] leading-none" style={{ color: dm ? '#ECEDF1' : '#111' }}>{s.value}</div>
            <div className="text-[0.6rem] font-medium tracking-[0.14em] uppercase mt-1" style={{ color: s.color }}>{s.label}</div>
          </div>
        </button>
      ))}
    </div>
  );
}