import { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ServiceFormModal from './ServiceFormModal';

const CATEGORY_LABELS = { bridal: 'Bridal', event: 'Event Glam', creative: 'Creative', lessons: 'Lessons' };

export default function ServicesList({ darkMode: dm }) {
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => base44.entities.Service.list('sort_order', 50),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    queryClient.invalidateQueries({ queryKey: ['public-services'] });
    queryClient.invalidateQueries({ queryKey: ['public-services-modal'] });
    queryClient.invalidateQueries({ queryKey: ['public-services-review'] });
    queryClient.invalidateQueries({ queryKey: ['admin-services-edit'] });
    queryClient.invalidateQueries({ queryKey: ['bridal-service'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Service.create(data),
    onSuccess: () => { invalidateAll(); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Service.update(id, data),
    onSuccess: () => { invalidateAll(); setEditingService(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Service.delete(id),
    onSuccess: () => { invalidateAll(); setDeleteConfirm(null); },
  });

  const handleSave = async (data) => {
    if (editingService) {
      await updateMutation.mutateAsync({ id: editingService.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#e4ddd7] border-t-[#111] rounded-full animate-spin" /></div>;
  }

  const cardBg = dm ? '#26262e' : '#fff';
  const cardBorder = dm ? '#3a3a48' : '#e4ddd7';
  const titleColor = dm ? '#e4e4e7' : '#111';
  const mutedColor = dm ? '#71717a' : '#999';
  const tagBg = dm ? '#1e1e24' : '#FAF8F6';
  const tagColor = dm ? '#a1a1aa' : '#888';
  const actionBorder = dm ? '#3a3a48' : '#e4ddd7';
  const actionIcon = dm ? '#71717a' : '#999';
  const actionIconHover = dm ? '#e4e4e7' : '#111';
  const inactiveBg = dm ? '#3a3a48' : '#f5f5f5';
  const inactiveColor = dm ? '#71717a' : '#aaa';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999]">
            {services.length} service{services.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => { setEditingService(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#111] text-white text-[0.7rem] font-medium tracking-[0.06em] uppercase rounded-lg hover:bg-[#333] transition-all shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Service
        </button>
      </div>

      {/* Services grid */}
      <div className="flex flex-col gap-3">
        {services.map(svc => (
          <div key={svc.id}
            className={`rounded-xl p-4 flex items-center gap-3 transition-all hover:shadow-sm ${!svc.is_active ? 'opacity-50' : ''}`}
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            {/* Photo */}
            {svc.photo ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: dm ? '#3a3a48' : '#f5f5f5' }}>
                <img src={svc.photo} alt={svc.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tagBg }}>
                <span className="text-[#D4A0B0] text-lg">✦</span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-[0.9rem] font-medium truncate" style={{ color: titleColor }}>{svc.title}</h4>
                {!svc.is_active && (
                  <span className="px-2 py-0.5 text-[0.55rem] font-semibold tracking-[0.1em] uppercase rounded-full"
                    style={{ background: inactiveBg, color: inactiveColor }}>Inactive</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[0.75rem] flex-wrap" style={{ color: mutedColor }}>
                <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium whitespace-nowrap"
                  style={{ background: tagBg, color: tagColor }}>
                  {CATEGORY_LABELS[svc.category] || svc.category}
                </span>
                <span className="whitespace-nowrap">{svc.price}</span>
                <span style={{ color: dm ? '#52525b' : '#ddd' }}>·</span>
                <span className="whitespace-nowrap">{svc.duration}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { setEditingService(svc); setShowForm(true); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ border: `1px solid ${actionBorder}`, color: actionIcon }}
                onMouseEnter={e => { e.currentTarget.style.color = actionIconHover; e.currentTarget.style.borderColor = dm ? '#71717a' : '#bbb'; }}
                onMouseLeave={e => { e.currentTarget.style.color = actionIcon; e.currentTarget.style.borderColor = actionBorder; }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              {deleteConfirm === svc.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => deleteMutation.mutate(svc.id)}
                    className="px-2.5 py-1.5 text-[0.6rem] font-medium uppercase bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    Delete
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="px-2.5 py-1.5 text-[0.6rem] font-medium uppercase rounded-lg transition-colors"
                    style={{ color: mutedColor, border: `1px solid ${actionBorder}` }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(svc.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ border: `1px solid ${actionBorder}`, color: dm ? '#52525b' : '#ccc' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = dm ? '#52525b' : '#ccc'; e.currentTarget.style.borderColor = actionBorder; }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[0.85rem] text-[#bbb] mb-4">No services yet</p>
          <button onClick={() => { setEditingService(null); setShowForm(true); }}
            className="px-5 py-2.5 bg-[#111] text-white text-[0.75rem] font-medium rounded-lg hover:bg-[#333] transition-all">
            Create Your First Service
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ServiceFormModal
          service={editingService}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingService(null); }}
          darkMode={dm}
        />
      )}
    </div>
  );
}