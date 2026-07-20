import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CONTRACT_PLACEHOLDERS } from '@/lib/contract';

// Full-contract editor. Roko opens this from the Services tab to rewrite the
// entire client agreement: title, intro, every section (heading + body),
// reorder / add / remove sections, and the photo-consent question. Dynamic
// booking values are inserted with {placeholder} chips so the numbers always
// stay correct. A live preview on the right shows exactly what a client sees.
//
// Presentational: all state lives in ContractSettings and is passed in.
export default function ContractEditorModal({
  dm,
  artistName, setArtistName,
  cancellationDays, setCancellationDays,
  travelFee, setTravelFee,
  title, setTitle,
  intro, setIntro,
  consent, setConsent,
  sections, setSections,
  preview,            // built contract object for the live preview
  onReset, onClose, onSave, saving, saved,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Track the field the cursor is in so placeholder chips insert in the right
  // place. `apply` writes the new string back into the correct piece of state.
  const activeRef = useRef(null);
  const applyRef = useRef(null);

  const registerFocus = (el, apply) => { activeRef.current = el; applyRef.current = apply; };

  const insertToken = (token) => {
    const el = activeRef.current;
    const apply = applyRef.current;
    if (!el || !apply) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    apply(next);
    // Restore focus + place the cursor just after the inserted token.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      try { el.setSelectionRange(pos, pos); } catch { /* number inputs */ }
    });
  };

  // ── Section helpers ──
  const updateSection = (i, patch) => setSections(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moveSection = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = sections.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };
  const removeSection = (i) => setSections(sections.filter((_, idx) => idx !== i));
  const addSection = () => setSections([...sections, { id: `custom-${Date.now()}`, heading: '', body: '' }]);

  // ── Styles ──
  const panelBg = dm ? '#1c1c22' : '#fff';
  const softBg = dm ? '#26262e' : '#FBFAF9';
  const border = dm ? '#3a3a48' : '#E5E7EB';
  const textMain = dm ? '#ECEDF1' : '#111';
  const textSub = dm ? '#a1a1aa' : '#555';
  const textHint = dm ? '#71717a' : '#999';
  const inputStyle = { border: `1px solid ${border}`, color: textMain, background: dm ? '#141419' : '#fff' };

  const fieldLabel = 'block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-1.5';

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex items-stretch sm:items-center sm:justify-center"
      style={{ background: 'rgba(15,12,14,0.55)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-[1040px] sm:mx-4 sm:rounded-2xl overflow-hidden flex flex-col sm:max-h-[92vh]"
        style={{ background: panelBg, border: `1px solid ${border}`, boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${border}`, background: softBg }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.85rem] font-semibold tracking-tight leading-tight" style={{ color: textMain }}>Edit Client Contract</p>
              <p className="text-[0.64rem] leading-tight" style={{ color: textHint }}>The agreement clients sign when booking an appointment</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/5" style={{ color: textSub }} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body: editor (left) + live preview (right) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_400px]">
          {/* ── Editor column ── */}
          <div className="overflow-y-auto px-5 sm:px-6 py-5" data-lenis-prevent style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Auto-fill details — feed the {artistName}, {days}, {travelFee} tokens */}
            <div className="rounded-xl p-3.5 mb-5" style={{ background: softBg, border: `1px solid ${border}` }}>
              <p className="text-[0.62rem] font-semibold mb-2.5" style={{ color: textSub }}>
                Details <span style={{ color: textHint, fontWeight: 400 }}>— these fill in automatically across the contract.</span>
              </p>
              <div className="mb-3">
                <label className={fieldLabel} style={{ color: textHint }}>Your legal / business name</label>
                <input
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  placeholder="Roqia Moshref"
                  className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={fieldLabel} style={{ color: textHint }}>Cancellation notice (days)</label>
                  <input
                    type="number" min="0" max="90"
                    value={cancellationDays}
                    onChange={e => setCancellationDays(e.target.value)}
                    placeholder="14"
                    className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle}
                  />
                </div>
                <div className="flex-1">
                  <label className={fieldLabel} style={{ color: textHint }}>Travel fee starts at</label>
                  <input
                    value={travelFee}
                    onChange={e => setTravelFee(e.target.value)}
                    placeholder="$200"
                    className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Placeholder chips */}
            <div className="rounded-xl p-3 mb-5" style={{ background: softBg, border: `1px dashed ${border}` }}>
              <p className="text-[0.62rem] font-semibold mb-2" style={{ color: textSub }}>
                Insert a detail <span style={{ color: textHint, fontWeight: 400 }}>— tap to drop it wherever your cursor is. It fills in per client.</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONTRACT_PLACEHOLDERS.map(p => (
                  <button
                    key={p.token}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertToken(p.token)}
                    title={`${p.label} · e.g. ${p.sample}`}
                    className="px-2 py-1 rounded-md text-[0.64rem] font-medium transition-colors"
                    style={{ background: dm ? '#141419' : '#fff', color: '#C4849A', border: `1px solid ${border}` }}
                  >
                    {p.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className={fieldLabel} style={{ color: textHint }}>Contract Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={e => registerFocus(e.target, setTitle)}
                placeholder="Service Agreement"
                className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle}
              />
            </div>

            {/* Intro */}
            <div className="mb-5">
              <label className={fieldLabel} style={{ color: textHint }}>Introduction</label>
              <textarea
                value={intro}
                onChange={e => setIntro(e.target.value)}
                onFocus={e => registerFocus(e.target, setIntro)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl text-[0.8rem] leading-[1.6] outline-none resize-y" style={inputStyle}
              />
            </div>

            {/* Sections */}
            <div className="flex items-center justify-between mb-2.5">
              <label className={fieldLabel + ' mb-0'} style={{ color: textHint }}>Sections</label>
              <span className="text-[0.6rem]" style={{ color: textHint }}>{sections.length} total</span>
            </div>

            <div className="flex flex-col gap-3">
              {sections.map((s, i) => (
                <div key={s.id} className="rounded-xl p-3" style={{ background: softBg, border: `1px solid ${border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[0.62rem] font-semibold flex-shrink-0" style={{ background: 'rgba(212,160,176,0.14)', color: '#C4849A', border: `1px solid ${border}` }}>{i + 1}</span>
                    <input
                      value={s.heading}
                      onChange={e => updateSection(i, { heading: e.target.value })}
                      onFocus={e => registerFocus(e.target, (v) => updateSection(i, { heading: v }))}
                      placeholder="Section heading"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[0.78rem] font-semibold outline-none" style={inputStyle}
                    />
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <IconBtn dm={dm} disabled={i === 0} onClick={() => moveSection(i, -1)} label="Move up">
                        <polyline points="18 15 12 9 6 15" />
                      </IconBtn>
                      <IconBtn dm={dm} disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)} label="Move down">
                        <polyline points="6 9 12 15 18 9" />
                      </IconBtn>
                      <IconBtn dm={dm} danger onClick={() => removeSection(i)} label="Delete section">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </IconBtn>
                    </div>
                  </div>
                  <textarea
                    value={s.body}
                    onChange={e => updateSection(i, { body: e.target.value })}
                    onFocus={e => registerFocus(e.target, (v) => updateSection(i, { body: v }))}
                    placeholder="Section wording…"
                    rows={4}
                    className="w-full px-2.5 py-2 rounded-lg text-[0.76rem] leading-[1.6] outline-none resize-y" style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-3 w-full py-2.5 rounded-xl text-[0.72rem] font-semibold transition-colors flex items-center justify-center gap-1.5"
              style={{ color: textSub, border: `1px dashed ${border}`, background: 'transparent' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add a section
            </button>

            {/* Photo consent question */}
            <div className="mt-6">
              <label className={fieldLabel} style={{ color: textHint }}>Photo Permission Question</label>
              <textarea
                value={consent}
                onChange={e => setConsent(e.target.value)}
                onFocus={e => registerFocus(e.target, setConsent)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl text-[0.8rem] leading-[1.6] outline-none resize-y" style={inputStyle}
              />
              <p className="text-[0.62rem] mt-1" style={{ color: textHint }}>The yes / no question clients answer before signing.</p>
            </div>
          </div>

          {/* ── Live preview column ── */}
          <div className="hidden lg:flex flex-col border-l overflow-hidden" style={{ borderColor: border, background: dm ? '#141419' : '#FBF7F9' }}>
            <div className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]" />
              <span className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase" style={{ color: textHint }}>Live Preview</span>
            </div>
            <div className="overflow-y-auto px-4 py-4" data-lenis-prevent>
              <ContractPreview c={preview} dm={dm} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 flex-shrink-0" style={{ borderTop: `1px solid ${border}`, background: softBg }}>
          <button
            onClick={onReset}
            className="text-[0.7rem] font-medium transition-colors hover:underline underline-offset-2"
            style={{ color: textSub }}
          >
            Reset to default wording
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-[0.72rem] font-semibold transition-colors" style={{ color: textSub, border: `1px solid ${border}` }}>
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-[0.72rem] font-semibold transition-all bg-[#111] text-white hover:bg-[#222] shadow-sm disabled:opacity-60"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Contract'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Small square icon button used for section reorder / delete.
function IconBtn({ children, onClick, disabled, danger, label, dm }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5"
      style={{ color: danger ? '#e06a6a' : (dm ? '#a1a1aa' : '#888') }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">{children}</svg>
    </button>
  );
}

// Renders a built contract object the same way the client sees it at sign time.
// Shared by the modal preview and the collapsed card preview.
export function ContractPreview({ c, dm }) {
  if (!c) return null;
  const textMain = dm ? '#ECEDF1' : '#121216';
  const textBody = dm ? '#b6b6c0' : '#666';
  return (
    <div>
      <p className="text-[0.56rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A] mb-1.5">{c.title}</p>
      <p className="text-[0.72rem] leading-[1.7] mb-3" style={{ color: textBody }}>{c.intro}</p>
      {c.sections.map((s, i) => (
        <div key={i} className="mb-3">
          <p className="text-[0.7rem] font-semibold mb-0.5" style={{ color: textMain }}>{i + 1}. {s.heading}</p>
          <p className="text-[0.68rem] leading-[1.6]" style={{ color: textBody }}>{s.body}</p>
        </div>
      ))}
      {c.photoConsentQuestion && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${dm ? '#3a3a48' : '#E5E7EB'}` }}>
          <p className="text-[0.56rem] font-semibold tracking-[0.12em] uppercase text-[#C4849A] mb-1">Photo Permission</p>
          <p className="text-[0.68rem] leading-[1.6]" style={{ color: textBody }}>{c.photoConsentQuestion}</p>
        </div>
      )}
    </div>
  );
}
