import { useState, useRef, useEffect } from 'react';

const RESPONSES = [
  { keywords: ['price', 'cost', 'how much', 'rate', 'charge', 'fee', 'pricing'], reply: "Here's the current service menu:\n\n• Luxury Bridal Look — $750 (2 hrs)\n• Full Day Service — $1,700 (all day)\n• Non-Bridal Makeup — $400 (1.5 hrs)\n• Photoshoot Makeup — $600 (1 hr 45 min)\n• Makeup Courses — varies (Mon–Thu)\n\nDeposits are required via Zelle to confirm. Remaining balance is due in cash on the day of your appointment." },
  { keywords: ['book', 'appointment', 'schedule', 'reserve', 'slot', 'how to book'], reply: "To book, email makeupbyroko22@gmail.com with:\n\n• Your appointment date as the subject line (MM/DD/YYYY)\n• Full name\n• Phone number\n• Time you need to be fully ready by\n• Occasion\n• Location\n\nAppointments are first come, first serve and are NOT confirmed until the deposit is sent and a screenshot is received. 📅" },
  { keywords: ['bridal', 'wedding', 'bride', 'luxury bridal'], reply: "The Luxury Bridal Look is $750 with a $375 deposit (2-hour service). A $200+ travel fee is added for services not held at the studio.\n\nFor brides needing a second look, located 1+ hr from the studio, or starting before 7 AM — the Full Day Service ($1,700) is required.\n\nA 30-min Zoom consultation is included once your booking is confirmed. 💍" },
  { keywords: ['full day', 'second look', 'bridal switch', 'all day'], reply: "The Full Day Service is $1,700 with an $850 deposit. It's required for brides who:\n\n• Need a bridal switch (second look)\n• Are located over 1 hour from the studio\n• Have a start time before 7 AM\n\nThis includes all-day availability, travel, and touch-ups throughout the day." },
  { keywords: ['non-bridal', 'non bridal', 'event makeup', 'occasion'], reply: "Non-Bridal Makeup is $400 with a $200 deposit (1.5-hour service).\n\nAll non-bridal appointments are held exclusively at the studio in Mountain House, unless included as part of a bridal travel package.\n\nImportant: Non-bridal bookings can only be made up to one month before your event, as bridal clients are prioritized. Earlier bookings will have bridal pricing applied." },
  { keywords: ['photoshoot', 'shoot', 'engagement', 'maternity', 'photo'], reply: "Photoshoot Makeup is $600 with a $300 deposit (1 hr 45 min).\n\nThis covers engagement shoots, maternity shoots, birthday shoots, and more. All photoshoot appointments are held exclusively at the studio in Mountain House." },
  { keywords: ['class', 'course', 'lesson', 'learn', 'teach'], reply: "Makeup Courses are available Mon–Thu between 10 AM and 8 PM. A 50% deposit via Zelle secures your spot.\n\nVisit the class selection form, choose your class, then email back after sending the deposit:\nhttps://docs.google.com/forms/d/e/1FAIpQLSfrQsZt_zKssRaOhYHnJvhNbtY910PM_18x3YLdb2qaSNg9iA/viewform" },
  { keywords: ['travel', 'location', 'come to', 'on-site', 'mobile', 'destination', 'out of state'], reply: "A $200+ travel fee is automatically added for any bridal services not held at the studio.\n\nNon-bridal and photoshoot appointments are held exclusively at the studio in Mountain House, CA.\n\nFor out-of-state or 2+ hour locations, include your location in your booking email for accurate pricing." },
  { keywords: ['cancel', 'refund', 'reschedule', 'policy', 'cancellation'], reply: "Deposits are NON-REFUNDABLE & NON-TRANSFERABLE.\n\nIf you cancel, the deposit will not be refunded. If Roko cancels due to an emergency, you will be refunded.\n\nAppointments are first come, first serve and are NOT confirmed until the deposit is sent, a screenshot is received, and you get a confirmation text/email." },
  { keywords: ['deposit', 'zelle', 'payment', 'pay', 'cash', 'balance'], reply: "Deposits are accepted through Zelle only. Once you book, the Zelle details are sent straight to your email with your confirmation. Just include your name and appointment date in the Zelle note, then send a screenshot as proof.\n\nThe remaining balance must be paid in CASH — please bring it in an envelope labeled with your name and payment amount." },
  { keywords: ['consultation', 'consult', 'zoom', 'call'], reply: "A 30-minute Zoom consultation is included with confirmed bookings. During the call, Roko will review your look and gather details. Please have ready:\n\n• Inspiration photos\n• Photos of your outfit(s)/gown(s)\n• A photo with makeup & one without\n\nAll photos are kept completely confidential." },
  { keywords: ['prep', 'prepare', 'before', 'skin', 'skincare', 'what to bring'], reply: "For the best results:\n\n✔ Arrive with clean, moisturized skin\n✔ Avoid heavy skincare treatments the night before\n✔ Come with dry, styled hair\n✔ Bring any inspiration photos\n✔ Bring remaining balance in a labeled cash envelope\n\nLet me know about any allergies or sensitivities in advance." },
  { keywords: ['products', 'brands', 'kit', 'what do you use'], reply: "I work with a professional kit featuring top brands: MAC, Charlotte Tilbury, NARS, Pat McGrath, Fenty Beauty, and more. All brushes and tools are fully sanitized between every appointment." },
  { keywords: ['instagram', 'ig', 'social', 'follow', '@'], reply: "Follow @makeupbyroko_ on Instagram to see all the latest looks, BTS content, and client transformations. ✨" },
  { keywords: ['studio', 'mountain house', 'where', 'address'], reply: "The studio is located in Mountain House, California. Non-bridal and photoshoot appointments are held exclusively at the studio. Bridal clients may have on-location service with a travel fee." },
  { keywords: ['contact', 'email', 'reach', 'message', 'dm'], reply: "You can reach Roko by:\n\n📧 Email: makeupbyroko22@gmail.com\n📸 Instagram DM: @makeupbyroko_\n\nPlease allow 24–48 hours for a response." },
  { keywords: ['hello', 'hi', 'hey', 'hiya', 'howdy'], reply: "Hi there! 👋 I'm here to help with anything about services, pricing, booking, or policies. What would you like to know?" },
  { keywords: ['thank', 'thanks', 'thx'], reply: "You're so welcome! 💕 Is there anything else I can help with?" }
];

