'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// A red bar at the top of the dashboard whenever something has failed.
//
// The bridal inquiry bug was invisible for six days because a failure had
// nowhere to appear. Roko opens this dashboard every day; if something is
// dropping client data, it belongs here, above the work, not in a log.
//
// Deliberately not dismissible-by-default: it clears when the problem is
// marked handled, so it can't be swiped away and forgotten.
const RED = '#B42318';

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function SystemAlertBanner({ dm }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/system-alerts');
      return res.ok ? res.json() : [];
    },
    // Something breaking mid-session should surface without a reload: she may
    // sit on this dashboard for hours.
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const resolve = useMutation({
    mutationFn: async (body) => fetch('/api/system-alerts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-alerts'] }),
  });

  if (!alerts.length) return null;

  const critical = alerts.filter(a => a.severity === 'critical').length;
  const headline = alerts.length === 1
    ? alerts[0].message
    : `${alerts.length} problems need attention${critical ? `, ${critical} critical` : ''}.`;

  return (
    <div className="mb-5 rounded-[12px] overflow-hidden"
      style={{ background: dm ? 'rgba(180,35,24,0.12)' : '#FEF3F2', border: `1px solid ${dm ? 'rgba(180,35,24,0.35)' : '#FDA29B'}` }}>
      <div className="px-4 py-3.5 flex items-start gap-3">
        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: RED }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" className="w-3.5 h-3.5">
            <line x1="12" y1="7" x2="12" y2="13" /><line x1="12" y1="17" x2="12" y2="17" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8rem] font-semibold" style={{ color: dm ? '#FDA29B' : RED }}>
            Something isn&apos;t working
          </p>
          <p className="text-[0.76rem] leading-[1.55] mt-1" style={{ color: dm ? '#e8b4ae' : '#912018' }}>
            {headline}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
            <button type="button" onClick={() => setExpanded(v => !v)}
              className="text-[0.72rem] font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: dm ? '#FDA29B' : RED }}>
              {expanded ? 'Hide details' : `Show details (${alerts.length})`}
            </button>
            <button type="button" onClick={() => resolve.mutate({ all: true })} disabled={resolve.isPending}
              className="text-[0.72rem] font-medium transition-opacity hover:opacity-70"
              style={{ color: dm ? '#c99a95' : '#A1544D' }}>
              Mark all handled
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${dm ? 'rgba(180,35,24,0.28)' : '#FDA29B'}` }}>
          {alerts.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-3"
              style={{ borderBottom: `1px solid ${dm ? 'rgba(180,35,24,0.15)' : '#FEE4E2'}` }}>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#c99a95' : '#A1544D' }}>
                  {a.source} · {timeAgo(a.created_at)}
                </p>
                <p className="text-[0.76rem] leading-[1.55] mt-1" style={{ color: dm ? '#e8b4ae' : '#912018' }}>{a.message}</p>
                {a.context && Object.keys(a.context).length > 0 && (
                  <p className="text-[0.68rem] leading-[1.5] mt-1.5 font-mono break-words" style={{ color: dm ? '#a88' : '#B4756E' }}>
                    {Object.entries(a.context)
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v ?? '')}`)
                      .join('  ·  ')}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => resolve.mutate({ id: a.id })} disabled={resolve.isPending}
                className="text-[0.7rem] font-medium flex-shrink-0 transition-opacity hover:opacity-70"
                style={{ color: dm ? '#c99a95' : '#A1544D' }}>
                Handled
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
