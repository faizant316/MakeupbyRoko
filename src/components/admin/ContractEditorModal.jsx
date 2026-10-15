import { useRef, useState, useEffect } from 'react';
import { CONTRACT_PLACEHOLDERS } from '@/lib/contract';
import { Check } from './Glyphs';
import ConfirmDialog from './ConfirmDialog';
import { Button, Sheet, buttonClass, cx } from './ui';

// Full-contract editor. Roko opens this from the Services tab to rewrite the
// entire client agreement: title, intro, every section (heading + body),
// reorder / add / remove sections, and the photo-consent question. Dynamic
// booking values are inserted with {placeholder} chips so the numbers always
// stay correct. A live preview on the right shows exactly what a client sees.
//
// Presentational: all state lives in ContractSettings and is passed in. It sits
// in the shared Sheet, which owns the page lock, the scrim and focus.

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
  //
  // The sheet closes on Escape by itself (through requestClose, so unsaved
  // work still asks first). While one of the inline confirms is open, this
  // listener runs ahead of the sheet's (capture phase) and stops the key there,
  // so Escape steps back out of that confirm instead of the whole editor.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (confirmClose || confirmReset || confirmDelete !== null) {
          e.preventDefault();
          e.stopPropagation();
          if (confirmClose) setConfirmClose(false);
          else if (confirmReset) setConfirmReset(false);
          else setConfirmDelete(null);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const hovered = hoverToken && CONTRACT_PLACEHOLDERS.find(p => p.token === hoverToken);

  // One white group on hairlines; the edge darkens while you type inside it.
  const group = 'border border-line bg-paper transition-colors duration-200 focus-within:border-ink/30';

  return (
    <Sheet
      open
      onClose={requestClose}
      size="xl"
      title="Edit client contract"
      headerExtra={<p className="mt-1 text-[0.84rem] text-ink-muted">The agreement clients sign when booking an appointment</p>}
      bodyClassName="p-0 lg:flex lg:flex-col lg:overflow-hidden"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {confirmReset ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[0.8rem] text-ink-soft">Replace all wording with the original?</span>
              <Button size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <button type="button" onClick={() => { onReset(); setConfirmReset(false); }}
                className={buttonClass('alert', 'sm')}>
                Reset
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} className="-ml-3.5">
              Reset to default wording
            </Button>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {dirty && !saving && !saved && (
              <span className="mr-1 hidden text-[0.74rem] text-ink-muted sm:inline">Unsaved changes</span>
            )}
            <Button onClick={requestClose}>Cancel</Button>
            <Button variant="solid" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…'
                : saved ? <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3" strokeWidth={3.2} />Saved</span>
                : 'Save contract'}
            </Button>
          </div>
        </div>
      )}
    >
      {/* Body: editor (left) + live preview (right). On a laptop each column
          scrolls on its own; on a phone the sheet scrolls and the preview
          steps aside. */}
      <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)]">
        {/* ── Editor column ── */}
        <div className="min-w-0 lg:overflow-y-auto lg:overscroll-contain" data-lenis-prevent>

          {/* Insert bar. Stays pinned so a detail is always one tap away, even
              eight sections down. Solid (not blurred) on purpose. */}
          <div className="sticky top-0 z-20 border-b border-line bg-paper px-5 pb-3 pt-3.5 sm:px-7">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-rose/10 text-[0.58rem] font-bold text-rose">{'{}'}</span>
              <p className="truncate text-[0.8rem] leading-tight text-ink-soft">
                {hovered ? (
                  <>{hovered.label} <span className="text-ink-muted">→ {hovered.sample}</span></>
                ) : activeLabel ? (
                  <>Inserting into <span className="font-semibold text-ink">{activeLabel}</span></>
                ) : (
                  <>Tap a text box below, then tap a detail to drop it in.</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
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
                    className={cx(
                      'press inline-flex h-7 items-center rounded border border-line-strong bg-paper px-2 text-[0.74rem] font-medium text-ink-soft hover:border-ink/40 hover:text-ink',
                      !armed && 'opacity-55',
                    )}
                  >
                    {SHORT_LABEL[p.token] || p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-8 sm:px-7">
            {/* ── Your details ── */}
            <GroupLabel>Your details</GroupLabel>
            <div className={cx(group, 'divide-y divide-line')}>
              <ListRow label="Legal / business name">
                <input
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  placeholder="Roqia Moshref"
                  className={cx(rowInput, 'min-w-0 flex-1')}
                />
              </ListRow>
              <ListRow label="Cancellation notice">
                <input
                  type="number" min="0" max="90"
                  value={cancellationDays}
                  onChange={e => setCancellationDays(e.target.value)}
                  placeholder="14"
                  className={cx(rowInput, 'w-14 tabular-nums')}
                />
                <span className="ml-1.5 text-[0.8rem] text-ink-muted">days</span>
              </ListRow>
              <ListRow label="Travel fee starts at">
                <input
                  value={travelFee}
                  onChange={e => setTravelFee(e.target.value)}
                  placeholder="$200"
                  className={cx(rowInput, 'w-24 tabular-nums')}
                />
              </ListRow>
            </div>
            <p className="mt-2 text-[0.74rem] leading-relaxed text-ink-muted">
              These fill in wherever you insert Your&nbsp;name, Notice&nbsp;days, or Travel&nbsp;fee.
            </p>

            {/* ── Opening ── */}
            <GroupLabel>Opening</GroupLabel>
            <div className={cx(group, 'divide-y divide-line')}>
              <ListRow label="Contract title">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onFocus={e => registerFocus(e.target, setTitle, 'Contract title')}
                  placeholder="Service Agreement"
                  className={cx(rowInput, 'min-w-0 flex-1 font-medium')}
                />
              </ListRow>
              <div className="px-4 py-3">
                <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Introduction</p>
                <AutoTextarea
                  value={intro}
                  onChange={e => setIntro(e.target.value)}
                  onFocus={e => registerFocus(e.target, setIntro, 'Introduction')}
                  minRows={3}
                  className={cx(areaClass, 'text-ink')}
                />
              </div>
            </div>

            {/* ── Sections ── */}
            <GroupLabel right={<span className="text-[0.74rem] tabular-nums text-ink-muted">{sections.length}</span>}>
              Sections
            </GroupLabel>

            <div className="flex flex-col gap-2.5">
              {sections.map((s, i) => (
                <div key={s.id} className={group}>
                  <div className="flex items-center gap-2 pb-1.5 pl-4 pr-1.5 pt-1.5">
                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-line-strong text-[0.66rem] font-semibold tabular-nums text-ink-muted">
                      {i + 1}
                    </span>
                    <input
                      value={s.heading}
                      onChange={e => updateSection(i, { heading: e.target.value })}
                      onFocus={e => registerFocus(e.target, (v) => updateSection(i, { heading: v }), `Section ${i + 1}`)}
                      placeholder="Section heading"
                      className="h-10 min-w-0 flex-1 bg-transparent text-[16px] font-semibold tracking-[-0.01em] text-ink outline-none placeholder:text-ink-muted/70 sm:text-[0.9rem]"
                    />
                    <div className="flex shrink-0 items-center">
                      <IconBtn disabled={i === 0} onClick={() => moveSection(i, -1)} label="Move up">
                        <polyline points="18 15 12 9 6 15" />
                      </IconBtn>
                      <IconBtn disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)} label="Move down">
                        <polyline points="6 9 12 15 18 9" />
                      </IconBtn>
                      <IconBtn danger onClick={() => setConfirmDelete(i)} label="Delete section">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </IconBtn>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <AutoTextarea
                      value={s.body}
                      onChange={e => updateSection(i, { body: e.target.value })}
                      onFocus={e => registerFocus(e.target, (v) => updateSection(i, { body: v }), `Section ${i + 1}`)}
                      placeholder="Section wording…"
                      minRows={3}
                      className={cx(areaClass, 'text-ink-soft')}
                    />
                  </div>
                  {confirmDelete === i && (
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-tone-alert/25 bg-tone-alert/[0.04] px-4 py-2.5">
                      <span className="text-[0.8rem] leading-snug text-ink-soft">Remove this section from the contract?</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button size="sm" onClick={() => setConfirmDelete(null)}>Keep</Button>
                        <button type="button" onClick={() => { removeSection(i); setConfirmDelete(null); }}
                          className={buttonClass('alert', 'sm')}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={addSection} className="mt-2.5 h-11 w-full">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              Add a section
            </Button>

            {/* ── Before signing ── */}
            <GroupLabel>Before signing</GroupLabel>
            <div className={group}>
              <div className="px-4 py-3">
                <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Photo permission question</p>
                <AutoTextarea
                  value={consent}
                  onChange={e => setConsent(e.target.value)}
                  onFocus={e => registerFocus(e.target, setConsent, 'Photo permission')}
                  minRows={2}
                  className={cx(areaClass, 'text-ink')}
                />
              </div>
            </div>
            <p className="mt-2 text-[0.74rem] text-ink-muted">
              The yes / no question clients answer right before they sign.
            </p>
          </div>
        </div>

        {/* ── Live preview column ── */}
        <div className="hidden min-h-0 flex-col border-l border-line bg-canvas lg:flex">
          <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-soft" />
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Live preview</span>
            <span className="ml-auto text-[0.68rem] text-ink-muted">What the client sees</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" data-lenis-prevent>
            {/* Sit the contract on a sheet of paper so it reads as a document */}
            <div className="border border-line bg-paper p-5">
              <ContractPreview c={preview} dm={dm} />
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved-changes guard */}
      {confirmClose && (
        <ConfirmDialog
          tone="danger"
          title="Discard your changes?"
          body="Your edits to the contract haven't been saved yet."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          onConfirm={onClose}
          onCancel={() => setConfirmClose(false)}
        >
          <Button variant="solid" size="lg" className="w-full" onClick={() => { setConfirmClose(false); onSave(); }}>
            Save &amp; close
          </Button>
        </ConfirmDialog>
      )}
    </Sheet>
  );
}

// Small caps over a group, iOS Settings style.
function GroupLabel({ children, right }) {
  return (
    <div className="mb-2 mt-7 flex items-end justify-between">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{children}</span>
      {right}
    </div>
  );
}

// The value side of a grouped row: borderless, right-aligned, 16px on a phone
// so tapping it never zooms the page.
const rowInput = 'h-10 bg-transparent text-right text-[16px] text-ink outline-none placeholder:text-ink-muted/70 sm:text-[0.86rem]';

// A boxed textarea inside a group.
const areaClass = 'block w-full resize-none rounded border border-line bg-paper px-3 py-2.5 text-[16px] leading-relaxed outline-none placeholder:text-ink-muted/70 transition-colors duration-200 focus:border-ink/60 sm:text-[0.86rem]';

// One row of a grouped inset list: label left, value right. The group draws
// the hairlines between rows.
function ListRow({ label, children }) {
  return (
    <div className="flex min-h-[48px] items-center gap-3 px-4 py-1">
      <span className="shrink-0 text-[0.84rem] text-ink-soft">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
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
      className={cx('w-full resize-none outline-none', className)}
      style={{ overflow: 'hidden', ...style }}
      {...rest}
    />
  );
}

// Small icon button used for section reorder / delete. 40px on a phone.
function IconBtn({ children, onClick, disabled, danger, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        'press flex h-10 w-10 items-center justify-center rounded transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-25 sm:h-8 sm:w-8',
        danger ? 'text-tone-alert' : 'text-ink-muted hover:text-ink',
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>{children}</svg>
    </button>
  );
}

// Renders a built contract object the same way the client sees it at sign time.
// Shared by the editor's live preview and the collapsed card on the Services tab.
export function ContractPreview({ c, dm }) {
  if (!c) return null;
  return (
    <div>
      <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-rose">{c.title}</p>
      {c.summary?.length > 0 && (
        <dl className="mb-3 divide-y divide-line border border-line bg-paper px-3 py-1">
          {c.summary.map(row => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="shrink-0 text-[0.68rem] text-ink-muted">{row.label}</dt>
              <dd className="text-right">
                <span className={cx('tabular-nums', row.strong ? 'text-[0.74rem] font-semibold text-ink' : 'text-[0.68rem] text-ink-soft')}>
                  {row.value}
                </span>
                {row.note && <span className="block text-[0.62rem] text-ink-muted">{row.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mb-3 text-[0.74rem] leading-[1.7] text-ink-soft">{c.intro}</p>
      {c.sections.map((s, i) => (
        <div key={i} className="mb-3">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-rose-wash text-[0.5rem] font-semibold tabular-nums text-rose">
              {i + 1}
            </span>
            <p className="text-[0.74rem] font-semibold text-ink">{s.heading}</p>
          </div>
          <p className="pl-[21px] text-[0.68rem] leading-[1.6] text-ink-soft">{s.body}</p>
        </div>
      ))}
      {c.photoConsentQuestion && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-rose">Photo permission</p>
          <p className="text-[0.68rem] leading-[1.6] text-ink-soft">{c.photoConsentQuestion}</p>
        </div>
      )}
    </div>
  );
}
