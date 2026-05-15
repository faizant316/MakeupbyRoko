export default function Work() {
  return (
    <section id="work" className="section bg-[var(--surface)] isolate" style={{position:'relative', zIndex:1}}>
      <div className="container">
        <div className="flex justify-between items-end mb-[clamp(2rem,4vw,3.5rem)] flex-wrap gap-6 reveal">
          <div>
            <span className="label block mb-3">Portfolio</span>
            <h2 className="mt-3">The Work</h2>
          </div>
          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'14px',height:'14px'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            View All on Instagram
          </a>
        </div>

        <div className="reveal">
          <div id="igFallback" className="grid grid-cols-3 gap-2">
            {[
              'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1515688594412-d1b32d8f50ed?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1503236823255-94d827a26d5c?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1526413715211-55a25a37e2f7?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1583241800698-e8ab01830a33?w=600&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1588776814546-1ffbb172dffa?w=600&q=80&auto=format&fit=crop',
            ].map((img, idx) => (
              <a key={idx} href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="aspect-square overflow-hidden rounded-[var(--radius)] relative group">
                <img src={img} alt={`Work ${idx + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-400" />
                <div className="absolute inset-0 bg-[rgba(17,17,17,0)] group-hover:bg-[rgba(17,17,17,0.35)] flex items-center justify-center transition-all duration-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-10 reveal">
          <div className="flex items-center gap-2 text-[0.875rem] text-[var(--text-muted)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'18px',height:'18px',color:'#E1306C'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            @makeupbyroko_
          </div>
          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="btn btn-primary">
            Follow for More
          </a>
        </div>
      </div>
    </section>
  );
}