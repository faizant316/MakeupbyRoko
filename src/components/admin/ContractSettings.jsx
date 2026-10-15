import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CONTRACT_SETTINGS_KEY,
  parseContractSettings,
  buildContract,
  defaultContractTemplate,
  healSupersededSection,
} from '@/lib/contract';
import ContractEditorModal, { ContractPreview } from './ContractEditorModal';
import { Button, Panel } from './ui';

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
      // Heal untouched copies of superseded wording so the editor opens on what
      // clients actually see, and saving can't re-freeze the outdated text.
      sections: current.sections.map(s => ({ ...healSupersededSection(s, def.sections) })),
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

  const sectionCount = savedPreview.sections.length;

  return (
    <Panel
      className="mb-8"
      title="Client contract"
      action={(
        <Button variant="solid" size="sm" onClick={openEditor}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          Edit contract
        </Button>
      )}
      bodyClassName="px-4 pb-5 pt-4 sm:px-5"
    >
      <p className="mb-4 max-w-[640px] text-[0.8rem] leading-relaxed text-ink-muted">
        The full agreement every client signs. Edit the title, intro, and every section, or add your own. Dynamic details (deposit, date, names) fill in per booking.
      </p>

      {/* The saved contract, cut off after a few lines. Tap anywhere to edit. */}
      <button
        type="button"
        onClick={openEditor}
        className="group block w-full border border-line bg-canvas text-left transition-colors duration-200 hover:border-ink/30"
      >
        <span className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{savedPreview.title}</span>
          <span className="shrink-0 text-[0.68rem] tabular-nums text-ink-muted">{sectionCount} sections</span>
        </span>
        <span className="block max-h-[200px] overflow-hidden px-4 py-3.5">
          <ContractPreview c={savedPreview} dm={dm} />
        </span>
        <span className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[0.78rem] font-medium text-ink">
          View &amp; edit full contract
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
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
    </Panel>
  );
}
