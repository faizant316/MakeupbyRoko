import { useState, useRef, useEffect, useCallback } from 'react';
import ServicePreview from './ServicePreview';
import { Cross } from './Glyphs';
import { Button, Chevron, Fold, Sheet, cx, inputClass } from './ui';

const CATEGORIES = [
  { value: 'bridal', label: 'Bridal' },
  { value: 'event', label: 'Event Glam' },
  { value: 'creative', label: 'Creative' },
  { value: 'lessons', label: 'Lessons' },
];

// Field label, the same small caps the rest of the dashboard uses.
const fieldLabel = 'mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted';
// inputClass is a fixed 44px single line; a textarea needs its own height.
const areaClass = 'w-full resize-none rounded-ctl border border-line bg-paper px-3 py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-ink-muted/70 transition-colors duration-200 focus:border-ink/60 focus:outline-none sm:text-[0.9rem]';
// Dashed drop targets: a hairline that turns rose while a file is over it.
const dropClass = (over) => cx(
  'relative w-full cursor-pointer rounded-card border border-dashed transition-colors duration-200',
  over ? 'border-rose bg-rose/[0.04]' : 'border-line-strong bg-canvas hover:border-ink/40',
);

function Section({ children }) {
  return (
    <p className="flex items-center gap-3 pt-2">
      <span className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </p>
  );
}

// A removable entry under "What's included" and "Key features".
function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-ctl border border-line bg-canvas pl-2.5 pr-1 text-[0.8rem] text-ink-soft">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove"
        className="press flex h-6 w-6 items-center justify-center rounded-ctl text-ink-muted hover:text-tone-alert">
        <Cross className="h-2.5 w-2.5" strokeWidth={2.6} />
      </button>
    </span>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

