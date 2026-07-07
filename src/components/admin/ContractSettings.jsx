import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CONTRACT_SETTINGS_KEY,
  parseContractSettings,
  buildContract,
  defaultContractTemplate,
} from '@/lib/contract';
import ContractEditorModal, { ContractPreview } from './ContractEditorModal';

// Sample booking used to render the contract with realistic values in the
// admin preview + live editor, so Roko sees exactly what a client would.
const SAMPLE = {
  clientName: 'Jane Client',
  serviceName: 'Luxury Bridal Look',
  dateFormatted: 'Saturday, August 15, 2026',
  time: '11:00 AM',
  depositAmount: '$375',
  priceAmount: '$750',
  locationType: 'onlocation',
  kind: 'appointment',
};

// Resolve the effective appointment contract (title / intro / consent /
// sections) from Roko's saved settings — her custom version if she has one,
// otherwise the built-in defaults with any legacy "extra clause" folded in.
function effectiveContract(current) {
  const def = defaultContractTemplate({ kind: 'appointment' });
  if (current.sections && current.sections.length) {
    return {
      title: current.title || def.title,
      intro: current.intro || def.intro,
      consent: current.photoConsentQuestion || def.photoConsentQuestion,
      sections: current.sections.map(s => ({ ...s })),
    };
  }
  const sections = def.sections.map(s => ({ ...s }));
  if (current.extraClause) {
    const sigIdx = sections.findIndex(s => s.id === 'signature');
    const addl = { id: 'additional', heading: 'Additional Terms', body: current.extraClause };
    if (sigIdx >= 0) sections.splice(sigIdx, 0, addl); else sections.push(addl);
  }
  return {
    title: current.title || def.title,
    intro: current.intro || def.intro,
    consent: current.photoConsentQuestion || def.photoConsentQuestion,
    sections,
  };
}

