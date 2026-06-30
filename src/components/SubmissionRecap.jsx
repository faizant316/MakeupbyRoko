import { useState } from 'react';

// Read-only mini month with the chosen day highlighted — mirrors how the date
// looked on the booking calendar, shown inside the confirmation recap.
function MiniCalendar({ dateStr }) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const selDay = d.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let dd = 1; dd <= daysInMonth; dd++) cells.push(dd);
  const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-[230px]">
      <p className="text-center font-serif text-[0.95rem] text-[#111] mb-2 tracking-tight">{monthName}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
          <div key={i} className="text-[0.5rem] font-semibold text-gray-300 uppercase tracking-[0.06em] py-0.5">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {cells.map((dd, i) => (
          <div key={i} className="aspect-square flex items-center justify-center">
            {dd && (
              <span className={`w-[1.4rem] h-[1.4rem] flex items-center justify-center rounded-full text-[0.62rem] ${
                dd === selDay ? 'bg-[#111] text-white font-semibold' : 'text-[#aaa]'
              }`}>{dd}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Collapsible "View your submission" recap shown on every confirmation screen.
 * Shows the chosen date (with a mini calendar) plus every field the client filled.
 *
 * @param {string}  dateStr   selected date as 'YYYY-MM-DD'
 * @param {string}  dateLabel label for the date row (e.g. "Wedding Date")
 * @param {Array<{label:string, value:any}>} rows  submitted fields
 */
export default function SubmissionRecap({ dateStr, dateLabel = 'Selected Date', rows = [] }) {
  const [open, setOpen] = useState(false);

  const filled = rows.filter(
    r => r.value !== undefined && r.value !== null && String(r.value).trim() !== ''
  );
  const formattedDate = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#F0E0E9] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#FDF8FA]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 text-[0.8rem] font-medium text-[#2C1A14]">
          <span className="w-7 h-7 rounded-lg bg-[#FDF0F5] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.6" className="w-3.5 h-3.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </span>
          View your submission
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2"
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 flex flex-col gap-4" style={{ animation: 'fadeSlideDown 0.2s ease-out' }}>
          {dateStr && (
            <div className="flex flex-col items-center gap-2.5 bg-[#FDF8FA] rounded-xl border border-[#F5E8EF] py-4 px-3">
              <MiniCalendar dateStr={dateStr} />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A] mb-0.5">{dateLabel}</p>
                <p className="text-[0.8rem] text-[#2C1A14] font-medium">{formattedDate}</p>
              </div>
            </div>
          )}

          {filled.length > 0 && (
            <div className="flex flex-col">
              <p className="text-[0.55rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A] mb-1.5">Your Details</p>
              {filled.map((r, i) => (
                <div key={i} className={`flex justify-between gap-4 py-2.5 ${i < filled.length - 1 ? 'border-b border-[#F5E8EF]' : ''}`}>
                  <span className="text-[0.74rem] text-[#999] flex-shrink-0">{r.label}</span>
                  <span className="text-[0.78rem] text-[#2C1A14] text-right break-words min-w-0">{String(r.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
