import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [photoInput, setPhotoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const photoInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
  const addPhoto = () => { if (!photoInput.trim()) return; setForm(f => ({ ...f, before_after_photos: [...f.before_after_photos, photoInput.trim()] })); setPhotoInput(''); };
  const removePhoto = (idx) => setForm(f => ({ ...f, before_after_photos: f.before_after_photos.filter((_, i) => i !== idx) }));

  const uploadServicePhoto = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm(f => ({ ...f, photo: data.url }));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handlePhotoDrop = useCallback((e) => {
    e.preventDefault();
    setPhotoDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadServicePhoto(file);
  }, [uploadServicePhoto]);

  // Theme tokens
  const modalBg = dm ? '#27272a' : '#ffffff';
  const headerBg = dm ? '#27272a' : '#ffffff';
  const borderColor = dm ? '#3f3f46' : '#e8e2dc';
  const textPrimary = dm ? '#f4f4f5' : '#111111';
  const textMuted = dm ? '#71717a' : '#999999';
  const inputBg = dm ? '#18181b' : '#ffffff';
  const inputBorder = dm ? '#3f3f46' : '#e4ddd7';
  const inputFocus = '#D4A0B0';
  const sectionLabelColor = dm ? '#52525b' : '#c4bab2';
  const tagBg = dm ? '#18181b' : '#FAF8F6';
  const tagColor = dm ? '#a1a1aa' : '#666';
  const addBtnBg = dm ? '#3f3f46' : '#111111';
  const addBtnColor = dm ? '#f4f4f5' : '#ffffff';

  const inputStyle = {
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    color: textPrimary,
  };

  const inputClass = `w-full px-3.5 py-2.5 rounded-lg text-[0.85rem] outline-none transition-all placeholder:opacity-40`;

  const labelStyle = {
    display: 'block',
    fontSize: '0.6rem',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: '6px',
    color: dm ? '#a1a1aa' : '#111111',
  };

  const sectionStyle = {
    fontSize: '0.6rem',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: sectionLabelColor,
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[560px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: modalBg, border: `1px solid ${borderColor}`, animation: 'fadeSlideDown 0.3s ease-out' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex justify-between items-center px-6 py-4"
          style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#f5f0ec' }}>
              <span className="text-[#D4A0B0] text-sm">✦</span>
            </div>
            <h3 className="font-serif text-[1.2rem]" style={{ color: textPrimary }}>
              {service ? 'Edit Service' : 'New Service'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: dm ? '#3f3f46' : '#f4f4f5', color: textMuted }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

          {/* BASICS */}
          <p style={sectionStyle}>Basic Info</p>

          <div>
            <label style={labelStyle}>Service Name *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Full Glam" className={inputClass} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category custom dropdown */}
            <div ref={catRef} className="relative">
              <label style={labelStyle}>Category *</label>
              <button
                type="button"
                onClick={() => setCatOpen(!catOpen)}
                className={`${inputClass} text-left flex items-center justify-between cursor-pointer`}
                style={inputStyle}
              >
                <span style={{ color: textPrimary }}>{CATEGORIES.find(c => c.value === form.category)?.label}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2"
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {catOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] py-1.5 z-50 overflow-hidden"
                  style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${borderColor}`, animation: 'fadeSlideDown 0.15s ease-out' }}
                >
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => { setForm({ ...form, category: c.value }); setCatOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[0.8rem] transition-colors"
                      style={{
                        color: form.category === c.value ? textPrimary : textMuted,
                        background: form.category === c.value ? (dm ? '#3f3f46' : '#FAF5F2') : 'transparent',
                        fontWeight: form.category === c.value ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (form.category !== c.value) e.currentTarget.style.background = dm ? '#3f3f46' : '#f9f6f3'; }}
                      onMouseLeave={e => { if (form.category !== c.value) e.currentTarget.style.background = 'transparent'; }}
                    >
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

          <div className="w-full h-px" style={{ background: borderColor }} />

          {/* PRICING */}
          <p style={sectionStyle}>Pricing &amp; Duration</p>

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

          <div className="w-full h-px" style={{ background: borderColor }} />

          {/* CONTENT */}
          <p style={sectionStyle}>Content</p>

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

          <div>
            <label style={labelStyle}>Service Photo</label>
            <div
              onDrop={handlePhotoDrop}
              onDragOver={e => { e.preventDefault(); setPhotoDragOver(true); }}
              onDragLeave={() => setPhotoDragOver(false)}
              onClick={() => photoInputRef.current?.click()}
              style={{
                border: `2px dashed ${photoDragOver ? '#D4A0B0' : inputBorder}`,
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                background: photoDragOver ? 'rgba(212,160,176,0.06)' : inputBg,
                transition: 'all 0.15s',
                textAlign: 'center',
              }}
            >
              {photoUploading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#D4A0B0', fontSize: '0.8rem' }}>
                  <div style={{ width: '14px', height: '14px', border: '2px solid #D4A0B0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Uploading…
                </div>
              ) : form.photo ? (
                <div style={{ position: 'relative' }}>
                  <img src={form.photo} alt="Service" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.65rem', color: textMuted, margin: 0 }}>Drop a new image or click to replace</p>
                </div>
              ) : (
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="1.5" style={{ width: '28px', height: '28px', margin: '0 auto 8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p style={{ fontSize: '0.78rem', color: textMuted, margin: '0 0 3px', fontWeight: 500 }}>Drop image here or click to upload</p>
                  <p style={{ fontSize: '0.65rem', color: textMuted, margin: 0, opacity: 0.6 }}>PNG, JPG up to 10MB</p>
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadServicePhoto(f); e.target.value = ''; }} />
            </div>
          </div>

          <div className="w-full h-px" style={{ background: borderColor }} />

          {/* LISTS */}
          <p style={sectionStyle}>Lists</p>

          {/* Includes */}
          <div>
            <label style={labelStyle}>What's Included</label>
            <div className="flex gap-2 mb-2">
              <input value={includeInput} onChange={e => setIncludeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                placeholder="Add an item…" className={`${inputClass} flex-1`} style={inputStyle} />
              <button type="button" onClick={addInclude}
                className="px-3.5 py-2 text-[0.7rem] font-medium rounded-lg transition-colors"
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
                className="px-3.5 py-2 text-[0.7rem] font-medium rounded-lg transition-colors"
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

          {/* Before & After Photos */}
          <div>
            <label style={labelStyle}>Before &amp; After Photo URLs</label>
            <div className="flex gap-2 mb-2">
              <input value={photoInput} onChange={e => setPhotoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPhoto())}
                placeholder="https://…" className={`${inputClass} flex-1`} style={inputStyle} />
              <button type="button" onClick={addPhoto}
                className="px-3.5 py-2 text-[0.7rem] font-medium rounded-lg transition-colors"
                style={{ background: addBtnBg, color: addBtnColor }}>Add</button>
            </div>
            {form.before_after_photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.before_after_photos.map((photo, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden"
                    style={{ background: tagBg, border: `1px solid ${borderColor}` }}>
                    <img src={photo} alt={`Before & After ${i}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-lg">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full h-px" style={{ background: borderColor }} />

          {/* Active toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-lg"
            style={{ background: dm ? '#18181b' : '#f9f7f5', border: `1px solid ${borderColor}` }}>
            <div>
              <p className="text-[0.8rem] font-medium" style={{ color: textPrimary }}>Active Service</p>
              <p className="text-[0.72rem]" style={{ color: textMuted }}>
                {form.is_active ? 'Visible to clients on the site' : 'Hidden from clients'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="relative w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0"
              style={{ background: form.is_active ? '#D4A0B0' : (dm ? '#3f3f46' : '#e2e8f0') }}
            >
              <div
                className="w-5 h-5 rounded-full shadow transition-transform duration-200"
                style={{ background: '#fff', transform: form.is_active ? 'translateX(20px)' : 'translateX(0px)' }}
              />
            </button>
          </div>

          {/* Preview toggle */}
          <button type="button" onClick={() => setShowPreview(!showPreview)}
            className="w-full py-2.5 text-[0.75rem] font-medium tracking-[0.04em] rounded-lg border transition-all"
            style={showPreview
              ? { background: dm ? '#3f3f46' : '#FAF8F6', borderColor: '#D4A0B0', color: '#D4A0B0' }
              : { background: 'transparent', borderColor: borderColor, color: textMuted }
            }>
            {showPreview ? 'Hide Preview ↑' : 'Preview Card ↓'}
          </button>

          {showPreview && (
            <div className="rounded-xl p-4" style={{ background: dm ? '#18181b' : '#FAF8F6', border: `1px solid ${borderColor}` }}>
              <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-3">How it looks on the homepage</p>
              <ServicePreview form={form} />
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={saving}
            className="w-full py-3 text-[0.8rem] font-medium rounded-lg transition-all shadow-sm disabled:opacity-50 mt-1"
            style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>
            {saving ? 'Saving…' : service ? 'Update Service' : 'Create Service'}
          </button>
        </form>
      </div>
    </div>
  );
}