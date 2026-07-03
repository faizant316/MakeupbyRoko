import { useState } from 'react';

// Reusable "Review & Sign" step. Flow-agnostic: pass in a built contract
// object (from buildContract) and get back the signature via onSign.
// Used by the booking, bridal, and class flows so signing works the same
// everywhere.
//
// Props:
//   contract    - object from buildContract()
//   clientName  - prefill for the signature field (they can edit)
//   submitting  - disables the button while the booking is saving
//   ctaLabel    - button text (default "Sign & Confirm Booking")
//   onSign      - ({ name, photoConsent, signedAt, version }) => void
export default function ContractSign({ contract, clientName = '', submitting = false, ctaLabel = 'Sign & Confirm Booking', onSign }) {
  const [name, setName] = useState(clientName || '');
  const [photoConsent, setPhotoConsent] = useState(null); // null | true | false
  const [agreed, setAgreed] = useState(false);

  const nameOk = name.trim().length >= 2;
  const consentChosen = photoConsent === true || photoConsent === false;
  const canSign = nameOk && consentChosen && agreed && !submitting;

  const now = new Date();
  const signedAtLabel = now.toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const submit = () => {
    if (!canSign) return;
    onSign({
      name: name.trim(),
      photoConsent,
      signedAt: now.toISOString(),
      version: contract.version,
    });
  };

  return (
    <div className="w-full max-w-[600px] mx-auto px-6 lg:px-7 py-6 flex flex-col flex-1">
      <div className="mb-4">
        <h3 className="font-serif text-[1.4rem] text-[#111] mb-1">Review &amp; <em className="text-[#D4A0B0] not-italic">Sign</em></h3>
        <p className="text-[0.8rem] text-gray-400">Please read your service agreement and sign to confirm.</p>
      </div>

      {/* Scrollable contract body.
          data-lenis-prevent lets this inner box scroll natively with the wheel:
          the modal's own Lenis instance would otherwise capture the wheel and
          scroll the whole sheet instead of this box. */}
      <div
        data-lenis-prevent
        className="rounded-2xl border border-[#F0E0E9] bg-[#FDFBFC] px-5 py-4 mb-5 max-h-[42vh] overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <p className="text-[0.62rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A] mb-2">{contract.title}</p>
        <p className="text-[0.78rem] text-[#444] leading-[1.7] mb-4">{contract.intro}</p>
        {contract.sections.map((s, i) => (
          <div key={i} className="mb-3.5">
            <p className="text-[0.75rem] font-semibold text-[#111] mb-1">{i + 1}. {s.heading}</p>
            <p className="text-[0.75rem] text-[#666] leading-[1.65]">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Photo consent — explicit yes/no */}
      <div className="mb-5">
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Photo Permission *</label>
        <p className="text-[0.75rem] text-[#666] leading-[1.6] mb-2">{contract.photoConsentQuestion}</p>
        <div className="flex gap-3">
          {[{ label: 'Yes, you can post my photos', value: true }, { label: 'No, please keep them private', value: false }].map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => setPhotoConsent(opt.value)}
              className={`flex-1 py-2.5 px-2 rounded-xl text-[0.74rem] font-medium border transition-all ${
                photoConsent === opt.value
                  ? 'bg-[#111] text-white border-[#111]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Typed signature */}
      <div className="mb-4">
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Type Your Full Name to Sign *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.95rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '0.02em' }}
        />
        <p className="text-[0.66rem] text-gray-400 mt-1.5">Signed electronically on {signedAtLabel}</p>
      </div>

      {/* Agree checkbox */}
      <button
        type="button"
        onClick={() => setAgreed(a => !a)}
        className="flex items-start gap-3 text-left mb-5"
      >
        <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
          agreed ? 'bg-[#111] border-[#111]' : 'bg-white border-gray-300'
        }`}>
          {agreed && (
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg>
          )}
        </span>
        <span className="text-[0.78rem] text-[#444] leading-[1.55]">
          I have read and agree to this Service Agreement, and my typed name is my electronic signature.
        </span>
      </button>

      <button
        type="button"
        onClick={submit}
        disabled={!canSign}
        className={`w-full py-3.5 rounded-xl text-[0.85rem] font-medium tracking-[0.04em] transition-all ${
          canSign
            ? 'bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)]'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {submitting ? 'Submitting…' : ctaLabel}
      </button>
      {!canSign && !submitting && (
        <p className="text-[0.66rem] text-gray-400 text-center mt-2">
          {!consentChosen ? 'Choose a photo permission option'
            : !nameOk ? 'Type your full name to sign'
            : !agreed ? 'Check the box to agree'
            : ''}
        </p>
      )}
    </div>
  );
}