export default function ServiceFormModal({ service, onSave, onClose, darkMode: dm }) {
  const [form, setForm] = useState({
    title: service?.title || '',
    category: service?.category || 'event',
    price: service?.price || '',
    price_value: service?.price_value || 0,
    duration: service?.duration || '',
    deposit: service?.deposit || '',
    description: service?.description || '',
    includes: service?.includes || [],
    key_features: service?.key_features || [],
    what_to_expect: service?.what_to_expect || '',
    before_after_photos: service?.before_after_photos || [],
    photo: service?.photo || '',
    is_active: service?.is_active !== false,
    sort_order: service?.sort_order || 0,
  });
  const [includeInput, setIncludeInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [baUploading, setBaUploading] = useState(false);
  const [baDragOver, setBaDragOver] = useState(false);
  const photoInputRef = useRef(null);
  const baInputRef = useRef(null);
  const scrollRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const addInclude = () => { if (!includeInput.trim()) return; setForm(f => ({ ...f, includes: [...f.includes, includeInput.trim()] })); setIncludeInput(''); };
  const removeInclude = (idx) => setForm(f => ({ ...f, includes: f.includes.filter((_, i) => i !== idx) }));
  const addFeature = () => { if (!featureInput.trim()) return; setForm(f => ({ ...f, key_features: [...f.key_features, featureInput.trim()] })); setFeatureInput(''); };
  const removeFeature = (idx) => setForm(f => ({ ...f, key_features: f.key_features.filter((_, i) => i !== idx) }));
  const removePhoto = (idx) => setForm(f => ({ ...f, before_after_photos: f.before_after_photos.filter((_, i) => i !== idx) }));

  // Shared uploader — hits the same endpoint the rest of the admin uses.
  const uploadImage = useCallback(async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload-photo', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  }, []);

  const uploadServicePhoto = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoUploading(true);
    try {
      const url = await uploadImage(file);
      setForm(f => ({ ...f, photo: url }));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setPhotoUploading(false);
    }
  }, [uploadImage]);

  const uploadBeforeAfter = useCallback(async (files) => {
    const list = Array.from(files || []).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    setBaUploading(true);
    try {
      const urls = [];
      for (const f of list) urls.push(await uploadImage(f));
      setForm(f => ({ ...f, before_after_photos: [...f.before_after_photos, ...urls] }));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setBaUploading(false);
    }
  }, [uploadImage]);

  const handlePhotoDrop = useCallback((e) => {
    e.preventDefault();
    setPhotoDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadServicePhoto(file);
  }, [uploadServicePhoto]);

  const handleBaDrop = useCallback((e) => {
    e.preventDefault();
    setBaDragOver(false);
    if (e.dataTransfer.files?.length) uploadBeforeAfter(e.dataTransfer.files);
  }, [uploadBeforeAfter]);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={service ? 'Edit service' : 'New service'}
      headerExtra={(
        <p className="mt-1 text-[0.84rem] text-ink-muted">
          {service ? 'Update how this appears on your site' : 'Add a new offering to your site'}
        </p>
      )}
      footer={(
        <div className="flex items-center gap-2.5">
          <Button size="lg" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="service-form" variant="solid" size="lg" disabled={saving} className="flex-1">
            {saving ? 'Saving…' : service ? 'Update service' : 'Create service'}
          </Button>
        </div>
      )}
    >
      <form id="service-form" onSubmit={handleSubmit} ref={scrollRef} className="flex flex-col gap-4">

        {/* Cover photo, photo-forward, like the live service card */}
        <div
          onDrop={handlePhotoDrop}
          onDragOver={e => { e.preventDefault(); setPhotoDragOver(true); }}
          onDragLeave={() => setPhotoDragOver(false)}
          onClick={() => photoInputRef.current?.click()}
          className={cx(dropClass(photoDragOver), 'group aspect-[16/7] overflow-hidden', form.photo && !photoDragOver && 'bg-black')}
        >
          {photoUploading ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[0.8rem] text-rose">
              <Spinner />
              Uploading…
            </div>
          ) : form.photo ? (
            <>
              <img src={form.photo} alt="Service" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="bg-black/50 px-3 py-1.5 text-[0.74rem] font-medium text-white">
                  Drop or click to replace
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-ink-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 h-7 w-7" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className="text-[0.8rem] font-medium">Drop the service photo here or click to upload</p>
              <p className="mt-0.5 text-[0.68rem] text-ink-muted/80">PNG or JPG, up to 10MB</p>
            </div>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadServicePhoto(f); e.target.value = ''; }} />
        </div>

        {/* BASICS */}
        <Section>Basic info</Section>

        <div>
          <label className={fieldLabel}>Service name *</label>
          <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Full Glam" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Category custom dropdown */}
          <div ref={catRef} className="relative">
            <label className={fieldLabel}>Category *</label>
            <button type="button" onClick={() => setCatOpen(!catOpen)} aria-expanded={catOpen}
              className={cx(inputClass, 'flex cursor-pointer items-center justify-between gap-2 text-left')}>
              <span className="truncate">{CATEGORIES.find(c => c.value === form.category)?.label}</span>
              <Chevron open={catOpen} className="h-3.5 w-3.5 text-ink-muted" />
            </button>
            {catOpen && (
              <div className="pop-in absolute left-0 right-0 top-full z-50 mt-1 rounded-card border border-line bg-paper p-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
                style={{ '--origin': 'top left' }}>
                {CATEGORIES.map(c => {
                  const on = form.category === c.value;
                  return (
                    <button key={c.value} type="button"
                      onClick={() => { setForm({ ...form, category: c.value }); setCatOpen(false); }}
                      className={cx('flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-[0.84rem] transition-colors', on ? 'bg-canvas font-semibold text-ink' : 'text-ink-soft hover:bg-canvas/60')}>
                      {c.label}
                      {on && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 shrink-0 text-rose" aria-hidden>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className={fieldLabel}>Sort order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
              className={cx(inputClass, 'tabular-nums')} />
          </div>
        </div>

        {/* PRICING */}
        <Section>Pricing &amp; duration</Section>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Display price *</label>
            <input required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              placeholder="From $250" className={inputClass} />
          </div>
          <div>
            <label className={fieldLabel}>Base price ($)</label>
            <input type="number" value={form.price_value} onChange={e => setForm({ ...form, price_value: Number(e.target.value) })}
              className={cx(inputClass, 'tabular-nums')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Duration *</label>
            <input required value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
              placeholder="90 min" className={inputClass} />
          </div>
          <div>
            <label className={fieldLabel}>Deposit</label>
            <input value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })}
              placeholder="$75 deposit required" className={inputClass} />
          </div>
        </div>

        {/* CONTENT */}
        <Section>Content</Section>

        <div>
          <label className={fieldLabel}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe this service…" className={cx(areaClass, 'h-[88px]')} />
        </div>

        <div>
          <label className={fieldLabel}>What to expect</label>
          <textarea value={form.what_to_expect} onChange={e => setForm({ ...form, what_to_expect: e.target.value })}
            placeholder="Describe the process and what clients should expect…" className={cx(areaClass, 'h-[76px]')} />
        </div>

        {/* LISTS */}
        <Section>Highlights &amp; inclusions</Section>

        {/* Includes */}
        <div>
          <label className={fieldLabel}>What's included</label>
          <div className="mb-2 flex gap-2">
            <input value={includeInput} onChange={e => setIncludeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclude())}
              placeholder="Add an item…" className={cx(inputClass, 'flex-1')} />
            <Button variant="solid" onClick={addInclude} className="h-11">Add</Button>
          </div>
          {form.includes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.includes.map((item, i) => (
                <Chip key={i} onRemove={() => removeInclude(i)}>{item}</Chip>
              ))}
            </div>
          )}
        </div>

        {/* Key Features */}
        <div>
          <label className={fieldLabel}>Key features</label>
          <div className="mb-2 flex gap-2">
            <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              placeholder="e.g., Detailed Consultation…" className={cx(inputClass, 'flex-1')} />
            <Button variant="solid" onClick={addFeature} className="h-11">Add</Button>
          </div>
          {form.key_features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.key_features.map((feature, i) => (
                <Chip key={i} onRemove={() => removeFeature(i)}>{feature}</Chip>
              ))}
            </div>
          )}
        </div>

        {/* Before & After Photos, drag & drop uploads */}
        <div>
          <label className={fieldLabel}>Before &amp; after photos</label>
          <div
            onDrop={handleBaDrop}
            onDragOver={e => { e.preventDefault(); setBaDragOver(true); }}
            onDragLeave={() => setBaDragOver(false)}
            onClick={() => baInputRef.current?.click()}
            className={cx(dropClass(baDragOver), 'px-4 py-5 text-center')}
          >
            {baUploading ? (
              <div className="flex items-center justify-center gap-2 text-[0.8rem] text-rose">
                <Spinner />
                Uploading…
              </div>
            ) : (
              <div className="text-ink-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-1.5 h-6 w-6" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="text-[0.8rem] font-medium">Drop photos here or click to upload</p>
                <p className="mt-0.5 text-[0.68rem] text-ink-muted/80">You can add several at once</p>
              </div>
            )}
            <input ref={baInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) uploadBeforeAfter(e.target.files); e.target.value = ''; }} />
          </div>
          {form.before_after_photos.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {form.before_after_photos.map((photo, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-ctl border border-line bg-canvas">
                  <img src={photo} alt={`Before & After ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label="Remove photo"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
                    <Cross className="h-3 w-3" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SETTINGS */}
        <Section>Visibility</Section>

        <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-paper px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.86rem] font-medium text-ink">Active service</p>
            <p className="text-[0.76rem] text-ink-muted">
              {form.is_active ? 'Visible to clients on the site' : 'Hidden from clients'}
            </p>
          </div>
          <button type="button" role="switch" aria-checked={form.is_active} aria-label="Active service"
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            className="flex h-11 shrink-0 items-center">
            <span aria-hidden className={cx('relative h-6 w-11 rounded-full transition-colors duration-300', form.is_active ? 'bg-ink' : 'bg-line-strong')}>
              <span className={cx('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper transition-transform duration-300 ease-quint', form.is_active && 'translate-x-5')} />
            </span>
          </button>
        </div>

        {/* Preview toggle */}
        <Button onClick={() => setShowPreview(!showPreview)} aria-expanded={showPreview} className="h-11 w-full">
          {showPreview ? 'Hide preview' : 'Preview card'}
          <Chevron open={showPreview} className="h-3.5 w-3.5 text-ink-muted" />
        </Button>

        <Fold open={showPreview} lazy>
          <div className="rounded-card border border-line bg-canvas p-4">
            <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">How it looks on the homepage</p>
            <ServicePreview form={form} />
          </div>
        </Fold>
      </form>
    </Sheet>
  );
}