const DEFAULT_REPLY = "That's a great question! For anything specific, reach out directly:\n\n📧 Email: makeupbyroko22@gmail.com\n📸 Instagram: @makeupbyroko_\n\nPlease allow 24–48 hours for a response!";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! 👋 I'm Roko's assistant. Ask me about pricing, booking, services, policies, or payment info!" }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getBotReply = (userInput) => {
    const lower = userInput.toLowerCase();
    for (const r of RESPONSES) {
      if (r.keywords.some(k => lower.includes(k))) return r.reply;
    }
    return DEFAULT_REPLY;
  };

  const handleSend = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setShowChips(false);
    setTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: getBotReply(trimmed) }]);
      setTyping(false);
    }, 600 + Math.random() * 500);
  };

  const chips = [
    "What are your prices?",
    "How do I book?",
    "How do I pay?",
    "Do you travel?"
  ];

  return (
    <div id="chatbot" className="fixed bottom-5 right-5 z-[600] flex flex-col items-end gap-2.5 pointer-events-none">
      {/* Panel */}
      <div className={`w-[320px] max-w-[calc(100vw-2.5rem)] h-[420px] bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.13),0_1px_4px_rgba(0,0,0,0.07)] flex flex-col overflow-hidden transform origin-bottom-right transition-all duration-250 border border-gray-100 ${open ? 'scale-100 translate-y-0 opacity-100 pointer-events-auto' : 'scale-95 translate-y-3 opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="bg-[#111] text-white px-4 py-3.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#D4A0B0] flex items-center justify-center font-sans text-[0.7rem] font-semibold text-white flex-shrink-0 tracking-wider">
            R
          </div>
          <div className="flex-1">
            <div className="text-[0.8rem] font-semibold tracking-[0.01em]">Roko's Assistant</div>
            <div className="text-[0.65rem] text-[rgba(255,255,255,0.4)] flex items-center gap-1.5 mt-px">
              <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
              <span>Always here</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="bg-none border-none text-[rgba(255,255,255,0.4)] cursor-pointer p-1 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'15px',height:'15px'}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 scroll-smooth bg-[#FAFAF9]">
          {messages.map((msg, i) => (
            <div key={i} className={`max-w-[82%] px-3 py-2 text-[0.78rem] leading-[1.55] break-words whitespace-pre-wrap ${msg.role === 'bot' ? 'bg-white self-start text-[#222] border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] rounded-lg rounded-tl-sm' : 'bg-[#111] text-white self-end rounded-lg rounded-tr-sm'}`}>
              {msg.text}
            </div>
          ))}
          {typing && (
            <div className="bg-white self-start px-3 py-2.5 rounded-lg rounded-tl-sm border border-gray-200/80 flex gap-1.5 items-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] animate-pulse" style={{animationDelay: `${i * 0.15}s`}}></div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chips */}
        {showChips && (
          <div className="px-4 py-2.5 flex gap-1.5 flex-wrap border-t border-gray-100 bg-white">
            {chips.map((chip, i) => (
              <button key={i} onClick={() => handleSend(chip)} className="px-2.5 py-1 border border-gray-200 rounded text-[0.65rem] text-gray-500 cursor-pointer hover:bg-[#111] hover:text-white hover:border-[#111] transition-all bg-white whitespace-nowrap tracking-[0.01em]">
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-center bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded text-[0.78rem] text-[#111] bg-[#FAFAF9] outline-none focus:border-[#D4A0B0] focus:ring-1 focus:ring-[#D4A0B0]/20 transition-all placeholder-gray-400"
          />
          <button onClick={() => handleSend()} className="w-8 h-8 rounded bg-[#111] text-white border-none cursor-pointer flex items-center justify-center hover:bg-[#D4A0B0] transition-colors flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'13px',height:'13px'}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 bg-[#111] text-white rounded border-none cursor-pointer hover:bg-[#D4A0B0] shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all pointer-events-auto"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'16px',height:'16px'}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
  );
}