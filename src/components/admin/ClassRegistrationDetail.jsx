import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { openZoomRoom, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg, regTotal, startWindows } from '@/lib/classCatalog';
import { STUDIO_DISPLAY, STUDIO_MAPS_URL } from '@/lib/studio';
import ConfirmDialog from './ConfirmDialog';
import StatusBadge from './StatusBadge';
import { Check, Cross } from './Glyphs';
import { FORMAT_META, PAYMENT_META, enrollmentKey } from './ClassRegistrationsList';
import { parseRange } from '@/lib/timeWindow';
import { formatPhone, phoneHref } from '@/lib/phone';
import { AdminDatePicker } from './SchedulePicker';
import EmailLogPanel from './EmailLogPanel';
import { Button, Fold, IconButton, Label, Panel, Tag, cx, inputClass } from './ui';

// Strip the legacy "| ✍️ Agreement … · Photos: …" suffix some older rows still
// carry in additional_notes, so the Notes section shows only real client notes.
function stripAgreementNote(raw) {
  return (raw || '').replace(/\s*\|\s*✍️[^]*$/u, '').trim();
}

// "2026-07-15" → "Wednesday, July 15, 2026"
function formatDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
}

function parseNotes(raw) {
  if (!raw) return { link: '', meetingId: '', notes: '' };
  let link = '', meetingId = '';
  const rest = [];
  for (const line of raw.split('\n')) {
    const lm = line.match(/^Link: (https?:\/\/\S+)\s*$/);
    const mm = line.match(/^MeetingId: (\S+)\s*$/);
    if (lm) link = lm[1];
    else if (mm) meetingId = mm[1];
    else rest.push(line);
  }
  // Recover a host-capable id from the join link when none was stored explicitly.
  if (!meetingId) meetingId = meetingIdFromUrl(link);
  return { link, meetingId, notes: rest.join('\n').trim() };
}

// A textarea in the same box as every other field, minus the fixed height.
const areaClass = cx(inputClass.replace('h-11 ', ''), 'py-2.5 leading-relaxed');

const Spinner = () => (
  <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
);

const ZoomIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cx('shrink-0', className)} aria-hidden>
    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
  </svg>
);

// One label and its value on a hairline row.
function Field({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
      <dt className="shrink-0 text-[0.8rem] text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[0.86rem] font-medium text-ink">{children}</dd>
    </div>
  );
}

