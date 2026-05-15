import ServiceFAQ from './ServiceFAQ';

export default function ServiceDetails({ service }) {
  if (!service) return null;

  return (
    <div className="space-y-6 mt-6 pt-6 border-t border-[#e8e2dc]">
      {/* Key Features */}
      {service.key_features && service.key_features.length > 0 && (
        <div>
          <h4 className="font-serif text-[1rem] text-[#111] mb-3">Key Features</h4>
          <ul className="space-y-2">
            {service.key_features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[0.85rem] text-[#666]">
                <span className="text-[#D4A0B0] mt-0.5 flex-shrink-0">✦</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What to Expect */}
      {service.what_to_expect && (
        <div>
          <h4 className="font-serif text-[1rem] text-[#111] mb-3">What to Expect</h4>
          <p className="text-[0.85rem] text-[#666] leading-[1.7]">{service.what_to_expect}</p>
        </div>
      )}

      {/* Before & After Gallery */}
      {service.before_after_photos && service.before_after_photos.length > 0 && (
        <div>
          <h4 className="font-serif text-[1rem] text-[#111] mb-3">Before & After</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {service.before_after_photos.map((photo, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-lg overflow-hidden bg-[#f5f5f5] border border-[#e8e2dc] hover:shadow-md transition-shadow"
              >
                <img
                  src={photo}
                  alt={`Before & After ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <ServiceFAQ service={service} />
    </div>
  );
}