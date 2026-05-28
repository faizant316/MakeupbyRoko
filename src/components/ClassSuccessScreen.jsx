import { useEffect, useState } from 'react';

export default function ClassSuccessScreen({ onClose, registrationData }) {
  const { full_name, email, selectedClasses = [], totalPaid = 0 } = registrationData || {};
  const firstName = (full_name || '').split(' ')[0] || 'there';
  const receiptDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 80); }, []);

  return (
    <div className={`flex flex-col flex-1 overflow-y-auto transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full sm:max-w-[680px] sm:mx-auto px-6 sm:px-10 py-10 flex flex-col gap-6">

        {/* Hero confirmation */}
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F7EEF2] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.8" className="w-7 h-7">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h2 className="font-serif text-[1.8rem] text-[#111] mb-1">Payment Confirmed!</h2>
            <p className="font-serif italic text-[#D4A0B0] text-base">Your spot is officially secured ✦</p>
          </div>
          <p className="text-[0.85rem] text-gray-500 max-w-[400px] leading-[1.8]">
            Hey {firstName}! Your payment has been received. Roko will reach out within <strong className="text-[#111]">24–48 hours</strong> to confirm your class schedule and all the details.
          </p>
          <div className="flex items-center gap-2 text-[0.72rem] text-[#A0785A]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            Receipt sent to {email || 'your email'}
          </div>
        </div>

        {/* Itemized receipt */}
        <div className="rounded-xl overflow-hidden border border-[#e8e2dc]">
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#FAF7F4', borderBottom: '1px solid #EDE6DF' }}>
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#C4849A] mb-0.5">Payment Receipt</p>
              <p className="text-[0.72rem] text-gray-400">{receiptDate}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.58rem] font-semibold tracking-[0.1em] uppercase text-gray-400 mb-0.5">Status</p>
              <span className="text-[0.65rem] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
                Paid ✓
              </span>
            </div>
          </div>

          <div className="bg-white divide-y divide-[#F5F0EC]">
            {selectedClasses.map((cls, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[0.82rem] font-medium text-[#111]">{cls.name}</p>
                  <p className="text-[0.65rem] text-[#A0785A] mt-0.5">{cls.duration}</p>
                </div>
                <p className="text-[0.82rem] font-semibold text-[#111]">${cls.price?.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-5 py-4" style={{ background: '#FAF7F4', borderTop: '1px solid #EDE6DF' }}>
            <span className="text-[0.85rem] font-semibold text-[#111]">Total Paid</span>
            <span className="font-serif text-[1.25rem] text-[#111]">${totalPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* What's next */}
        <div className="rounded-xl border border-[#e8e2dc] overflow-hidden">
          <div className="px-5 py-3.5" style={{ background: '#FAF7F4', borderBottom: '1px solid #EDE6DF' }}>
            <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#C4849A]">What Happens Next</p>
          </div>
          <div className="bg-white divide-y divide-[#F5F0EC]">
            {[
              { n: 1, title: 'Roko reaches out within 24–48 hrs', sub: 'To confirm your class date, time & location' },
              { n: 2, title: 'Prepare any inspiration photos', sub: 'Optional but helpful — share looks you love' },
              { n: 3, title: 'Show up and learn!', sub: 'All supplies are provided — just bring yourself' },
            ].map(({ n, title, sub }) => (
              <div key={n} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-5 h-5 rounded-full bg-[#F7EEF2] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[0.6rem] font-bold text-[#C4849A]">{n}</span>
                </div>
                <div>
                  <p className="text-[0.82rem] font-medium text-[#111]">{title}</p>
                  <p className="text-[0.68rem] text-gray-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact / sign off */}
        <div className="text-center py-2">
          <p className="font-serif italic text-[1.1rem] text-[#C4849A] mb-1">With love, Roko</p>
          <p className="text-[0.68rem] text-[#999999]">makeupbyroko22@gmail.com · @makeupbyroko_</p>
        </div>

        <div className="pb-8">
          <button onClick={onClose}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium border border-[#e8e2dc] text-gray-500 hover:border-[#111] hover:text-[#111] transition-all">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
