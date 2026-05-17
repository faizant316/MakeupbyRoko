export default function Services() {
  const previews = [
    {
      title: 'Bridal Package',
      photo: '/images/services/bridal.jpg',
      price: '$400+',
      duration: '3–4 hrs',
    },
    {
      title: 'Full Glam',
      photo: '/images/services/full-glam.jpg',
      price: '$250+',
      duration: '90 min',
    },
    {
      title: 'Editorial & Shoot',
      photo: '/images/services/editorial.jpg',
      price: '$300+',
      duration: '90 min',
    },
    {
      title: 'Natural Everyday',
      photo: '/images/services/natural.jpg',
      price: '$150+',
      duration: '60 min',
    },
  ];

  return (
    <section id="services" className="section bg-[var(--bg)] isolate" style={{position:'relative', zIndex:1}}>
      <div className="container">
        <div className="section-header reveal flex justify-between items-end flex-wrap gap-4">
          <div>
            <span className="label block mb-3">Services & Pricing</span>
            <h2>Book a Service</h2>
          </div>
          <a href="/services" className="btn btn-outline mb-1">View All Services →</a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden reveal">
          {previews.map((svc, idx) => (
            <a
              key={svc.title}
              href="/services"
              className={`group relative overflow-hidden flex flex-col ${idx < previews.length - 1 ? 'border-r border-[var(--border)]' : ''} hover:z-10`}
            >
              {/* Photo */}
              <div className="aspect-[3/4] overflow-hidden bg-[var(--surface-2)]">
                <img
                  src={svc.photo}
                  alt={svc.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-600"
                />
              </div>

              {/* Info */}
              <div className="p-5 border-t border-[var(--border)] bg-[var(--bg)] flex flex-col gap-2">
                <div className="font-serif text-[1.1rem] font-normal text-[var(--text)] leading-tight">{svc.title}</div>
                <div className="flex items-center gap-3 text-[0.8125rem] text-[var(--text-muted)]">
                  <span className="font-serif text-lg text-[var(--text)]">{svc.price}</span>
                  <span className="text-[var(--border)]">|</span>
                  <span>{svc.duration}</span>
                </div>
                <span className="mt-1 text-[0.75rem] font-medium text-[var(--accent)] group-hover:text-[var(--accent-dark)] transition-colors">
                  Select →
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 text-center reveal">
          <a href="/services" className="btn btn-primary">See All 6 Services</a>
        </div>
      </div>
    </section>
  );
}