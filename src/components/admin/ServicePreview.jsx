export default function ServicePreview({ form }) {
  const isBridal = form.category === 'bridal';

  if (isBridal) {
    return (
      <div className="rounded-lg overflow-hidden border border-[#E5E7EB] bg-white">
        <div className="flex flex-col sm:flex-row">
          {form.photo && (
            <div className="sm:w-[44%] aspect-[3/4] sm:aspect-auto overflow-hidden bg-[#f5f5f5] flex-shrink-0">
              <img src={form.photo} alt={form.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col justify-between p-5 flex-1">
            <div>
              <span className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] block mb-1">Featured Service</span>
              <h3 className="font-serif text-[1.3rem] font-normal text-[#111] leading-tight mb-1.5">{form.title || 'Service Name'}</h3>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="font-serif text-[1.1rem] text-[#111]">{form.price || '$—'}</span>
                <span className="text-[#ddd]">·</span>
                <span className="text-[0.75rem] text-[#888]">{form.duration || '—'}</span>
                {form.deposit && (
                  <>
                    <span className="text-[#ddd]">·</span>
                    <span className="text-[0.7rem] text-[#999]">{form.deposit}</span>
                  </>
                )}
              </div>
              {form.description && (
                <p className="text-[0.78rem] text-[#999] leading-[1.7] mb-3 line-clamp-3">{form.description}</p>
              )}
              {form.includes.length > 0 && (
                <ul className="flex flex-col gap-1 mb-3">
                  {form.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[0.75rem] text-[#999]">
                      <span className="w-1 h-1 rounded-full flex-shrink-0 mt-[6px]" style={{ background: '#D4A0B0' }} />{item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="w-full py-2.5 bg-[#111] text-white text-[0.75rem] font-medium tracking-[0.04em] rounded-[2px] text-center">
              Inquire About Bridal →
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-bridal: stacks on mobile, horizontal on wider
  return (
    <div className="rounded-lg overflow-hidden border border-[#eee] bg-white flex flex-col sm:flex-row sm:h-[200px]">
      {form.photo && (
        <div className="sm:hidden w-full aspect-[16/9] overflow-hidden bg-[#f5f5f5]">
          <img src={form.photo} alt={form.title} className="w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1 justify-between min-w-0">
        <div>
          <h3 className="font-serif text-[1rem] font-normal text-[#111] leading-tight mb-1">{form.title || 'Service Name'}</h3>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[0.8rem] font-medium text-[#111]">{form.price || '$—'}</span>
            <span className="text-[#ccc]">·</span>
            <span className="text-[0.7rem] text-[#999]">{form.duration || '—'}</span>
          </div>
          {form.description && (
            <p className="text-[0.72rem] text-[#aaa] leading-[1.5] line-clamp-2">{form.description}</p>
          )}
        </div>
        <div className="w-full py-2 mt-3 sm:mt-0 bg-[#111] text-white text-[0.68rem] font-medium tracking-[0.06em] uppercase rounded-[3px] text-center">
          Select & Book →
        </div>
      </div>
      {form.photo && (
        <div className="hidden sm:block w-[35%] flex-shrink-0 overflow-hidden bg-[#f5f5f5]">
          <img src={form.photo} alt={form.title} className="w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} />
        </div>
      )}
    </div>
  );
}