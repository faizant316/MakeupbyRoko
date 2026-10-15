import { useState } from 'react';
import { api } from '@/api/apiClient';
import { Panel, Label, buttonClass, cx } from './ui';

// Client uploads are tagged in their storage path (client/{id}/{category}/…),
// so we can group them here without any schema change. Older photos and
// admin-added ones have no category segment and fall into "Reference".
function photoCategory(url) {
  const m = String(url).match(/\/client\/[^/]+\/(without|with|extra|misc)\//i);
  return m ? m[1].toLowerCase() : 'other';
}

const UploadIcon = ({ className }) => (
  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" />
  </svg>
);

// `dm` is still accepted from the card; the colours switch themselves now.
// eslint-disable-next-line no-unused-vars
export default function BookingReferencePhotos({ booking, onUpdateBooking, dm, className, style }) {
  const photos = booking.reference_photos || [];
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index in the flat photos array

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(file => api.integrations.Core.UploadFile({ file }).then(r => r.file_url))
      );
      const updated = [...photos, ...uploaded];
      await api.entities.Booking.update(booking.id, { reference_photos: updated });
      onUpdateBooking({ reference_photos: updated });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (idx) => {
    const updated = photos.filter((_, i) => i !== idx);
    await api.entities.Booking.update(booking.id, { reference_photos: updated });
    onUpdateBooking({ reference_photos: updated });
    if (lightbox === idx) setLightbox(null);
  };

  // Keep each photo's original index so delete/lightbox still map correctly.
  const tagged = photos.map((url, idx) => ({ url, idx, cat: photoCategory(url) }));
  const groups = [
    { key: 'without', label: 'Without makeup', items: tagged.filter(t => t.cat === 'without') },
    { key: 'with', label: 'With makeup', items: tagged.filter(t => t.cat === 'with') },
    { key: 'extra', label: 'Reference & mood board', items: tagged.filter(t => !['without', 'with'].includes(t.cat)) },
  ].filter(g => g.items.length > 0);

  // The remove button shows on hover where there is a pointer to hover with,
  // and always on a touch screen, where there isn't.
  const PhotoTile = ({ url, idx }) => (
    <div className="group relative aspect-square overflow-hidden rounded-ctl border border-line bg-canvas">
      <button type="button" onClick={() => setLightbox(idx)} className="block h-full w-full" aria-label={`Open photo ${idx + 1}`}>
        <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
      </button>
      <button type="button" onClick={() => handleDelete(idx)} aria-label={`Remove photo ${idx + 1}`} title="Remove"
        className="press absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-ctl bg-black/60 text-white opacity-100 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-3 w-3"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );

  return (
    <Panel
      className={className}
      style={style}
      title={(
        <>
          Reference &amp; client photos
          {photos.length > 0 && <span className="ml-1.5 font-normal tabular-nums text-ink-muted">{photos.length}</span>}
        </>
      )}
      action={(
        <label className={buttonClass('quiet', 'sm', cx('cursor-pointer max-sm:h-11', uploading && 'pointer-events-none opacity-50'))}>
          {uploading ? (
            <><span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Uploading…</>
          ) : (
            <><UploadIcon className="h-3.5 w-3.5" /> {photos.length > 0 ? 'Add' : 'Add photos'}</>
          )}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
      bodyClassName="px-4 py-4 sm:px-5 sm:py-5"
    >
      {photos.length === 0 ? (
        <label className={cx(
          'flex cursor-pointer items-center gap-3 rounded-ctl border border-dashed border-line-strong px-4 py-4 transition-colors duration-200 hover:border-ink/40',
          uploading && 'pointer-events-none opacity-50',
        )}>
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5 shrink-0 text-ink-muted"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
          <div>
            <p className="text-[0.86rem] font-medium text-ink-soft">Upload reference photos or mood board</p>
            <p className="mt-0.5 text-[0.74rem] text-ink-muted">Client with/without makeup photos also show here, grouped.</p>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(g => (
            <div key={g.key}>
              <Label className="mb-2 block">
                {g.label} <span className="font-normal tabular-nums">({g.items.length})</span>
              </Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                {g.items.map(({ url, idx }) => <PhotoTile key={idx} url={url} idx={idx} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox. A black stage with white controls: the photo is the only
          colour on screen. */}
      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 px-4" onClick={() => setLightbox(null)}>
          <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <img src={photos[lightbox]} alt="Reference" className="max-h-[80svh] w-full object-contain" />
            <div className="absolute right-3 top-3 flex gap-2">
              <a href={photos[lightbox]} target="_blank" rel="noopener noreferrer" aria-label="Open full size"
                className="press flex h-11 w-11 items-center justify-center rounded-ctl bg-white/15 text-white hover:bg-white/25" title="Open full size">
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></svg>
              </a>
              <button type="button" onClick={() => setLightbox(null)} aria-label="Close"
                className="press flex h-11 w-11 items-center justify-center rounded-ctl bg-white/15 text-white hover:bg-white/25">
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)} aria-label="Previous photo"
                  className="press absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-ctl bg-white/15 text-white hover:bg-white/25">
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button type="button" onClick={() => setLightbox((lightbox + 1) % photos.length)} aria-label="Next photo"
                  className="press absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-ctl bg-white/15 text-white hover:bg-white/25">
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </>
            )}
            <p className="mt-3 text-center text-[0.74rem] tabular-nums text-white/60">{lightbox + 1} / {photos.length}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}