// Grid of the class's valid start-to-end windows as one-tap buttons. All
// options are visible at once (no dropdown, no scroll trap), and each is a
// real range so Roko picks "time A" or "time B" directly.
function WindowGrid({ windows, value, onChange }) {
  if (!windows.length) {
    return (
      <p className="text-[0.8rem] leading-relaxed text-ink-muted">
        No preset windows for this class yet. Set the timing with the client directly.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {windows.map(w => {
        const sel = value === w;
        return (
          <button
            key={w}
            type="button"
            onClick={() => onChange(w)}
            aria-pressed={sel}
            className={cx(
              'press h-11 rounded border px-2 text-center text-[0.8rem] font-semibold tabular-nums',
              sel ? 'border-rose bg-rose text-paper' : 'border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {w}
          </button>
        );
      })}
    </div>
  );
}

// One Wednesday per client, so the DATE is always locked to what the client
// chose at checkout. The only thing Roko sets is:
//   • online: the time window (date + Zoom link get sent)
//   • in person: nothing; there's no time to pick, they come to the studio.
//     She just confirms so the studio-details email goes out.
function LessonScheduler({ reg, onUpdateReg, dm, className, phone, confirmFn }) {
  const isInPerson = reg.class_format === 'in_person';
  const classKey = classesOfReg(reg)[0]?.key;
  const windows = startWindows(classKey, reg.class_format);
  const parsed = parseNotes(reg.lesson_notes);

  // The client's Wednesday + chosen time window, both pre-filled from what they
  // picked at checkout and both editable here, so Roko can move a client if she
  // needs to. It's their selection shown back, not something she builds from scratch.
  const clientDate = reg.appointment_date || reg.preferred_date || '';

  // "Done" = already confirmed onto the calendar (a set date + time, or an
  // in-person row that's been enrolled).
  const scheduled = !!reg.appointment_time || (isInPerson && reg.status === 'enrolled' && !!reg.appointment_date);

  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [meetLink, setMeetLink] = useState(parsed.link);
  const [meetingId, setMeetingId] = useState(parsed.meetingId);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [date, setDate] = useState(clientDate);
  const [time, setTime] = useState(reg.appointment_time || reg.preferred_time || windows[0] || '');
  const [notes, setNotes] = useState(parsed.notes);

  const showForm = expanded || !scheduled;

  const generateZoomLink = async () => {
    setGeneratingLink(true);
    setLinkCopied(false);
    try {
      const res = await fetch('/api/create-zoom-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Makeup by Roko · Lesson with ${reg.full_name || 'Client'}`,
          duration: 60,
          date: date || undefined,
          time: time || undefined,
        }),
      });
      const data = await res.json();
      if (data.join_url) {
        setMeetLink(data.join_url);
        setMeetingId(data.meeting_id ? String(data.meeting_id) : '');
      } else alert(`Zoom error: ${data.error || 'Unknown error'}`);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyMeetLink = () => {
    if (!meetLink) return;
    navigator.clipboard.writeText(meetLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const doSend = async (finalTime, finalType) => {
    setSaving(true);
    try {
      const res = await fetch('/api/send-class-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: reg.id,
          clientEmail: reg.email,
          clientName: reg.full_name,
          clientPhone: phone || reg.phone || '',
          className,
          lessonDate: date,
          lessonTime: finalTime,
          meetingType: finalType,
          zoomLink: finalType === 'Zoom' ? meetLink : '',
          notes,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const storedNotes = [
        finalType === 'Zoom' && meetLink ? `Link: ${meetLink}` : null,
        finalType === 'Zoom' && meetingId ? `MeetingId: ${meetingId}` : null,
        notes || null,
      ].filter(Boolean).join('\n');
      onUpdateReg({
        appointment_date: date,
        appointment_time: finalTime,
        consultation_type: finalType,
        lesson_notes: storedNotes,
        status: 'enrolled',
      });
      setExpanded(false);
    } catch {
      alert('Failed to send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    if (!date) { alert('Set a date first.'); return; }
    if (windows.length && !time) { alert('Pick a time window first.'); return; }
    const finalTime = time || windows[0] || '';
    if (isInPerson) {
      confirmFn({
        title: 'Confirm in-studio class?',
        body: `This will confirm ${reg.full_name || 'the client'} for their Wednesday and email the studio address and directions.`,
        icon: 'check', confirmLabel: 'Yes, confirm',
        onConfirm: () => doSend(finalTime, 'In-Person'),
      });
    } else {
      confirmFn({
        title: 'Confirm & notify client?',
        body: `This will enroll ${reg.full_name || 'the client'} and send their lesson time and Zoom link.`,
        icon: 'check', confirmLabel: 'Yes, send',
        onConfirm: () => doSend(finalTime, 'Zoom'),
      });
    }
  };

  const summaryDate = clientDate
    ? new Date(clientDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;
  const hostId = meetingId || parsed.meetingId;

  return (
    <Panel
      title="Makeup lesson"
      sub={showForm ? (isInPerson ? 'Confirm in-studio class' : 'Confirm lesson time') : null}
      action={showForm && scheduled ? (
        <IconButton label="Close lesson editor" onClick={() => setExpanded(false)} className="-my-2 -mr-3 text-ink-muted hover:text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </IconButton>
      ) : null}
    >
      {/* Confirmed: the lesson as one row, with edit tucked beside it. */}
      {scheduled && !expanded && (
        <div className="flex items-center gap-3 px-4 py-4 sm:gap-3.5 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-rose/10 text-rose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4" aria-hidden>
              <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.86rem] font-semibold text-ink">
              {isInPerson ? 'In Person · Studio' : (reg.consultation_type === 'Phone' ? 'Phone / FaceTime' : 'Online · Zoom')}
              {reg.appointment_time ? <span className="tabular-nums">{` · ${reg.appointment_time}`}</span> : ''}
            </p>
            <p className="mt-0.5 text-[0.76rem] text-ink-muted">{summaryDate}</p>
            {isInPerson ? (
              <a href={STUDIO_MAPS_URL} target="_blank" rel="noopener noreferrer"
                className="mt-1 block truncate text-[0.74rem] text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink">{STUDIO_DISPLAY}</a>
            ) : (!meetingId && !parsed.meetingId && parsed.link) ? (
              <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                className="mt-1 block truncate text-[0.74rem] text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink">{parsed.link}</a>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Join is the one thing she needs on lesson day, so it's the one
                filled button here. Edit stays a quiet square beside it. */}
            {!isInPerson && hostId && (
              <Button variant="rose" onClick={() => openZoomRoom(meetLink || parsed.link, hostId)} className="h-11 sm:h-10">
                <ZoomIcon />
                Join
              </Button>
            )}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              title="Edit lesson time or Zoom link"
              aria-label="Edit lesson details"
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line-strong sm:h-10 sm:w-10 bg-paper text-ink-soft hover:border-ink/50 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="flex flex-col gap-6 px-4 py-5 sm:px-5">
          {/* The client's Wednesday, pre-filled from checkout. */}
          <div>
            <Label className="mb-2 block">Date</Label>
            <AdminDatePicker value={date} onChange={setDate} dm={dm} accent="rgb(var(--c-rose))" />
            <p className="mt-2 text-[0.74rem] leading-relaxed text-ink-muted">
              The client picked this Wednesday at checkout. Change it only if you need to move them (one client per Wednesday), then Message client to let them know.
            </p>
          </div>

          {/* Time window: the client's own selection, pre-filled. Tap another to change it. */}
          <div>
            <Label className="mb-2.5 block">Time window</Label>
            <WindowGrid windows={windows} value={time} onChange={setTime} />
            {windows.length > 0 && (
              <p className="mt-2 text-[0.74rem] leading-relaxed text-ink-muted">
                This is the window the client chose. Tap another only if you need to change it.
              </p>
            )}
          </div>

          {isInPerson ? (
            <>
              {/* In studio: nothing to schedule */}
              <div className="flex items-start gap-3 border border-line bg-canvas/60 px-4 py-3.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <div className="min-w-0">
                  <p className="text-[0.84rem] font-semibold text-ink">In studio · Mountain House</p>
                  <p className="mt-0.5 text-[0.76rem] leading-relaxed text-ink-muted">
                    {reg.full_name?.split(' ')[0] || 'The client'} comes to the studio for the window above. Confirming sends the address and directions. {STUDIO_DISPLAY}.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor={`lesson-notes-${reg.id}`} className="mb-2 block">
                  <Label>Notes</Label> <span className="text-[0.74rem] text-ink-muted">(optional)</span>
                </label>
                <textarea id={`lesson-notes-${reg.id}`} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Any extra info for the client…"
                  className={cx(areaClass, 'min-h-[72px] resize-none')} />
              </div>

              <Button variant="solid" size="lg" onClick={handleConfirm} disabled={saving} className="w-full">
                {saving ? <><Spinner /> Sending…</> : 'Confirm & send studio details'}
              </Button>
            </>
          ) : (
            <>
              {/* Zoom link */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label>Zoom link</Label>
                  {meetLink && (
                    <Button size="sm" variant="ghost" onClick={generateZoomLink} disabled={generatingLink} className="-my-1 -mr-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      New link
                    </Button>
                  )}
                </div>
                {!meetLink ? (
                  <Button size="lg" onClick={generateZoomLink} disabled={generatingLink} className="w-full">
                    {generatingLink ? <><Spinner /> Generating…</> : <><ZoomIcon /> Generate Zoom link</>}
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={copyMeetLink}
                    className={cx(
                      'press flex h-12 w-full items-center justify-between gap-3 rounded border bg-paper pl-3.5 pr-1.5 text-left',
                      linkCopied ? 'border-ink/50' : 'border-line-strong hover:border-ink/40',
                    )}
                  >
                    <span className="min-w-0 truncate text-[0.8rem] text-ink-soft">{meetLink}</span>
                    <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[3px] bg-ink px-3 text-[0.76rem] font-semibold text-paper">
                      {linkCopied ? <><Check className="h-3 w-3" strokeWidth={3} /> Copied</> : 'Copy'}
                    </span>
                  </button>
                )}
              </div>

              <div>
                <label htmlFor={`lesson-notes-${reg.id}`} className="mb-2 block">
                  <Label>Notes</Label> <span className="text-[0.74rem] text-ink-muted">(optional)</span>
                </label>
                <textarea id={`lesson-notes-${reg.id}`} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Any extra info for the client…"
                  className={cx(areaClass, 'min-h-[72px] resize-none')} />
              </div>

              <Button variant="solid" size="lg" onClick={handleConfirm} disabled={saving || (windows.length > 0 && !time)} className="w-full">
                {saving ? <><Spinner /> Sending…</> : 'Confirm & notify client'}
              </Button>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

// In-card email composer for the class client (sent as roko@makeupbyroko.org via
// /api/contact-client). No booking/contract attachment: classes are paid in
// full up front, so this is purely for reaching out about the day or a change.
function ClassContactComposer({ reg, onClose, onSent }) {
  const first = reg.full_name?.split(' ')[0] || 'there';
  const classLabel = classesOfReg(reg).map(c => c.title).join(' · ') || 'Makeup Lesson';
  const when = reg.appointment_date || reg.preferred_date
    ? formatDate(reg.appointment_date || reg.preferred_date)
    : '';
  const [subject, setSubject] = useState(`Your ${classLabel} with Makeup by Roko`);
  const [body, setBody] = useState(`Hi ${first},\n\n`);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reg.email) { alert('This client has no email on file.'); return; }
    if (!subject.trim() || !body.trim()) { alert('Add a subject and a message first.'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/contact-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reg.email,
          firstName: first,
          subject: subject.trim(),
          message: body.trim(),
          serviceName: classLabel,
          dateFormatted: when,
          time: reg.appointment_time || reg.preferred_time || '',
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to send'); }
      onSent();
      onClose();
    } catch (err) {
      alert(err?.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel
      className="rise-in"
      title="Message client"
      sub={<>To <span className="font-medium text-ink">{reg.email}</span> · sends from roko@makeupbyroko.org</>}
      action={(
        <IconButton label="Close composer" onClick={onClose} className="-my-2 -mr-3 text-ink-muted hover:text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </IconButton>
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div>
          <label htmlFor={`class-subject-${reg.id}`} className="mb-1.5 block"><Label>Subject</Label></label>
          <input id={`class-subject-${reg.id}`} value={subject} onChange={e => setSubject(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`class-message-${reg.id}`} className="mb-1.5 block"><Label>Message</Label></label>
          <textarea id={`class-message-${reg.id}`} value={body} onChange={e => setBody(e.target.value)} rows={7}
            placeholder="Write your message…"
            className={cx(areaClass, 'min-h-[150px] resize-y')} />
          <p className="mt-1.5 text-[0.74rem] text-ink-muted">Sent on your branded template. Line breaks are kept.</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={onClose} className="h-11">Cancel</Button>
          <Button variant="solid" onClick={send} disabled={sending} className="h-11 flex-1">
            {sending ? <><Spinner /> Sending…</> : 'Send email'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function normalizePaymentStatus(raw) {
  if (!raw || raw === 'pending' || raw === 'unpaid') return 'unpaid';
  if (['paid', 'deposit_paid', 'paid_in_full'].includes(raw)) return 'paid';
  if (raw === 'refunded') return 'refunded';
  return 'unpaid';
}

// The registration card's confirmations run through the shared dialog, so a
// "cancel this class?" here looks like a "cancel this appointment?" on the
// booking card. `icon: 'cross'` marks the destructive ones.
function ConfirmModal({ modal, onCancel, onConfirm }) {
  if (!modal) return null;
  return (
    <ConfirmDialog
      tone={modal.icon === 'cross' ? 'danger' : 'default'}
      title={modal.title}
      body={modal.body}
      confirmLabel={modal.confirmLabel || 'Yes, update'}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

// A round glyph that leads a payment state.
function StateIcon({ tone, children }) {
  return (
    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

const undoPath = <><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></>;

// One of the two ways to refund, as a full-width choice: who it's for on the
// left, what goes back on the right.
function RefundChoice({ title, sub, amount, busy, disabled, onClick, icon, iconTone }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="press flex w-full items-center justify-between gap-3 rounded border border-line bg-paper px-3.5 py-3 text-left hover:border-line-strong disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="flex min-w-0 items-center gap-3">
        <StateIcon tone={iconTone}>{icon}</StateIcon>
        <span className="min-w-0">
          <span className="block text-[0.84rem] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-[0.74rem] text-ink-muted">{sub}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[0.98rem] font-semibold tabular-nums text-ink">{busy ? '…' : amount}</span>
        <span className="mt-0.5 block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink-muted">they get back</span>
      </span>
    </button>
  );
}

export default function ClassRegistrationDetail({ reg: initialReg, onBack, darkMode: dm }) {
  const queryClient = useQueryClient();
  const [reg, setReg] = useState(initialReg);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refunding, setRefunding] = useState(null); // 'full' | 'minus_fee' | null

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.ClassRegistration.update(reg.id, data),
    onSuccess: (_, data) => {
      setReg(prev => ({ ...prev, ...data }));
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.entities.ClassRegistration.delete(reg.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
      onBack();
    },
  });

  const selectedClasses = classesOfReg(reg);
  const classLabel = selectedClasses.map(c => c.title).join(' · ');
  // Prefer what Stripe actually charged; fall back to the per-format catalog
  // price for manually-added rows that never went through checkout.
  const totalPrice = regTotal(reg);
  const amountPaid = Number(reg.amount_paid) || totalPrice || 0;
  const refundMinusFee = Math.max(0, amountPaid - (amountPaid * 0.029 + 0.30));
  const fmt = FORMAT_META[reg.class_format];
  // Sign-ups reach this page because they paid through Stripe at checkout, so
  // "paid" is the baseline truth: the only meaningful payment action left is a
  // refund. Exception: a client added manually (no Stripe session) never went
  // through checkout, so treat that as genuinely unpaid and let Roko mark it paid.
  const payState = normalizePaymentStatus(reg.payment_status);
  const isRefunded = payState === 'refunded';
  const isUnpaid = payState === 'unpaid' && !reg.stripe_session_id;
  const enrollmentStatus = reg.status || 'pending';
  const paymentMeta = isRefunded ? PAYMENT_META.refunded : isUnpaid ? PAYMENT_META.unpaid : PAYMENT_META.paid;

  const appointmentDate = reg.appointment_date
    ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const confirm = ({ title, body, icon, confirmLabel, onConfirm }) =>
    setConfirmModal({ title, body, icon, confirmLabel, onConfirm });

  const changePayment = (newStatus) => {
    const meta = PAYMENT_META[newStatus];
    confirm({
      title: `Mark as ${meta.label.toLowerCase()}?`,
      body: 'This will update their payment status.',
      icon: 'check',
      confirmLabel: 'Yes, update',
      onConfirm: () => {
        updateMutation.mutate({ payment_status: newStatus });
      },
    });
  };

  // Real Stripe refund (only for rows that actually went through checkout).
  const doStripeRefund = (mode) => {
    const isFull = mode === 'full';
    confirm({
      title: isFull ? 'Full refund?' : 'Refund minus card fee?',
      body: isFull
        ? 'Sends the entire amount back to the client, card fee included. Use this when you had to cancel.'
        : 'Sends back the class fee minus the card processing fee. Use this when the client cancelled with 14 or more days notice.',
      icon: 'undo', confirmLabel: 'Yes, refund',
      onConfirm: async () => {
        setRefunding(mode);
        try {
          const res = await fetch('/api/refund-class', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registrationId: reg.id, mode }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Refund failed');
          setReg(prev => ({ ...prev, payment_status: 'refunded' }));
          queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
          queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
          setRefundOpen(false);
        } catch (e) {
          alert((e.message || 'Refund failed') + '\n\nYou can still refund directly in Stripe.');
        } finally {
          setRefunding(null);
        }
      },
    });
  };

  const handleDelete = () => confirm({
    title: 'Delete this registration?',
    body: 'This cannot be undone.',
    icon: 'cross',
    confirmLabel: 'Yes, delete',
    onConfirm: () => deleteMutation.mutate(),
  });

  const heroWin = parseRange(reg.appointment_time || '');
  const heroDate = reg.appointment_date
    ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : (reg.preferred_date
        ? new Date(reg.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : 'No date set');
  const signedUpOn = reg.created_date
    ? new Date(reg.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const notesText = stripAgreementNote(reg.additional_notes);

  return (
    <>
      {/* Header: who, what, and where it stands. Back lives in the phone bar
          below a laptop, so it only shows here on a laptop. */}
      <header className="mb-6 border-b border-line pb-6">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to list" className="-ml-2 mb-4 hidden lg:inline-flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Button>

        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {fmt ? `${fmt.label} class` : 'Makeup class'}
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 data-bar-title className="min-w-0 break-words text-[clamp(1.6rem,4vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
            {reg.full_name || 'Unknown'}
          </h1>
          <span className="mt-1.5 shrink-0 sm:mt-2.5"><StatusBadge status={enrollmentKey(enrollmentStatus)} /></span>
        </div>
        <p className="mt-1.5 text-[0.92rem] text-ink-soft">{classLabel || 'No class selected'}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {fmt && <Tag>{fmt.label}{fmt.label === 'In Person' ? ' · Mountain House' : ' · Zoom'}</Tag>}
          {/* Agreement + photo consent, near the name (not in Notes). */}
          {reg.contract_signed && (
            <>
              <Tag>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-2 w-2" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                Agreement signed
              </Tag>
              <Tag className={reg.contract_photo_consent ? 'bg-rose/10 text-rose' : undefined}>
                Photos: {reg.contract_photo_consent ? 'Yes' : 'No'}
              </Tag>
            </>
          )}
        </div>

        <p className="mt-3 text-[0.74rem] tabular-nums text-ink-muted">
          ID: {String(reg.id || '').slice(0, 8).toUpperCase()}{signedUpOn ? ` · Signed up ${signedUpOn}` : ''}
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:gap-5">
        {/* Start and date, the two things she reads first. */}
        <div className="grid grid-cols-2 divide-x divide-line border border-line bg-paper">
          <div className="min-w-0 px-4 py-4 sm:px-5">
            <Label>Start</Label>
            <p className="mt-1.5 text-[1.05rem] font-semibold tabular-nums tracking-[-0.01em] text-ink sm:text-[1.2rem]">
              {heroWin.start || (reg.class_format === 'in_person' ? 'In studio' : 'Not set')}
            </p>
            {heroWin.end && <p className="mt-0.5 text-[0.76rem] tabular-nums text-ink-muted">until {heroWin.end}</p>}
          </div>
          <div className="min-w-0 px-4 py-4 sm:px-5">
            <Label>Date</Label>
            <p className="mt-1.5 text-[1.05rem] font-semibold tracking-[-0.01em] text-ink sm:text-[1.2rem]">{heroDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <Panel title="Date & time">
            {appointmentDate ? (
              <dl className="divide-y divide-line">
                <Field label="Date">{appointmentDate}</Field>
                {reg.appointment_time && <Field label="Time"><span className="tabular-nums">{reg.appointment_time}</span></Field>}
                {reg.consultation_type && (
                  <Field label="Where">
                    {reg.consultation_type === 'Phone' ? 'Phone / FaceTime' : reg.consultation_type === 'In-Person' ? `In Person · ${STUDIO_DISPLAY}` : reg.consultation_type}
                  </Field>
                )}
              </dl>
            ) : reg.preferred_date ? (
              <>
                <dl className="divide-y divide-line">
                  <Field label="Date">{formatDate(reg.preferred_date)}</Field>
                  {reg.preferred_time && <Field label="Time"><span className="tabular-nums">{reg.preferred_time}</span></Field>}
                </dl>
                <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-[0.8rem] font-medium text-rose sm:px-5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                  {reg.class_format === 'in_person' ? "Client's Wednesday · confirm to send studio details" : 'Client picked this Wednesday · needs a time'}
                </p>
              </>
            ) : (
              <p className="px-4 py-3.5 text-[0.86rem] text-ink-muted sm:px-5">Not scheduled yet</p>
            )}
          </Panel>

          <Panel title="Contact">
            <dl className="divide-y divide-line">
              {reg.email && (
                <Field label="Email">
                  <a href={`mailto:${reg.email}`} className="break-all text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">{reg.email}</a>
                </Field>
              )}
              {reg.phone && (
                <Field label="Phone">
                  <a href={`tel:${phoneHref(reg.phone)}`} className="tabular-nums text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">{formatPhone(reg.phone)}</a>
                </Field>
              )}
            </dl>
            {((reg.email && !showCompose) || contactSent) && (
              <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
                {reg.email && !showCompose && (
                  <Button size="sm" onClick={() => { setShowCompose(true); setContactSent(false); }} className="h-11 sm:h-9">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
                    </svg>
                    Message client
                  </Button>
                )}
                {contactSent && (
                  <p className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-tone-confirmed">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    Email sent to client
                  </p>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* Contact composer */}
        {showCompose && (
          <ClassContactComposer reg={reg} onClose={() => setShowCompose(false)} onSent={() => setContactSent(true)} />
        )}

        {/* Total */}
        {totalPrice > 0 && (
          <div className="flex items-center justify-between gap-3 border border-line bg-paper px-4 py-3.5 sm:px-5">
            <Label>{isUnpaid ? 'Total due' : 'Total paid'}</Label>
            <div className="flex items-center gap-3">
              <span className={cx('inline-flex h-[22px] items-center px-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em]', paymentMeta.cls)}>
                {paymentMeta.label}
              </span>
              <span className="text-[1.15rem] font-semibold tabular-nums tracking-[-0.01em] text-ink">
                ${totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Notes: real client notes only (agreement lives in the tags above). */}
        {notesText && (
          <Panel title="Notes">
            <p className="px-4 py-4 text-[0.86rem] leading-relaxed text-ink-soft sm:px-5">{notesText}</p>
          </Panel>
        )}

        {/* Lesson Scheduler */}
        <LessonScheduler
          reg={reg}
          className={classLabel || 'Makeup Lesson'}
          phone={reg.phone}
          dm={dm}
          confirmFn={confirm}
          onUpdateReg={(data) => {
            setReg(prev => ({ ...prev, ...data }));
            queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
          }}
        />

        {/* Payment: paid at checkout, so refund is the only real action.
            Manually-added clients (no Stripe session) start out genuinely unpaid. */}
        <Panel title="Payment">
          {/* The client cancelled this class themselves from their email link. */}
          {reg.cancelled_by === 'client' && (
            <div className="border-b border-tone-alert/20 bg-tone-alert/[0.04] px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-2 text-[0.84rem] font-semibold text-tone-alert">
                <Cross className="h-3 w-3" strokeWidth={3} />
                Cancelled by client{reg.cancelled_at ? ` · ${new Date(reg.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </p>
              {reg.cancel_reason
                ? <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-soft">&ldquo;{reg.cancel_reason}&rdquo;</p>
                : <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted">No reason given.</p>}
              <p className="mt-1 text-[0.76rem] leading-snug text-ink-muted">The Wednesday is freed. Refund below only if you choose.</p>
            </div>
          )}

          {isUnpaid ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <StateIcon tone="bg-rose/10 text-rose"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></StateIcon>
                <div className="min-w-0">
                  <p className="text-[0.86rem] font-semibold text-rose">Not paid yet</p>
                  <p className="mt-0.5 text-[0.76rem] text-ink-muted">
                    Added manually{totalPrice > 0 ? ` · $${totalPrice.toLocaleString()} due` : ''}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="solid" onClick={() => changePayment('paid')} className="h-11 sm:h-9">Mark as paid</Button>
            </div>
          ) : !isRefunded ? (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <StateIcon tone="bg-tone-confirmed/10 text-tone-confirmed"><path d="M20 6 9 17l-5-5" /></StateIcon>
                  <div className="min-w-0">
                    <p className="text-[0.86rem] font-semibold text-ink">Paid in full</p>
                    <p className="mt-0.5 text-[0.76rem] text-ink-muted">
                      Settled at checkout{totalPrice > 0 ? ` · $${totalPrice.toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
                {reg.stripe_session_id ? (
                  <Button size="sm" variant="danger" onClick={() => setRefundOpen(o => !o)} aria-expanded={refundOpen} className="h-11 sm:h-9">
                    {refundOpen ? 'Close' : 'Refund'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={cx('h-3.5 w-3.5 transition-transform duration-500 ease-quint', refundOpen && 'rotate-180')} aria-hidden>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => changePayment('refunded')} className="h-11 sm:h-9">Mark as refunded</Button>
                )}
              </div>

              {reg.stripe_session_id && (
                <Fold open={refundOpen}>
                  <div className="flex flex-col gap-2.5 border-t border-line px-4 pb-4 pt-3.5 sm:px-5">
                    <p className="text-[0.78rem] leading-relaxed text-ink-muted">
                      Pick based on <span className="font-semibold text-ink">who cancelled</span>. The money goes right back to their card. Stripe keeps its card fee either way, so this only decides who covers it.
                    </p>

                    {/* Client cancelled: they absorb the card fee, Roko stays whole */}
                    <RefundChoice
                      title="The client cancelled"
                      sub="14+ days notice · they cover the card fee"
                      amount={`$${refundMinusFee.toFixed(2)}`}
                      busy={refunding === 'minus_fee'}
                      disabled={!!refunding}
                      onClick={() => doStripeRefund('minus_fee')}
                      iconTone="bg-canvas text-ink-muted"
                      icon={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
                    />

                    {/* Roko cancelled: she eats the card fee, client made 100% whole */}
                    <RefundChoice
                      title="You had to cancel"
                      sub="full refund · you cover the card fee"
                      amount={`$${amountPaid.toFixed(2)}`}
                      busy={refunding === 'full'}
                      disabled={!!refunding}
                      onClick={() => doStripeRefund('full')}
                      iconTone="bg-tone-alert/10 text-tone-alert"
                      icon={undoPath}
                    />
                  </div>
                </Fold>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <StateIcon tone="bg-tone-alert/10 text-tone-alert">{undoPath}</StateIcon>
                <div className="min-w-0">
                  <p className="text-[0.86rem] font-semibold text-tone-alert">Refunded</p>
                  <p className="mt-0.5 text-[0.76rem] text-ink-muted">This payment was returned</p>
                </div>
              </div>
              <Button size="sm" onClick={() => changePayment('paid')} className="h-11 sm:h-9">Undo refund</Button>
            </div>
          )}
        </Panel>

        {/* Emails: a class client who never got her Zoom link has no way of
            knowing, and neither did anyone else before this. */}
        <div>
          <EmailLogPanel registration={reg} dm={dm} />
        </div>

        {/* Stripe reference */}
        {reg.stripe_session_id && (
          <p className="break-all text-[0.68rem] tabular-nums text-ink-muted/70">
            Stripe: {reg.stripe_session_id.slice(0, 36)}…
          </p>
        )}

        {/* Delete */}
        <div className="border-t border-line pt-5">
          <Button size="sm" variant="danger" onClick={handleDelete} className="h-11 sm:h-9">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete registration
          </Button>
        </div>
      </div>

      <ConfirmModal
        modal={confirmModal}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
      />
    </>
  );
}
