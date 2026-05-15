import { useState } from 'react';
import { base44 } from '@/api/apiClient';

export default function BookingReferencePhotos({ booking, onUpdateBooking, dm }) {
  const photos = booking.reference_photos || [];
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index of photo being viewed

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url))
      );
      const updated = [...photos, ...uploaded];
      await base44.entities.Booking.update(booking.id, { reference_photos: updated });
      onUpdateBooking({ reference_photos: updated });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (idx) => {
    const updated = photos.filter((_, i) => i !== idx);
    await base44.entities.Booking.update(booking.id, { reference_photos: updated });
    onUpdateBooking({ reference_photos: updated });
    if (lightbox === idx) setLightbox(null);
  };

  return (
    <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a]">
          Reference Photos & Mood Board
          {photos.length > 0 && <span className="ml-2 text-[#D4A0B0]">({photos.length})</span>}
        </p>
        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}
          style={{ background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#D4A0B0' : '#A0785A', border: `1px solid ${dm ? '#3a3a48' : '#e8e0d8'}` }}>
          {uploading ? (
            <><div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Uploading…</>
          ) : (
            <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Add Photos</>
          )}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {photos.length === 0 ? (
        <label className={`flex flex-col items-center gap-2.5 px-5 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors group ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          style={{ borderColor: dm ? '#3a3a48' : '#e8e2dc' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: dm ? '#2e2e38' : '#F5F0EC' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-5 h-5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[0.78rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>Upload reference photos or mood board</p>
            <p className="text-[0.65rem] mt-0.5" style={{ color: dm ? '#52525b' : '#ccc' }}>PNG, JPG — multiple files OK</p>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden"
              style={{ border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>
              <img
                src={url}
                alt={`Reference ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(idx)}
              />
              <button
                onClick={() => handleDelete(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                title="Remove"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-3 h-3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={photos[lightbox]} alt="Reference" className="w-full max-h-[80vh] object-contain rounded-2xl" />
            <div className="absolute top-3 right-3 flex gap-2">
              <a href={photos[lightbox]} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                title="Open full size">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <button onClick={() => setLightbox(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* Prev / Next */}
            {photos.length > 1 && (
              <>
                <button onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button onClick={() => setLightbox((lightbox + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </>
            )}
            <p className="text-center text-[0.7rem] text-white/50 mt-3">{lightbox + 1} / {photos.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}