// The client contract, fully editable by Roko. The card shows a live preview;
// clicking "Edit contract" opens a full editor where she can rewrite the title,
// intro, every section, reorder / add / remove sections, and the photo question.
// Dynamic booking values stay correct via {placeholder} tokens. Saved to
// app_settings and read by every sign step, email, and PDF.
export default function ContractSettings({ darkMode: dm }) {
  const queryClient = useQueryClient();

  // Auto-fill scalars (feed {artistName}, {days}, {travelFee}).
  const [artistName, setArtistName] = useState('');
  const [cancellationDays, setCancellationDays] = useState('');
  const [travelFee, setTravelFee] = useState('');
  // Full-contract draft (edited in the modal).
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [consent, setConsent] = useState('');
  const [sections, setSections] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ['contract-settings'],
    queryFn: () => api.entities.AppSettings.filter({ key: CONTRACT_SETTINGS_KEY }),
    staleTime: 30000,
  });
  const existing = rows[0];
  const current = parseContractSettings(existing?.value);

  // Keep the scalar fields in sync with what's saved.
  useEffect(() => {
    setArtistName(current.artistName || '');
    setCancellationDays(current.cancellationNoticeDays != null ? String(current.cancellationNoticeDays) : '');
    setTravelFee(current.travelFeeStart || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.value]);

  // Overrides object for a given set of values, for previewing.
  const overridesFrom = (o) => ({
    artistName: (o.artistName || '').trim() || undefined,
    cancellationNoticeDays: o.cancellationDays === '' || o.cancellationDays == null ? undefined : Number(o.cancellationDays),
    travelFeeStart: (o.travelFee || '').trim() || undefined,
    title: (o.title || '').trim() || undefined,
    intro: (o.intro || '').trim() || undefined,
    photoConsentQuestion: (o.consent || '').trim() || undefined,
    sections: o.sections && o.sections.length ? o.sections : undefined,
  });

  // Card preview uses the saved settings; the modal uses the live draft.
  const savedPreview = buildContract({ ...SAMPLE, overrides: current });
  const draftPreview = buildContract({
    ...SAMPLE,
    overrides: overridesFrom({ artistName, cancellationDays, travelFee, title, intro, consent, sections }),
  });

  const openEditor = () => {
    const eff = effectiveContract(current);
    setArtistName(current.artistName || '');
    setCancellationDays(current.cancellationNoticeDays != null ? String(current.cancellationNoticeDays) : '');
    setTravelFee(current.travelFeeStart || '');
    setTitle(eff.title);
    setIntro(eff.intro);
    setConsent(eff.consent);
    setSections(eff.sections);
    setSaved(false);
    setEditorOpen(true);
  };

  const resetToDefault = () => {
    const def = defaultContractTemplate({ kind: 'appointment' });
    setTitle(def.title);
    setIntro(def.intro);
    setConsent(def.photoConsentQuestion);
    setSections(def.sections.map(s => ({ ...s })));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = JSON.stringify({
        artistName: artistName.trim(),
        cancellationNoticeDays: cancellationDays === '' ? '' : Number(cancellationDays),
        travelFeeStart: travelFee.trim(),
        title: title.trim(),
        intro: intro.trim(),
        photoConsentQuestion: consent.trim(),
        sections: sections
          .map(s => ({ id: s.id, heading: s.heading.trim(), body: s.body.trim() }))
          .filter(s => s.heading || s.body),
        // Folded into sections now; cleared so it isn't double-applied.
        extraClause: '',
      });
      if (existing) await api.entities.AppSettings.update(existing.id, { value });
      else await api.entities.AppSettings.create({ key: CONTRACT_SETTINGS_KEY, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-settings'] });
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditorOpen(false); }, 900);
    },
  });

  const cardBg = dm ? '#26262e' : '#fff';
  const border = dm ? '#3a3a48' : '#E5E7EB';
  const textMain = dm ? '#ECEDF1' : '#111';
  const textHint = dm ? '#71717a' : '#999';

  const sectionCount = savedPreview.sections.length;

  return (
    <div className="rounded-xl p-5 mb-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <span className="text-[0.75rem] font-semibold tracking-tight" style={{ color: textMain }}>Client Contract</span>
        </div>
        <button
          onClick={openEditor}
          className="px-3.5 py-1.5 rounded-lg text-[0.68rem] font-semibold transition-all bg-[#111] text-white hover:bg-[#222] shadow-sm flex items-center gap-1.5 flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          Edit contract
        </button>
      </div>
      <p className="text-[0.7rem] mb-4 leading-[1.6]" style={{ color: textHint }}>
        The full agreement every client signs. Edit the title, intro, and every section, or add your own. Dynamic details (deposit, date, names) fill in per booking.
      </p>

      {/* Live preview of the current saved contract — tap to edit */}
      <button
        onClick={openEditor}
        className="group relative w-full text-left rounded-xl overflow-hidden transition-colors"
        style={{ border: `1px solid ${border}`, background: dm ? '#1c1c22' : '#FBF7F9' }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${border}` }}>
          <span className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase" style={{ color: textHint }}>{savedPreview.title}</span>
          <span className="text-[0.58rem]" style={{ color: textHint }}>{sectionCount} sections</span>
        </div>
        {/* Clamp the preview to a teaser height with a fade-out at the bottom */}
        <div className="relative px-4 py-3.5" style={{ maxHeight: 200, overflow: 'hidden' }}>
          <ContractPreview c={savedPreview} dm={dm} />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 flex items-end justify-center pb-2.5"
            style={{ background: `linear-gradient(to bottom, transparent, ${dm ? '#1c1c22' : '#FBF7F9'} 78%)` }}
          >
            <span className="text-[0.66rem] font-semibold text-[#C4849A] group-hover:underline underline-offset-2">
              View &amp; edit full contract
            </span>
          </div>
        </div>
      </button>

      {editorOpen && (
        <ContractEditorModal
          dm={dm}
          artistName={artistName} setArtistName={setArtistName}
          cancellationDays={cancellationDays} setCancellationDays={setCancellationDays}
          travelFee={travelFee} setTravelFee={setTravelFee}
          title={title} setTitle={setTitle}
          intro={intro} setIntro={setIntro}
          consent={consent} setConsent={setConsent}
          sections={sections} setSections={setSections}
          preview={draftPreview}
          onReset={resetToDefault}
          onClose={() => setEditorOpen(false)}
          onSave={() => saveMutation.mutate()}
          saving={saveMutation.isPending}
          saved={saved}
        />
      )}
    </div>
  );
}
