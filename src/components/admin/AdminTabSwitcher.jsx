const TABS = [
  { key: 'bookings', label: 'Appointments', icon: '📅' },
  { key: 'services', label: 'Services', icon: '✦' },
  { key: 'reviews', label: 'Reviews', icon: '⭐' },
  { key: 'classes', label: 'Class Sign-Ups', icon: '💄' },
  { key: 'reports', label: 'Reports', icon: '📊' },
];

export default function AdminTabSwitcher({ activeTab, setActiveTab, darkMode: dm }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-8">
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all duration-200"
            style={{
              background: isActive
                ? dm ? '#D4A0B0' : '#111'
                : dm ? '#26262e' : '#fff',
              border: `1px solid ${isActive
                ? dm ? '#D4A0B0' : '#111'
                : dm ? '#3a3a48' : '#E2E4EA'}`,
              boxShadow: isActive ? '0 2px 12px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <span className="text-[1rem] leading-none flex-shrink-0">{tab.icon}</span>
            <span
              className="text-[0.72rem] font-semibold tracking-[0.04em] leading-tight"
              style={{ color: isActive ? (dm ? '#1e1e24' : '#fff') : dm ? '#71717a' : '#888' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}