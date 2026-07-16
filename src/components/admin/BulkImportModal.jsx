import { useState, useEffect, useMemo, useRef } from 'react';
import { lenisStop, lenisStart } from '@/lib/lenis';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Target fields we can map a Booksy column onto. Order = display order.
const TARGETS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'name', label: 'Full Name (if not split)' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'service', label: 'Service' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
];

// Header synonyms so a Booksy (or any) export auto-maps without hand-wiring.
const SYNONYMS = {
  first_name: ['first name', 'firstname', 'first', 'client first name'],
  last_name: ['last name', 'lastname', 'last', 'surname', 'client last name'],
  name: ['client', 'client name', 'full name', 'name', 'customer', 'customer name'],
  email: ['email', 'e-mail', 'email address', 'client email'],
  phone: ['phone', 'cell phone', 'mobile', 'phone number', 'cell', 'telephone', 'client phone', 'mobile phone'],
  service: ['service', 'services', 'service name', 'appointment', 'treatment', 'appointment type'],
  date: ['date', 'appointment date', 'booking date', 'start date', 'date & time', 'date and time', 'day'],
  time: ['time', 'start time', 'appointment time', 'hour'],
  status: ['status', 'appointment status', 'state'],
  notes: ['note', 'notes', 'comment', 'comments', 'description', 'remarks', 'tags'],
};

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, and
// commas / newlines inside quotes. Good enough for a spreadsheet export.
function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function toISODate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let [, mo, d, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function normStatus(raw) {
  const s = (raw || '').toLowerCase();
  if (/cancel|no.?show|declin/.test(s)) return 'cancelled';
  if (/complet|done|finish|past/.test(s)) return 'completed';
  if (/confirm|book|accept|upcoming/.test(s)) return 'confirmed';
  return 'pending';
}

export default function BulkImportModal({ onClose, onDone, darkMode: dm }) {
  const [step, setStep] = useState('input'); // input | map
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [keepExtras, setKeepExtras] = useState(true);
  const [defaultService, setDefaultService] = useState('Non-Bridal Makeup');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    lenisStop();
    return () => { document.body.style.overflow = ''; lenisStart(); };
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !importing) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, importing]);

  const modalBg = dm ? '#27272a' : '#ffffff';
  const borderColor = dm ? '#3f3f46' : '#E8E9EE';
  const textPrimary = dm ? '#f4f4f5' : '#111111';
  const textMuted = dm ? '#71717a' : '#999999';
  const inputBg = dm ? '#18181b' : '#ffffff';
  const inputBorder = dm ? '#3f3f46' : '#E2E4EA';
  const subtleBg = dm ? '#1e1e24' : '#FAFAFB';
  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary };
  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl text-[0.85rem] outline-none transition-all placeholder:opacity-40 focus:border-[#D4A0B0]';
  const labelStyle = { display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px', color: dm ? '#a1a1aa' : '#8a7f76' };

  const autoMap = (hdrs) => {
    const norm = (x) => x.trim().toLowerCase();
    const next = {};
    for (const t of TARGETS) {
      const syns = SYNONYMS[t.key] || [];
      const found = hdrs.find(h => syns.includes(norm(h))) || hdrs.find(h => syns.some(s => norm(h).includes(s)));
      if (found) next[t.key] = found;
    }
    // If a combined "name" and split first/last both matched, prefer split.
    if (next.first_name && next.name) delete next.name;
    return next;
  };

  const ingest = (text) => {
    setError('');
    const rows = parseCSV(text);
    if (rows.length < 2) { setError('That doesn\'t look like a CSV with a header row and at least one client.'); return; }
    const hdrs = rows[0].map(h => h.trim());
    const objs = rows.slice(1).map(r => {
      const o = {};
      hdrs.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
      return o;
    });
    setHeaders(hdrs);
    setDataRows(objs);
    setMapping(autoMap(hdrs));
    setStep('map');
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCsvText(String(reader.result || '')); ingest(String(reader.result || '')); };
    reader.readAsText(file);
  };

  const records = useMemo(() => {
    const g = (o, t) => (mapping[t] ? (o[mapping[t]] || '').trim() : '');
    const usedHeaders = new Set(Object.values(mapping).filter(Boolean));
    return dataRows.map(o => {
      const first = g(o, 'first_name'), last = g(o, 'last_name');
      let name = [first, last].filter(Boolean).join(' ').trim();
      if (!name) name = g(o, 'name');
      const rawEmail = g(o, 'email');
      const email = EMAIL_RE.test(rawEmail) ? rawEmail : '';
      const phone = g(o, 'phone');
      const service = g(o, 'service') || defaultService.trim();
      const rawDate = g(o, 'date');
      const isoDate = toISODate(rawDate);
      const noteParts = [g(o, 'notes')];
      if (rawDate && !isoDate) noteParts.push(`Date: ${rawDate}`);
      if (rawEmail && !email) noteParts.push(`Email (unverified): ${rawEmail}`);
      // Everything Booksy exported that we have no field for still comes
      // along — dropped into notes as "Column: value" so nothing is lost.
      if (keepExtras) {
        for (const h of headers) {
          if (usedHeaders.has(h)) continue;
          const v = (o[h] || '').trim();
          if (v) noteParts.push(`${h}: ${v}`);
        }
      }
      const notes = noteParts.filter(Boolean).join('\n');
      return {
        name, email, phone, service,
        date: isoDate, time: g(o, 'time') || null,
        status: normStatus(g(o, 'status')), notes: notes || null,
        _valid: !!(name && service && (email || phone)),
      };
    });
  }, [dataRows, headers, mapping, defaultService, keepExtras]);

  const validCount = records.filter(r => r._valid).length;
  const skipCount = records.length - validCount;

  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    const valid = records.filter(r => r._valid);
    let ok = 0, fail = 0;
    for (let i = 0; i < valid.length; i++) {
      setProgress(i + 1);
      try {
        const r = valid[i];
        const res = await fetch('/api/bookings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: r.name, email: r.email || null, phone: r.phone, service: r.service, date: r.date, time: r.time, notes: r.notes, status: r.status, source: 'booksy' }),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setResult({ ok, fail, total: valid.length });
    setImporting(false);
  };

  const Select = ({ value, onChange, options }) => (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-8 py-2 rounded-lg text-[0.78rem] outline-none focus:border-[#D4A0B0]"
        style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: value ? textPrimary : textMuted, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', fontSize: '16px' }}>
        <option value="">(none)</option>
        {options.map(o => <option key={o} value={o} style={{ color: '#111' }}>{o}</option>)}
      </select>
      <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && !importing && onClose()}>
      <div className="w-full sm:max-w-[720px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl sm:rounded-[24px]"
        style={{ background: modalBg, border: dm ? `1px solid ${borderColor}` : 'none', animation: 'fadeSlideDown 0.3s ease-out' }}>

        {/* Header */}
        <div className="flex-none flex justify-between items-center px-5 sm:px-6 border-b"
          style={{ borderColor, paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#f8f1ee' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.25rem] leading-none mt-0.5" style={{ color: textPrimary }}>Import Clients</h3>
            </div>
          </div>
          <button onClick={() => !importing && onClose()} type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#3f3f46' : '#f4f0ec', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4" data-lenis-prevent style={{ scrollbarWidth: 'thin' }}>

          {result ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h4 className="font-serif text-[1.4rem]" style={{ color: textPrimary }}>Import complete</h4>
              <p className="text-[0.85rem]" style={{ color: textMuted }}>
                Added <strong style={{ color: textPrimary }}>{result.ok}</strong> {result.ok === 1 ? 'client' : 'clients'}
                {result.fail > 0 && <> · <span style={{ color: '#ef4444' }}>{result.fail} failed</span></>}
                {skipCount > 0 && <> · {skipCount} skipped (missing name or contact info)</>}
              </p>
              <p className="text-[0.72rem] max-w-[380px]" style={{ color: textMuted }}>
                Imported clients are tagged with a <strong style={{ color: '#0E8F98' }}>Booksy</strong> chip. Open any client to add bridal or class detail — no emails were sent.
              </p>
            </div>
          ) : step === 'input' ? (
            <>
              <div className="px-4 py-3 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                <p className="text-[0.78rem] leading-[1.6]" style={{ color: textPrimary }}>
                  Export your clients from <strong>Booksy</strong> as a CSV, then paste it below or upload the file. I'll map the columns and you can review before importing. Nothing is emailed.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl text-[0.78rem] font-semibold transition-all"
                  style={{ background: dm ? '#2e2e38' : '#111', color: dm ? '#e4e4e7' : '#fff' }}>
                  Upload CSV file
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                <span className="text-[0.72rem]" style={{ color: textMuted }}>or paste below</span>
              </div>

              <div>
                <label style={labelStyle}>Paste CSV</label>
                <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                  placeholder={'First name,Last name,Email,Phone,Service,Date\nJane,Doe,jane@email.com,(555) 123-4567,Full Glam,2026-08-14'}
                  className={`${inputClass} resize-none font-mono`} style={{ ...inputStyle, minHeight: 160, fontSize: '13px' }} />
              </div>
              {error && <p className="text-[0.75rem] font-medium" style={{ color: '#ef4444' }}>{error}</p>}
            </>
          ) : (
            <>
              {/* Mapping */}
              <div>
                <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: textMuted }}>Map your columns</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TARGETS.map(t => (
                    <div key={t.key} className="flex items-center gap-2">
                      <span className="text-[0.72rem] font-medium w-[8.5rem] flex-shrink-0" style={{ color: textPrimary }}>{t.label}</span>
                      <div className="flex-1"><Select value={mapping[t.key] || ''} onChange={v => setMapping(m => ({ ...m, [t.key]: v }))} options={headers} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Default service (used when a row has none)</label>
                <input value={defaultService} onChange={e => setDefaultService(e.target.value)} placeholder="e.g. Non-Bridal Makeup" className={inputClass} style={inputStyle} />
              </div>

              {/* Zero-data-loss safety net: columns without a mapped field ride along in notes */}
              <button type="button" onClick={() => setKeepExtras(v => !v)}
                className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                <span className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 mt-[1px] transition-all"
                  style={{ background: keepExtras ? '#D4A0B0' : 'transparent', border: keepExtras ? 'none' : `2px solid ${dm ? '#52525b' : '#d0d0d8'}` }}>
                  {keepExtras && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </span>
                <span>
                  <span className="block text-[0.78rem] font-semibold" style={{ color: textPrimary }}>Keep unmapped columns in notes</span>
                  <span className="block text-[0.68rem] mt-0.5" style={{ color: textMuted }}>
                    Any Booksy column without a field above is saved into each client's notes, so nothing from the export is lost.
                  </span>
                </span>
              </button>

              {/* Preview */}
              <div>
                <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: textMuted }}>
                  Preview · {validCount} ready{skipCount > 0 && <span style={{ color: '#ef4444' }}> · {skipCount} skipped</span>}
                </p>
                <div className="rounded-xl overflow-x-auto" style={{ border: `1px solid ${borderColor}` }}>
                  <table className="w-full text-[0.72rem]" style={{ color: textPrimary }}>
                    <thead>
                      <tr style={{ background: subtleBg }}>
                        {['', 'Name', 'Email', 'Phone', 'Service', 'Date', 'Status'].map(h => (
                          <th key={h} className="text-left font-semibold px-2.5 py-2 whitespace-nowrap" style={{ color: textMuted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 8).map((r, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${borderColor}`, opacity: r._valid ? 1 : 0.4 }}>
                          <td className="px-2.5 py-2">
                            {r._valid
                              ? <span style={{ color: '#22c55e' }}>●</span>
                              : <span title="Skipped: needs a name + an email or phone" style={{ color: '#ef4444' }}>○</span>}
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{r.name || '·'}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{r.email || '·'}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{r.phone || '·'}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{r.service || '·'}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{r.date || '·'}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap capitalize">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {records.length > 8 && <p className="text-[0.68rem] mt-1.5" style={{ color: textMuted }}>…and {records.length - 8} more rows</p>}
              </div>

              {importing && (
                <div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: subtleBg }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${validCount ? (progress / validCount) * 100 : 0}%`, background: '#D4A0B0' }} />
                  </div>
                  <p className="text-[0.72rem] mt-1.5 text-center" style={{ color: textMuted }}>Importing {progress} of {validCount}…</p>
                </div>
              )}
              {error && <p className="text-[0.75rem] font-medium" style={{ color: '#ef4444' }}>{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none px-5 sm:px-6 py-3.5 border-t flex items-center gap-3"
          style={{ borderColor, background: modalBg, paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          {result ? (
            <button type="button" onClick={onDone}
              className="flex-1 py-3 text-[0.82rem] font-medium rounded-xl transition-all"
              style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>Done</button>
          ) : step === 'input' ? (
            <>
              <button type="button" onClick={onClose}
                className="px-5 py-3 text-[0.78rem] font-medium rounded-xl border transition-all"
                style={{ borderColor: inputBorder, color: textMuted, background: 'transparent' }}>Cancel</button>
              <button type="button" onClick={() => ingest(csvText)} disabled={!csvText.trim()}
                className="flex-1 py-3 text-[0.82rem] font-medium rounded-xl transition-all disabled:opacity-50"
                style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>Parse &amp; Map →</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep('input')} disabled={importing}
                className="px-5 py-3 text-[0.78rem] font-medium rounded-xl border transition-all disabled:opacity-50"
                style={{ borderColor: inputBorder, color: textMuted, background: 'transparent' }}>Back</button>
              <button type="button" onClick={runImport} disabled={importing || validCount === 0}
                className="flex-1 py-3 text-[0.82rem] font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>
                {importing ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Importing…</> : `Import ${validCount} ${validCount === 1 ? 'Client' : 'Clients'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
