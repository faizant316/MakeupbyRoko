export default function ServiceModal({ service, onClose }) {
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] z-300 flex items-center justify-center p-6 opacity-100 pointer-events-auto transition-opacity duration-300" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)] transform scale-100 transition-transform duration-300 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[rgba(255,255,255,0.9)] backdrop-blur-[4px] border-none cursor-pointer flex items-center justify-center shadow-[var(--shadow)] hover:bg-white transition-colors z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'16px',height:'16px'}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <img src={service.photo} alt={service.title} className="w-full aspect-video object-cover rounded-3xl rounded-b-none" />

        <div className="p-8">
          <div className="flex gap-2 flex-wrap mb-5">
            {service.chips.map((chip, i) => (
              <span key={i} className="px-3 py-[0.3rem] bg-[var(--surface)] rounded-full text-[0.75rem] text-[var(--text-muted)]">
                {chip}
              </span>
            ))}
          </div>

          <h2 className="font-serif text-3xl mb-3">{service.title}</h2>
          <p className="text-[0.9375rem] text-[var(--text-muted)] leading-[1.75] mb-6">{service.desc}</p>

          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-5 mb-6">
            <div className="text-[0.75rem] font-semibold letter-spacing-[0.08em] text-[var(--text-muted)] uppercase mb-3">What's Included</div>
            <ul className="flex flex-col gap-1">
              {service.includes.map((inc, i) => (
                <li key={i} className="text-[0.875rem] text-[var(--text)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-semibold">✓</span>
                  {inc}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-4 pt-6 border-t border-[var(--border)]">
            <div>
              <div className="font-serif text-4xl leading-none text-[var(--text)]">{service.price}</div>
              <div className="text-[0.8rem] text-[var(--text-light)] mt-1">{service.deposit}</div>
            </div>
            <button className="btn btn-primary" onClick={() => { onClose(); setTimeout(() => { document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' }); }, 100); }}>Book This Service</button>
          </div>
        </div>
      </div>
    </div>
  );
}