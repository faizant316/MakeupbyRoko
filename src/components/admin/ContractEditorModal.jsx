import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CONTRACT_PLACEHOLDERS } from '@/lib/contract';
import { Check } from './Glyphs';

// Full-contract editor. Roko opens this from the Services tab to rewrite the
// entire client agreement: title, intro, every section (heading + body),
// reorder / add / remove sections, and the photo-consent question. Dynamic
// booking values are inserted with {placeholder} chips so the numbers always
// stay correct. A live preview on the right shows exactly what a client sees.
//
// Presentational: all state lives in ContractSettings and is passed in.

// Short pill labels. The shared CONTRACT_PLACEHOLDERS labels are sentences
// ("Balance left after the deposit") that make a row of pills unreadable; the
// full label + a sample value show in the hint line instead.
const SHORT_LABEL = {
  '{clientName}': 'Client',
  '{serviceName}': 'Service',
  '{date}': 'Date',
  '{time}': 'Time',
  '{deposit}': 'Deposit',
  '{price}': 'Price',
  '{balance}': 'Balance',
  '{days}': 'Notice days',
  '{travelFee}': 'Travel fee',
  '{artistName}': 'Your name',
  '{businessName}': 'Brand',
  '{studioLocation}': 'Studio',
};

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
  // place. `apply` writes the new string back into the correct piece of state,
  // and the label tells her where the next detail will land.
  const activeRef = useRef(null);
  const applyRef = useRef(null);
  const [activeLabel, setActiveLabel] = useState('');
  const [hoverToken, setHoverToken] = useState(null);

  const registerFocus = (el, apply, label) => {
    activeRef.current = el;
    applyRef.current = apply;
    setActiveLabel(label);
  };

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

  // ── Unsaved-changes guard ──
  // Snapshot what the editor opened with so closing can't silently throw away
  // a rewrite (backdrop clicks used to do exactly that).
  const snapshot = JSON.stringify({ artistName, cancellationDays, travelFee, title, intro, consent, sections });
  const openedWith = useRef(null);
  if (openedWith.current === null) openedWith.current = snapshot;
  const dirty = openedWith.current !== snapshot;

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const requestClose = () => { if (dirty) setConfirmClose(true); else onClose(); };

  // Escape backs out one layer at a time; ⌘S / Ctrl+S saves.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmClose) setConfirmClose(false);
        else if (confirmReset) setConfirmReset(false);
        else if (confirmDelete !== null) setConfirmDelete(null);
        else requestClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── Styles ──
  const panelBg = dm ? '#1c1c22' : '#fff';
  const groupBg = dm ? '#26262e' : '#F5F5F7';
  const fieldBg = dm ? '#1c1c22' : '#fff';
  const border = dm ? '#3a3a48' : '#E5E7EB';
  const hairline = dm ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textMain = dm ? '#ECEDF1' : '#111';
  const textSub = dm ? '#a1a1aa' : '#555';
  const textHint = dm ? '#71717a' : '#8A8A8E';
  const accent = '#C4849A';
  const ring = 'transition-shadow focus-within:shadow-[0_0_0_3px_rgba(212,160,176,0.20)]';

  const groupCard = { background: groupBg, border: `1px solid ${border}`, borderRadius: 14 };

  const hovered = hoverToken && CONTRACT_PLACEHOLDERS.find(p => p.token === hoverToken);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex items-stretch sm:items-center sm:justify-center"
      style={{ background: 'rgba(15,12,14,0.55)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        className="relative w-full sm:max-w-[1040px] sm:mx-4 sm:rounded-2xl overflow-hidden flex flex-col sm:max-h-[92vh]"
        style={{ background: panelBg, border: `1px solid ${border}`, boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${border}`, background: groupBg }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.88rem] font-semibold tracking-tight leading-tight" style={{ color: textMain }}>Edit Client Contract</p>
              <p className="text-[0.68rem] leading-tight mt-0.5" style={{ color: textHint }}>The agreement clients sign when booking an appointment</p>
            </div>
          </div>
          <button onClick={requestClose} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/10" style={{ color: textSub }} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body: editor (left) + live preview (right) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_400px]">
          {/* ── Editor column ── */}
          <div className="overflow-y-auto px-5 sm:px-6 py-5" data-lenis-prevent style={{ WebkitOverflowScrolling: 'touch' }}>

            {/* Insert bar — stays pinned so a detail is always one tap away,
                even eight sections down. Solid (not blurred) on purpose. */}
            <div
              className="sticky -top-5 z-20 -mx-5 sm:-mx-6 -mt-5 px-5 sm:px-6 pt-5 pb-3"
              style={{ background: panelBg, borderBottom: `1px solid ${hairline}` }}
            >
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <span
                  className="flex-shrink-0 w-[18px] h-[18px] rounded-md flex items-center justify-center text-[0.58rem] font-bold"
                  style={{ background: 'rgba(212,160,176,0.15)', color: accent }}
                >{'{}'}</span>
                <p className="text-[0.7rem] leading-tight truncate" style={{ color: textSub }}>
                  {hovered ? (
                    <>{hovered.label} <span style={{ color: textHint }}>→ {hovered.sample}</span></>
                  ) : activeLabel ? (
                    <>Inserting into <span className="font-semibold" style={{ color: textMain }}>{activeLabel}</span></>
                  ) : (
                    <>Tap a text box below, then tap a detail to drop it in.</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONTRACT_PLACEHOLDERS.map(p => {
                  const armed = !!activeLabel;
                  return (
                    <button
                      key={p.token}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHoverToken(p.token)}
                      onMouseLeave={() => setHoverToken(null)}
                      onClick={() => insertToken(p.token)}
                      title={`${p.label} · e.g. ${p.sample}`}
                      className="px-2.5 py-[3px] rounded-full text-[0.68rem] font-medium transition-all active:scale-95"
                      style={{
                        background: dm ? 'rgba(212,160,176,0.12)' : 'rgba(212,160,176,0.14)',
                        color: accent,
                        border: `1px solid ${dm ? 'rgba(212,160,176,0.22)' : 'rgba(212,160,176,0.28)'}`,
                        opacity: armed ? 1 : 0.55,
                      }}
                    >
                      {SHORT_LABEL[p.token] || p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Your details ── */}
            <GroupLabel textHint={textHint}>Your details</GroupLabel>
            <div className={ring} style={groupCard}>
              <ListRow label="Legal / business name" hairline={hairline} textSub={textSub} first>
                <input
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  placeholder="Roqia Moshref"
                  className="flex-1 min-w-0 bg-transparent text-right text-[0.84rem] outline-none"
                  style={{ color: textMain }}
                />
              </ListRow>
              <ListRow label="Cancellation notice" hairline={hairline} textSub={textSub}>
                <input
                  type="number" min="0" max="90"
                  value={cancellationDays}
                  onChange={e => setCancellationDays(e.target.value)}
                  placeholder="14"
                  className="w-14 bg-transparent text-right text-[0.84rem] outline-none"
                  style={{ color: textMain }}
                />
                <span className="text-[0.78rem] ml-1.5" style={{ color: textHint }}>days</span>
              </ListRow>
              <ListRow label="Travel fee starts at" hairline={hairline} textSub={textSub}>
                <input
                  value={travelFee}
                  onChange={e => setTravelFee(e.target.value)}
                  placeholder="$200"
                  className="w-24 bg-transparent text-right text-[0.84rem] outline-none"
                  style={{ color: textMain }}
                />
              </ListRow>
            </div>
            <p className="text-[0.66rem] mt-1.5 px-1 leading-[1.5]" style={{ color: textHint }}>
              These fill in wherever you insert Your&nbsp;name, Notice&nbsp;days, or Travel&nbsp;fee.
            </p>

            {/* ── Opening ── */}
            <GroupLabel textHint={textHint}>Opening</GroupLabel>
            <div className={ring} style={groupCard}>
              <ListRow label="Contract title" hairline={hairline} textSub={textSub} first>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onFocus={e => registerFocus(e.target, setTitle, 'Contract title')}
                  placeholder="Service Agreement"
                  className="flex-1 min-w-0 bg-transparent text-right text-[0.84rem] font-medium outline-none"
                  style={{ color: textMain }}
                />
              </ListRow>
              <div className="px-3.5 py-3" style={{ borderTop: `1px solid ${hairline}` }}>
                <p className="text-[0.72rem] font-medium mb-1.5" style={{ color: textSub }}>Introduction</p>
                <AutoTextarea
                  value={intro}
                  onChange={e => setIntro(e.target.value)}
                  onFocus={e => registerFocus(e.target, setIntro, 'Introduction')}
                  minRows={3}
                  className="text-[0.82rem] leading-[1.65] rounded-[10px] px-3 py-2.5"
                  style={{ color: textMain, background: fieldBg, border: `1px solid ${border}` }}
                />
              </div>
            </div>

            {/* ── Sections ── */}
            <GroupLabel
              textHint={textHint}
              right={<span className="text-[0.62rem]" style={{ color: textHint }}>{sections.length}</span>}
            >
              Sections
            </GroupLabel>

            <div className="flex flex-col gap-2.5">
              {sections.map((s, i) => (
                <div key={s.id} className={`overflow-hidden ${ring}`} style={groupCard}>
                  <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                    <span
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.64rem] font-semibold flex-shrink-0"
                      style={{ background: 'rgba(212,160,176,0.15)', color: accent }}
                    >{i + 1}</span>
                    <input
                      value={s.heading}
                      onChange={e => updateSection(i, { heading: e.target.value })}
                      onFocus={e => registerFocus(e.target, (v) => updateSection(i, { heading: v }), `Section ${i + 1}`)}
                      placeholder="Section heading"
                      className="flex-1 min-w-0 bg-transparent text-[0.86rem] font-semibold tracking-tight outline-none"
                      style={{ color: textMain }}
                    />
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <IconBtn dm={dm} disabled={i === 0} onClick={() => moveSection(i, -1)} label="Move up">
                        <polyline points="18 15 12 9 6 15" />
                      </IconBtn>
                      <IconBtn dm={dm} disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)} label="Move down">
                        <polyline points="6 9 12 15 18 9" />
                      </IconBtn>
                      <IconBtn dm={dm} danger onClick={() => setConfirmDelete(i)} label="Delete section">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </IconBtn>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <AutoTextarea
                      value={s.body}
                      onChange={e => updateSection(i, { body: e.target.value })}
                      onFocus={e => registerFocus(e.target, (v) => updateSection(i, { body: v }), `Section ${i + 1}`)}
                      placeholder="Section wording…"
                      minRows={3}
                      className="text-[0.8rem] leading-[1.65] rounded-[10px] px-3 py-2.5"
                      style={{ color: textSub, background: fieldBg, border: `1px solid ${border}` }}
                    />
                  </div>
                  {confirmDelete === i && (
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5" style={{ borderTop: `1px solid ${hairline}`, background: dm ? 'rgba(224,106,106,0.10)' : 'rgba(224,106,106,0.07)' }}>
                      <span className="text-[0.7rem] leading-snug" style={{ color: textSub }}>Remove this section from the contract?</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-full text-[0.7rem] font-semibold" style={{ color: textSub, border: `1px solid ${border}` }}>Keep</button>
                        <button onClick={() => { removeSection(i); setConfirmDelete(null); }} className="px-3 py-1.5 rounded-full text-[0.7rem] font-semibold text-white" style={{ background: '#e06a6a' }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-2.5 w-full py-2.5 rounded-[14px] text-[0.76rem] font-semibold transition-colors flex items-center justify-center gap-1.5 active:scale-[0.99]"
              style={{ color: accent, background: groupBg, border: `1px solid ${border}` }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add a section
            </button>

            {/* ── Before signing ── */}
            <GroupLabel textHint={textHint}>Before signing</GroupLabel>
            <div className={ring} style={groupCard}>
              <div className="px-3.5 py-3">
                <p className="text-[0.72rem] font-medium mb-1.5" style={{ color: textSub }}>Photo permission question</p>
                <AutoTextarea
                  value={consent}
                  onChange={e => setConsent(e.target.value)}
                  onFocus={e => registerFocus(e.target, setConsent, 'Photo permission')}
                  minRows={2}
                  className="text-[0.82rem] leading-[1.65] rounded-[10px] px-3 py-2.5"
                  style={{ color: textMain, background: fieldBg, border: `1px solid ${border}` }}
                />
              </div>
            </div>
            <p className="text-[0.66rem] mt-1.5 px-1" style={{ color: textHint }}>
              The yes / no question clients answer right before they sign.
            </p>
          </div>

          {/* ── Live preview column ── */}
          <div className="hidden lg:flex flex-col border-l overflow-hidden" style={{ borderColor: border, background: dm ? '#141419' : '#F5F5F7' }}>
            <div className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]" />
              <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase" style={{ color: textHint }}>Live Preview</span>
              <span className="text-[0.6rem] ml-auto" style={{ color: textHint }}>What the client sees</span>
            </div>
            <div className="overflow-y-auto px-4 py-4" data-lenis-prevent>
              {/* Sit the contract on a paper sheet so it reads as a document */}
              <div
                className="rounded-2xl px-4 py-4"
                style={{ background: dm ? '#1c1c22' : '#fff', border: `1px solid ${border}`, boxShadow: dm ? 'none' : '0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04)' }}
              >
                <ContractPreview c={preview} dm={dm} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 flex-shrink-0" style={{ borderTop: `1px solid ${border}`, background: groupBg }}>
          {confirmReset ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[0.7rem] truncate" style={{ color: textSub }}>Replace all wording with the original?</span>
              <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-full text-[0.7rem] font-semibold flex-shrink-0" style={{ color: textSub, border: `1px solid ${border}` }}>Cancel</button>
              <button onClick={() => { onReset(); setConfirmReset(false); }} className="px-3 py-1.5 rounded-full text-[0.7rem] font-semibold text-white flex-shrink-0" style={{ background: '#e06a6a' }}>Reset</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-[0.72rem] font-medium transition-colors hover:underline underline-offset-2"
              style={{ color: textSub }}
            >
              Reset to default wording
            </button>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {dirty && !saving && !saved && (
              <span className="hidden sm:inline text-[0.66rem] mr-1" style={{ color: textHint }}>Unsaved changes</span>
            )}
            <button onClick={requestClose} className="px-4 py-2 rounded-full text-[0.74rem] font-semibold transition-colors" style={{ color: textSub, border: `1px solid ${border}` }}>
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-5 py-2 rounded-full text-[0.74rem] font-semibold transition-all bg-[#111] text-white hover:bg-[#222] shadow-sm disabled:opacity-60 active:scale-[0.98]"
            >
              {saving ? 'Saving…'
                : saved ? <span className="inline-flex items-center gap-1.5"><Check className="w-3 h-3" strokeWidth={3.2} />Saved</span>
                : 'Save Contract'}
            </button>
          </div>
        </div>

        {/* Unsaved-changes guard */}
        {confirmClose && (
          <div className="absolute inset-0 z-30 flex items-center justify-center px-6" style={{ background: 'rgba(10,8,10,0.55)' }}>
            <div className="w-full max-w-[300px] rounded-2xl p-5 text-center" style={{ background: panelBg, border: `1px solid ${border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
              <p className="text-[0.84rem] font-semibold mb-1" style={{ color: textMain }}>Discard your changes?</p>
              <p className="text-[0.72rem] leading-[1.5] mb-4" style={{ color: textHint }}>Your edits to the contract haven&apos;t been saved yet.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setConfirmClose(false); onSave(); }} className="w-full py-2.5 rounded-full text-[0.76rem] font-semibold bg-[#111] text-white">Save &amp; close</button>
                <button onClick={onClose} className="w-full py-2.5 rounded-full text-[0.76rem] font-semibold" style={{ color: '#e06a6a', border: `1px solid ${border}` }}>Discard</button>
                <button onClick={() => setConfirmClose(false)} className="w-full py-1.5 text-[0.72rem] font-medium" style={{ color: textSub }}>Keep editing</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Small-caps header that sits above a grouped card, iOS Settings style.
function GroupLabel({ children, right, textHint }) {
  return (
    <div className="flex items-end justify-between px-1 mt-5 mb-1.5 first:mt-0">
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.1em]" style={{ color: textHint }}>{children}</span>
      {right}
    </div>
  );
}

// One row of a grouped inset list: label left, value right, hairline above.
function ListRow({ label, children, hairline, textSub, first }) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5"
      style={first ? undefined : { borderTop: `1px solid ${hairline}` }}
    >
      <span className="text-[0.78rem] flex-shrink-0" style={{ color: textSub }}>{label}</span>
      <div className="flex-1 min-w-0 flex items-center justify-end">{children}</div>
    </div>
  );
}

