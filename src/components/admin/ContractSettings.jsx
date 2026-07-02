import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CONTRACT_SETTINGS_KEY, parseContractSettings, ARTIST_NAME, CONTRACT_POLICIES } from '@/lib/contract';

// Guided editor for the client contract. Roko edits a few safe values; the legal
// structure stays fixed so she can't accidentally break the agreement. Saved to
// app_settings and read by every sign step, email, and PDF.
export default function ContractSettings({ darkMode: dm }) {
  const queryClient = useQueryClient();
  const [artistName, setArtistName] = useState('');
  const [cancellationDays, setCancellationDays] = useState('');
  const [travelFee, setTravelFee] = useState('');
  const [extraClause, setExtraClause] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ['contract-settings'],
    queryFn: () => api.entities.AppSettings.filter({ key: CONTRACT_SETTINGS_KEY }),
    staleTime: 30000,
  });
  const existing = rows[0];
  const current = parseContractSettings(existing?.value);

  useEffect(() => {
    setArtistName(current.artistName || '');
    setCancellationDays(current.cancellationNoticeDays != null ? String(current.cancellationNoticeDays) : '');
    setTravelFee(current.travelFeeStart || '');
    setExtraClause(current.extraClause || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.value]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = JSON.stringify({
        artistName: artistName.trim(),
        cancellationNoticeDays: cancellationDays === '' ? '' : Number(cancellationDays),
        travelFeeStart: travelFee.trim(),
        extraClause: extraClause.trim(),
      });
      if (existing) await api.entities.AppSettings.update(existing.id, { value });
      else await api.entities.AppSettings.create({ key: CONTRACT_SETTINGS_KEY, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const inputStyle = {
    border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`,
    color: dm ? '#e4e4e7' : '#111',
    background: dm ? '#1e1e24' : '#fff',
  };
  const labelStyle = { color: dm ? '#a1a1aa' : '#555' };
  const hintStyle = { color: dm ? '#71717a' : '#999' };

  return (
    <div className="rounded-xl p-5 mb-5" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <span className="text-[0.75rem] font-semibold tracking-tight" style={{ color: dm ? '#F0EBE6' : '#111' }}>Client Contract</span>
      </div>
      <p className="text-[0.7rem] mb-4 leading-[1.6]" style={hintStyle}>
        These values fill into the service agreement every client signs. Changes apply to new bookings. The rest of the agreement (deposit, allergies, photo consent, e-signature) stays fixed.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[0.7rem] font-medium mb-1.5" style={labelStyle}>Your legal / business name</label>
          <input value={artistName} onChange={e => setArtistName(e.target.value)}
            placeholder={ARTIST_NAME}
            className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle} />
          <p className="text-[0.62rem] mt-1" style={hintStyle}>Appears at the top of the contract. Should match your Stripe and Zelle name.</p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[0.7rem] font-medium mb-1.5" style={labelStyle}>Cancellation notice (days)</label>
            <input type="number" min="0" max="90" value={cancellationDays} onChange={e => setCancellationDays(e.target.value)}
              placeholder={String(CONTRACT_POLICIES.cancellationNoticeDays)}
              className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle} />
          </div>
          <div className="flex-1">
            <label className="block text-[0.7rem] font-medium mb-1.5" style={labelStyle}>Travel fee starts at</label>
            <input value={travelFee} onChange={e => setTravelFee(e.target.value)}
              placeholder={CONTRACT_POLICIES.travelFeeStart}
              className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none" style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-[0.7rem] font-medium mb-1.5" style={labelStyle}>Extra clause (optional)</label>
          <textarea value={extraClause} onChange={e => setExtraClause(e.target.value)}
            placeholder="Any additional term you want clients to agree to. Leave blank to skip."
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-[0.82rem] outline-none resize-none" style={inputStyle} />
          <p className="text-[0.62rem] mt-1" style={hintStyle}>Added as an "Additional Terms" section. For anything major, have it reviewed first.</p>
        </div>

        <div className="flex justify-end">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="px-5 py-2 rounded-xl text-[0.72rem] font-semibold transition-all bg-[#111] text-white hover:bg-[#222] shadow-sm disabled:opacity-60">
            {saveMutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Contract Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
