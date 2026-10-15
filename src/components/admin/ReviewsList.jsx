import { useState } from 'react';
import { StarOutline } from './Glyphs';
import { Button, Segmented, buttonClass, cx } from './ui';

// Review status in the status tones: amber while it waits for her, blue once
// it's live on the site. Same square chip as StatusBadge, which has no word
// for "approved".
const STATUS_TONE = {
  pending: 'bg-tone-pending/10 text-tone-pending',
  approved: 'bg-tone-confirmed/10 text-tone-confirmed',
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
];

export default function ReviewsList({ reviews, loading, onApprove, onDelete, darkMode: dm }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);
  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
  };

  return (
    <div>
      <Segmented
        options={FILTERS.map(f => ({ ...f, count: counts[f.value] }))}
        value={filter}
        onChange={setFilter}
        className="mb-6"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper">
            <StarOutline className="h-5 w-5 text-rose-soft" />
          </div>
          <p className="text-[0.86rem] text-ink-muted">
            {filter === 'all' ? 'No reviews yet' : `No ${filter} reviews`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(review => (
            <ReviewCard key={review.id} review={review} onApprove={onApprove} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, onApprove, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rating = review.rating || 0;

  return (
    <article className="flex flex-col rounded-card border border-line bg-paper p-5">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[0.98rem] font-semibold tracking-[-0.01em] text-ink">{review.name}</h4>
          {review.service && <p className="mt-0.5 truncate text-[0.8rem] text-ink-soft">{review.service}</p>}
          {review.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.74rem] text-ink-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3 w-3 shrink-0" aria-hidden>
                <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="truncate">{review.location}</span>
            </p>
          )}
        </div>
        <span className={cx('inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em]', STATUS_TONE[review.status] || STATUS_TONE.pending)}>
          {review.status}
        </span>
      </div>

      {/* Stars */}
      <div className="mb-3 flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} aria-hidden className={cx('text-[0.86rem] leading-none', i <= rating ? 'text-ink' : 'text-line-strong')}>★</span>
        ))}
      </div>

      {/* Client photo */}
      {review.photo && (
        <a href={review.photo} target="_blank" rel="noopener noreferrer" className="mb-3 block overflow-hidden rounded-ctl border border-line">
          <img src={review.photo} alt="Client look" className="max-h-[150px] w-full object-cover" />
        </a>
      )}

      {/* Message */}
      <p className="mb-3 flex-1 text-[0.86rem] leading-relaxed text-ink-soft">
        "{review.message}"
      </p>

      {/* Highlights */}
      {review.highlights?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {review.highlights.map((h, i) => (
            <span key={i} className="inline-flex h-6 items-center bg-canvas px-2 text-[0.68rem] font-medium text-ink-soft">
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <p className="mb-4 text-[0.74rem] tabular-nums text-ink-muted">
        {review.created_date && new Date(review.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>

      {/* Actions. Delete asks once, right here, before it goes. */}
      <div className="flex items-center gap-2 border-t border-line pt-4">
        {review.status === 'pending' && (
          <Button variant="solid" onClick={() => onApprove(review.id)} className="h-11 flex-1 sm:h-10">
            Approve
          </Button>
        )}
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} className="h-11 flex-1 sm:h-10">
            Delete
          </Button>
        ) : (
          <>
            <button type="button" onClick={() => onDelete(review.id)}
              className={buttonClass('alert', 'md', 'h-11 flex-1 sm:h-10')}>
              Confirm delete
            </button>
            <Button onClick={() => setConfirmDelete(false)} className="h-11 sm:h-10">
              Cancel
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
