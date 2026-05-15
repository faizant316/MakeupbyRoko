import { useState } from 'react';

export default function ReviewsList({ reviews, loading, onApprove, onDelete }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);
  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-[1.75rem] text-[#111] mb-1">Reviews</h2>
        <p className="text-[0.8rem] text-[#999]">Manage client reviews and approvals</p>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: `All (${reviews.length})` },
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'approved', label: `Approved (${approvedCount})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.08em] uppercase rounded-full border transition-all ${
              filter === f.key ? 'bg-[#111] text-white border-[#111]' : 'text-[#999] border-[#e8e2dc] hover:border-[#A0785A] hover:text-[#A0785A]'
            }`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#e8e2dc] border-t-[#A0785A] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20"><p className="text-[#b5a99a] text-[0.85rem]">No reviews found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));

  return (
    <div className="bg-white border border-[#e8e2dc] rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-serif text-[1rem] text-[#111]">{review.name}</h4>
          {review.service && <p className="text-[0.7rem] text-[#A0785A]">{review.service}</p>}
        </div>
        <span className={`px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-full border flex-shrink-0 ${
          review.status === 'approved'
            ? 'bg-[#EEFAEE] text-[#388E3C] border-[#A5D6A7]'
            : 'bg-[#FFF8E7] text-[#C49520] border-[#E8D5A0]'
        }`}>{review.status}</span>
      </div>
      <div className="text-[#D4A0B0] text-sm mb-3 tracking-wider">{stars}</div>
      <p className="text-[0.8rem] text-[#777] leading-relaxed flex-1 mb-4">"{review.message}"</p>
      <p className="text-[0.65rem] text-[#c5bdb5] mb-4">
        {review.created_date && new Date(review.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <div className="flex items-center gap-2 pt-3 border-t border-[#f0ebe6]">
        {review.status === 'pending' && (
          <button onClick={() => onApprove(review.id)}
            className="flex-1 py-2 text-[0.65rem] font-medium tracking-[0.06em] uppercase bg-[#EEFAEE] text-[#388E3C] border border-[#A5D6A7] rounded-lg hover:bg-[#ddf5dd] transition-all">Approve</button>
        )}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex-1 py-2 text-[0.65rem] font-medium tracking-[0.06em] uppercase text-red-400 border border-red-200 rounded-lg hover:bg-red-50 transition-all">Delete</button>
        ) : (
          <button onClick={() => onDelete(review.id)}
            className="flex-1 py-2 text-[0.65rem] font-medium tracking-[0.06em] uppercase bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all">Confirm Delete</button>
        )}
      </div>
    </div>
  );
}