// Textarea that grows with its content, so nothing is ever typed into a
// four-line window with its own scrollbar.
function AutoTextarea({ value, onChange, minRows = 3, className = '', style, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={minRows}
      className={`w-full outline-none resize-none ${className}`}
      style={{ overflow: 'hidden', ...style }}
      {...rest}
    />
  );
}

// Small round icon button used for section reorder / delete.
function IconBtn({ children, onClick, disabled, danger, label, dm }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10"
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
      {c.summary?.length > 0 && (
        <dl
          className="rounded-lg px-2.5 py-1.5 mb-2.5"
          style={{ border: `1px solid ${dm ? '#33333f' : '#F3E7EE'}`, background: dm ? '#1b1b22' : '#fff' }}
        >
          {c.summary.map((row, i) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 py-1"
              style={i > 0 ? { borderTop: `1px solid ${dm ? '#2a2a33' : '#FAF3F6'}` } : undefined}
            >
              <dt className="text-[0.62rem] flex-shrink-0" style={{ color: dm ? '#8b8b96' : '#9A8E94' }}>{row.label}</dt>
              <dd className="text-right">
                <span className={row.strong ? 'text-[0.7rem] font-semibold' : 'text-[0.66rem]'} style={{ color: row.strong ? textMain : textBody }}>
                  {row.value}
                </span>
                {row.note && <span className="block text-[0.55rem]" style={{ color: dm ? '#6f6f7a' : '#B3A7AD' }}>{row.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-[0.72rem] leading-[1.7] mb-3" style={{ color: textBody }}>{c.intro}</p>
      {c.sections.map((s, i) => (
        <div key={i} className="mb-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="flex-shrink-0 w-[15px] h-[15px] rounded-full text-[0.5rem] font-semibold flex items-center justify-center"
              style={{ background: dm ? '#3a2a33' : '#F6E7EE', color: dm ? '#e0a8bd' : '#B9788F' }}
            >
              {i + 1}
            </span>
            <p className="text-[0.7rem] font-semibold" style={{ color: textMain }}>{s.heading}</p>
          </div>
          <p className="text-[0.68rem] leading-[1.6] pl-[21px]" style={{ color: textBody }}>{s.body}</p>
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
