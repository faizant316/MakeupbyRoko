import { useState, useRef, useEffect, useCallback } from 'react';
import { lenisStop, lenisStart } from '@/lib/lenis';
import ServicePreview from './ServicePreview';

const CATEGORIES = [
  { value: 'bridal', label: 'Bridal' },
  { value: 'event', label: 'Event Glam' },
  { value: 'creative', label: 'Creative' },
  { value: 'lessons', label: 'Lessons' },
];

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

  // Lock the page behind the modal. Lenis owns scrolling site-wide, so
  // `overflow: hidden` alone won't stop wheel scrolling — pause Lenis too,
  // and compensate for the scrollbar width so the page doesn't shift.
  useEffect(() => {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    document.body.style.overflow = 'hidden';
    lenisStop();
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      lenisStart();
    };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  // Theme tokens
  const modalBg = dm ? '#27272a' : '#ffffff';
  const borderColor = dm ? '#3f3f46' : '#E8E9EE';
  const textPrimary = dm ? '#f4f4f5' : '#111111';
  const textMuted = dm ? '#71717a' : '#999999';
  const inputBg = dm ? '#18181b' : '#ffffff';
  const inputBorder = dm ? '#3f3f46' : '#E2E4EA';
  const sectionLabelColor = dm ? '#71717a' : '#a3a3ad';
  const tagBg = dm ? '#18181b' : '#FAFAFB';
  const tagColor = dm ? '#a1a1aa' : '#666';
  const addBtnBg = dm ? '#3f3f46' : '#111111';
  const addBtnColor = dm ? '#f4f4f5' : '#ffffff';
  const subtleBg = dm ? '#1e1e24' : '#FAFAFB';

  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary };
  const inputClass = `w-full px-3.5 py-2.5 rounded-xl text-[0.85rem] outline-none transition-all placeholder:opacity-40 focus:border-[#D4A0B0]`;

  const labelStyle = {
    display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em',
    textTransform: 'uppercase', marginBottom: '6px', color: dm ? '#a1a1aa' : '#808089',
  };

  const Section = ({ children }) => (
    <p className="flex items-center gap-2.5 pt-1" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: sectionLabelColor }}>
      <span className="w-4 h-px" style={{ background: dm ? '#3f3f46' : '#E2E4EA' }} />
      {children}
    </p>
  );

  return (
    <div
      className="fixed inset-0 z-[500] flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[600px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl sm:rounded-[24px]"
        style={{ background: modalBg, border: dm ? `1px solid ${borderColor}` : 'none', animation: 'fadeSlideDown 0.3s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex-none flex justify-between items-center px-5 sm:px-6 border-b"
          style={{ borderColor, paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#F2F2F7' }}>
              <span className="text-[#D4A0B0] text-base">✦</span>
            </div>
            <div>
              <h3 className="font-serif text-[1.25rem] leading-none" style={{ color: textPrimary }}>
                {service ? 'Edit Service' : 'New Service'}
              </h3>
              <p className="text-[0.66rem] mt-1 tracking-wide" style={{ color: textMuted }}>
                {service ? 'Update how this appears on your site' : 'Add a new offering to your site'}
              </p>
            </div>
          </div>
          <button onClick={onClose} type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#3f3f46' : '#F0F0F4', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <form id="service-form" onSubmit={handleSubmit}
          ref={scrollRef} data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4"
          style={{ scrollbarWidth: 'thin' }}>

          {/* Cover photo — photo-forward, like the live service card */}
          <div
            onDrop={handlePhotoDrop}
            onDragOver={e => { e.preventDefault(); setPhotoDragOver(true); }}
            onDragLeave={() => setPhotoDragOver(false)}
            onClick={() => photoInputRef.current?.click()}
            className="relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all group"
            style={{
              aspectRatio: '16 / 7',
              border: `1.5px dashed ${photoDragOver ? '#D4A0B0' : inputBorder}`,
              background: form.photo ? '#000' : (photoDragOver ? 'rgba(212,160,176,0.06)' : subtleBg),
            }}
          >
            {photoUploading ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-[#D4A0B0] text-[0.8rem]">
                <span className="w-4 h-4 border-2 border-[#D4A0B0] border-t-transparent rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
                Uploading…
              </div>
            ) : form.photo ? (
              <>
                <img src={form.photo} alt="Service" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <span className="px-3 py-1.5 rounded-full text-white text-[0.7rem] font-medium" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    Drop or click to replace
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="1.5" className="w-7 h-7 mb-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-[0.78rem] font-medium" style={{ color: textMuted }}>Drop the service photo here or click to upload</p>
                <p className="text-[0.65rem] mt-0.5" style={{ color: textMuted, opacity: 0.6 }}>PNG or JPG, up to 10MB</p>
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadServicePhoto(f); e.target.value = ''; }} />
          </div>

          {/* BASICS */}
          <Section>Basic Info</Section>

          <div>
            <label style={labelStyle}>Service Name *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Full Glam" className={inputClass} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category custom dropdown */}
            <div ref={catRef} className="relative">
              <label style={labelStyle}>Category *</label>
              <button type="button" onClick={() => setCatOpen(!catOpen)}
                className={`${inputClass} text-left flex items-center justify-between cursor-pointer`} style={inputStyle}>
                <span style={{ color: textPrimary }}>{CATEGORIES.find(c => c.value === form.category)?.label}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2"
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {catOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] py-1.5 z-50 overflow-hidden"
                  style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${borderColor}`, animation: 'fadeSlideDown 0.15s ease-out' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => { setForm({ ...form, category: c.value }); setCatOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[0.8rem] transition-colors"
                      style={{
                        color: form.category === c.value ? textPrimary : textMuted,
                        background: form.category === c.value ? (dm ? '#3f3f46' : '#F6F6FA') : 'transparent',
                        fontWeight: form.category === c.value ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (form.category !== c.value) e.currentTarget.style.background = dm ? '#3f3f46' : '#F6F6F9'; }}
                      onMouseLeave={e => { if (form.category !== c.value) e.currentTarget.style.background = 'transparent'; }}>
                      {c.label}
                      {form.category === c.value && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2.5" className="w-3.5 h-3.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* PRICING */}
          <Section>Pricing &amp; Duration</Section>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Display Price *</label>
              <input required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="From $250" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Base Price ($)</label>
              <input type="number" value={form.price_value} onChange={e => setForm({ ...form, price_value: Number(e.target.value) })}
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Duration *</label>
              <input required value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                placeholder="90 min" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Deposit</label>
              <input value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })}
                placeholder="$75 deposit required" className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* CONTENT */}
          <Section>Content</Section>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe this service…" className={`${inputClass} resize-none h-[80px]`} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>What to Expect</label>
            <textarea value={form.what_to_expect} onChange={e => setForm({ ...form, what_to_expect: e.target.value })}
              placeholder="Describe the process and what clients should expect…" className={`${inputClass} resize-none h-[70px]`} style={inputStyle} />
          </div>

          {/* LISTS */}
          <Section>Highlights &amp; Inclusions</Section>

          {/* Includes */}
          <div>
            <label style={labelStyle}>What's Included</label>
            <div className="flex gap-2 mb-2">
              <input value={includeInput} onChange={e => setIncludeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                placeholder="Add an item…" className={`${inputClass} flex-1`} style={inputStyle} />
              <button type="button" onClick={addInclude}
                className="px-4 text-[0.7rem] font-medium rounded-xl transition-colors active:scale-95"
                style={{ background: addBtnBg, color: addBtnColor }}>Add</button>
            </div>
            {form.includes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.includes.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem]"
                    style={{ background: tagBg, border: `1px solid ${borderColor}`, color: tagColor }}>
                    {item}
                    <button type="button" onClick={() => removeInclude(i)} className="hover:text-red-400 transition-colors opacity-50 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Key Features */}
          <div>
            <label style={labelStyle}>Key Features</label>
            <div className="flex gap-2 mb-2">
              <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="e.g., Detailed Consultation…" className={`${inputClass} flex-1`} style={inputStyle} />
              <button type="button" onClick={addFeature}
                className="px-4 text-[0.7rem] font-medium rounded-xl transition-colors active:scale-95"
                style={{ background: addBtnBg, color: addBtnColor }}>Add</button>
            </div>
            {form.key_features.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.key_features.map((feature, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem]"
                    style={{ background: tagBg, border: `1px solid ${borderColor}`, color: tagColor }}>
                    {feature}
                    <button type="button" onClick={() => removeFeature(i)} className="hover:text-red-400 transition-colors opacity-50 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Before & After Photos — drag & drop uploads */}
          <div>
            <label style={labelStyle}>Before &amp; After Photos</label>
            <div
              onDrop={handleBaDrop}
              onDragOver={e => { e.preventDefault(); setBaDragOver(true); }}
              onDragLeave={() => setBaDragOver(false)}
              onClick={() => baInputRef.current?.click()}
              className="rounded-xl px-4 py-5 text-center cursor-pointer transition-all"
              style={{
                border: `1.5px dashed ${baDragOver ? '#D4A0B0' : inputBorder}`,
                background: baDragOver ? 'rgba(212,160,176,0.06)' : inputBg,
              }}
            >
              {baUploading ? (
                <div className="flex items-center justify-center gap-2 text-[#D4A0B0] text-[0.8rem]">
                  <span className="w-4 h-4 border-2 border-[#D4A0B0] border-t-transparent rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
                  Uploading…
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="1.5" className="w-6 h-6 mx-auto mb-1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p className="text-[0.76rem] font-medium" style={{ color: textMuted }}>Drop photos here or click to upload</p>
                  <p className="text-[0.64rem] mt-0.5" style={{ color: textMuted, opacity: 0.6 }}>You can add several at once</p>
                </>
              )}
              <input ref={baInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) uploadBeforeAfter(e.target.files); e.target.value = ''; }} />
            </div>
            {form.before_after_photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {form.before_after_photos.map((photo, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden"
                    style={{ background: tagBg, border: `1px solid ${borderColor}` }}>
                    <img src={photo} alt={`Before & After ${i + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SETTINGS */}
          <Section>Visibility</Section>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
            <div>
              <p className="text-[0.8rem] font-medium" style={{ color: textPrimary }}>Active Service</p>
              <p className="text-[0.72rem]" style={{ color: textMuted }}>
                {form.is_active ? 'Visible to clients on the site' : 'Hidden from clients'}
              </p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="relative w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0"
              style={{ background: form.is_active ? '#D4A0B0' : (dm ? '#3f3f46' : '#e2e8f0') }}>
              <div className="w-5 h-5 rounded-full shadow transition-transform duration-200"
                style={{ background: '#fff', transform: form.is_active ? 'translateX(20px)' : 'translateX(0px)' }} />
            </button>
          </div>

          {/* Preview toggle */}
          <button type="button" onClick={() => setShowPreview(!showPreview)}
            className="w-full py-2.5 text-[0.75rem] font-medium tracking-[0.04em] rounded-xl border transition-all"
            style={showPreview
              ? { background: dm ? '#3f3f46' : '#FAFAFB', borderColor: '#D4A0B0', color: '#D4A0B0' }
              : { background: 'transparent', borderColor, color: textMuted }
            }>
            {showPreview ? 'Hide Preview ↑' : 'Preview Card ↓'}
          </button>

          {showPreview && (
            <div className="rounded-xl p-4" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
              <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase text-[#a3a3ad] mb-3">How it looks on the homepage</p>
              <ServicePreview form={form} />
            </div>
          )}
        </form>

        {/* ── Pinned footer ── */}
        <div className="flex-none px-5 sm:px-6 py-3.5 border-t flex items-center gap-3"
          style={{ borderColor, background: modalBg, paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose}
            className="px-5 py-3 text-[0.78rem] font-medium rounded-xl border transition-all active:scale-[0.98]"
            style={{ borderColor: inputBorder, color: textMuted, background: 'transparent' }}>
            Cancel
          </button>
          <button type="submit" form="service-form" disabled={saving}
            className="flex-1 py-3 text-[0.82rem] font-medium tracking-[0.04em] rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.99]"
            style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>
            {saving ? 'Saving…' : service ? 'Update Service' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>
  );
}
