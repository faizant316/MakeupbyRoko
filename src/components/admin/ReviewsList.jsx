import { useState } from 'react';

const FILTER_TONES = {
  all:      { dot: null,      light: { bg: 'rgba(160,96,122,0.10)', txt: '#8A4A63' }, dark: { bg: 'rgba(212,160,176,0.16)', txt: '#e7c9d5' } },
  pending:  { dot: '#F59E0B', light: { bg: 'rgba(245,158,11,0.13)', txt: '#B26A04' }, dark: { bg: 'rgba(245,158,11,0.18)',  txt: '#F5B83C' } },
  approved: { dot: '#22C55E', light: { bg: 'rgba(34,197,94,0.13)',  txt: '#15803D' }, dark: { bg: 'rgba(34,197,94,0.18)',   txt: '#56D98A' } },
};

export default function ReviewsList({ reviews, loading, onApprove, onDelete, darkMode: dm }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);
  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
  };

  const mutedTxt = dm ? '#8a8a93' : '#9b8e88';
  const hoverTxt = dm ? '#cfcfd6' : '#6b6259';
  const hoverBg  = dm ? '#26262d' : '#F5F1EC';
  const chipCls  = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.74rem] font-semibold whitespace-nowrap transition-colors flex-shrink-0';

  return (
    <div>
      {/* Filter — minimal text chips, soft-tint when active (matches Bookings) */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto no-scrollbar pb-0.5">
        {['all', 'pending', 'approved'].map(key => {
          const isActive = filter === key;
          const c = FILTER_TONES[key];
          const tone = dm ? c.dark : c.light;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={chipCls}
              style={isActive ? { background: tone.bg, color: tone.txt } : { background: 'transparent', color: mutedTxt }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverTxt; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedTxt; } }}
            >
              {c.dot && !isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />}
              <span className="capitalize">{key}</span>
              <span style={{ opacity: 0.55 }}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: dm ? '#3a3a48' : '#e8e2dc', borderTopColor: '#D4A0B0' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: dm ? '#26262e' : '#FAF8F6', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }}>
            <span className="text-[#D4A0B0] text-lg">✦</span>
          </div>
          <p className="text-[0.85rem]" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
            {filter === 'all' ? 'No reviews yet' : `No ${filter} reviews`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(review => (
            <ReviewCard key={review.id} review={review} onApprove={onApprove} onDelete={onDelete} dm={dm} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, onApprove, onDelete, dm }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rating = review.rating || 0;
  const isApproved = review.status === 'approved';

  const bg      = dm ? '#26262e' : '#fff';
  const bd      = dm ? '#3a3a48' : '#e4ddd7';
  const tx      = dm ? '#e4e4e7' : '#111';
  const di      = dm ? '#52525b' : '#c5bdb5';
  const divider = dm ? '#2e2e38' : '#f0ebe6';
  const star    = dm ? '#3a3a48' : '#e8e0db';

  return (
    <div className="rounded-2xl p-5 flex flex-col transition-all hover:shadow-md"
      style={{ background: bg, border: `1px solid ${bd}` }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <h4 className="font-serif text-[1.02rem] truncate" style={{ color: tx }}>{review.name}</h4>
          {review.service && <p className="text-[0.7rem] mt-0.5 truncate" style={{ color: '#D4A0B0' }}>{review.service}</p>}
          {review.location && (
            <p className="flex items-center gap-1 text-[0.66rem] mt-0.5 truncate" style={{ color: dm ? '#71717a' : '#a89f97' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3 h-3 flex-shrink-0">
                <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="truncate">{review.location}</span>
            </p>
          )}
        </div>
        <span className="px-2.5 py-1 text-[0.55rem] font-semibold tracking-[0.1em] uppercase rounded-full flex-shrink-0"
          style={isApproved
            ? { background: dm ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)', color: dm ? '#56D98A' : '#15803D' }
            : { background: dm ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.13)', color: dm ? '#F5B83C' : '#B26A04' }}>
          {review.status}
        </span>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className="text-[0.82rem] leading-none" style={{ color: i <= rating ? '#D4A0B0' : star }}>★</span>
        ))}
      </div>

      {/* Client photo */}
      {review.photo && (
        <a href={review.photo} target="_blank" rel="noopener noreferrer" className="block mb-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${bd}` }}>
          <img src={review.photo} alt="Client look" className="w-full max-h-[150px] object-cover" />
        </a>
      )}

      {/* Message */}
      <p className="text-[0.82rem] leading-relaxed flex-1 mb-3" style={{ color: dm ? '#a1a1aa' : '#777' }}>
        "{review.message}"
      </p>

      {/* Highlights */}
      {review.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {review.highlights.map((h, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[0.62rem] font-medium"
              style={{ background: dm ? 'rgba(212,160,176,0.16)' : 'rgba(212,160,176,0.12)', color: dm ? '#e7c9d5' : '#8A4A63' }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <p className="text-[0.65rem] mb-4" style={{ color: di }}>
        {review.created_date && new Date(review.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${divider}` }}>
        {review.status === 'pending' && (
          <button onClick={() => onApprove(review.id)}
            className="flex-1 py-2 text-[0.65rem] font-medium tracking-[0.06em] uppercase rounded-lg transition-all active:scale-[0.98]"
            style={{ background: dm ? 'rgba(34,197,94,0.16)' : 'rgba(34,197,94,0.1)', color: dm ? '#56D98A' : '#15803D' }}>
            Approve
          </button>
        )}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex-1 py-2 text-[0.65rem] font-medium tracking-[0.06em] uppercase rounded-lg transition-all"
            style={{ color: dm ? '#a1a1aa' : '#b0a89f', border: `1px solid ${bd}` }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = dm ? '#7f1d1d' : '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.color = dm ? '#a1a1aa' : '#b0a89f'; e.currentTarget.style.borderColor = bd; }}>
            Delete
          </button>
        ) : (
          <button onClick={() => onDelete(review.id)}
            className="flex-1 py-2 text-[0.65rem] font-medium tracking-[0.06em] uppercase bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all active:scale-[0.98]">
            Confirm Delete
          </button>
        )}
      </div>
    </div>
  );
}
