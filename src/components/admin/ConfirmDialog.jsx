import { Check, Cross, Undo } from './Glyphs';

// The one "are you sure?" in the admin.
//
// There used to be two, and they didn't look like the same product: one drew
// its icon with a typed glyph sized against a 48px circle so the tick came out
// tiny, and both painted their confirm button in the STATUS colour — which
// meant confirming an appointment put a blue pill on screen, a blue that
// belongs to the confirmed badge and appears nowhere else as a button.
//
// So: the icon says what kind of change this is (a tick, a cross, an undo) in
// the tone colour, and the button is the same ink-black primary every other
// action in the admin uses, or red when the thing is destructive. Colour is
// carrying meaning in one place instead of two.

const TONES = {
  default: { ink: '#C4849A', tint: 'rgba(196,132,154,0.14)', ring: 'rgba(196,132,154,0.34)', btn: '#111' },
  danger:  { ink: '#E05549', tint: 'rgba(224,85,73,0.12)',   ring: 'rgba(224,85,73,0.30)',  btn: '#E05549' },
};

export default function ConfirmDialog({
  title,
  body,
  icon = 'check',           // 'check' | 'cross' | 'undo'
  tone = 'default',         // 'default' | 'danger'
  confirmLabel = 'Yes, update',
  cancelLabel = 'Never mind',
  busy = false,
  onConfirm,
  onCancel,
  dm,
  children = null,          // anything the decision needs (a reason box, say)
}) {
  const t = TONES[tone] || TONES.default;
  const Glyph = icon === 'cross' ? Cross : icon === 'undo' ? Undo : Check;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      style={{ background: dm ? 'rgba(0,0,0,0.62)' : 'rgba(28,18,23,0.38)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-[24px] p-7 sm:p-8 max-w-[380px] w-full text-center"
        style={{
          background: dm ? '#26262b' : '#fff',
          border: `1px solid ${dm ? '#3a3a42' : '#EFEAEC'}`,
          boxShadow: dm ? '0 26px 64px rgba(0,0,0,0.55)' : '0 26px 64px rgba(60,30,45,0.16)',
          animation: 'fadeSlideDown 0.22s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <span className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: t.tint, border: `1px solid ${t.ring}` }}>
          <Glyph className="w-[18px] h-[18px]" strokeWidth={icon === 'undo' ? 2.2 : 2.8} style={{ color: t.ink }} />
        </span>

        <p className="text-[1.18rem] font-serif mb-2" style={{ color: dm ? '#ececf0' : '#1b1519' }}>{title}</p>
        {body && (
          <p className="text-[0.82rem] leading-relaxed mx-auto max-w-[300px]" style={{ color: dm ? '#8f8f99' : '#9a8d92' }}>{body}</p>
        )}

        {children && <div className="mt-5 text-left">{children}</div>}

        {/* Equal halves, full width. Two centred pills of different widths read
            as "one of these is the real button"; the decision is the words. */}
        <div className="flex gap-2.5 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 text-[0.8rem] font-medium rounded-[12px] transition-all active:scale-[0.98]"
            style={{ color: dm ? '#a1a1aa' : '#8a8188', border: `1px solid ${dm ? '#3f3f46' : '#EAE2E5'}`, background: dm ? 'transparent' : '#fff' }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className="flex-1 py-3 text-[0.8rem] font-semibold text-white rounded-[12px] transition-all active:scale-[0.98]"
            style={{ background: t.btn, opacity: busy ? 0.6 : 1, boxShadow: `0 6px 18px ${tone === 'danger' ? 'rgba(224,85,73,0.28)' : 'rgba(17,17,17,0.18)'}` }}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
