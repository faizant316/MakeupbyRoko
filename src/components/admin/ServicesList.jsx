import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ServiceFormModal from './ServiceFormModal';
import { Photo } from './Glyphs';
import { Button, Label, RowPanel, Tag, buttonClass, cx } from './ui';

const CATEGORY_LABELS = { bridal: 'Bridal', event: 'Event Glam', creative: 'Creative', lessons: 'Lessons' };

export default function ServicesList({ darkMode: dm }) {
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.entities.Service.list('sort_order', 50),
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
    mutationFn: (data) => api.entities.Service.create(data),
    onSuccess: () => { invalidateAll(); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Service.update(id, data),
    onSuccess: () => { invalidateAll(); setEditingService(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Service.delete(id),
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
    return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink-muted" /></div>;
  }

  const openNew = () => { setEditingService(null); setShowForm(true); };

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <Label className="tabular-nums">
          {services.length} service{services.length !== 1 ? 's' : ''}
        </Label>
        <Button variant="solid" size="sm" onClick={openNew} className="h-10 sm:h-9">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          Add service
        </Button>
      </div>

      {/* One row per service. Tap anywhere on a row to edit it. */}
      {services.length > 0 && (
        <RowPanel>
          {services.map(svc => (
            <div key={svc.id}
              role="button" tabIndex={0}
              onClick={() => { setEditingService(svc); setShowForm(true); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingService(svc); setShowForm(true); } }}
              className="group flex cursor-pointer items-center gap-3.5 px-4 py-3 outline-none transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5"
            >
              {/* Photo. Dimmed with the text when the service is switched off. */}
              <div className={cx('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-canvas sm:h-16 sm:w-16', !svc.is_active && 'opacity-50')}>
                {svc.photo ? (
                  <img src={svc.photo} alt={svc.title} className="h-full w-full object-cover" />
                ) : (
                  <Photo className="h-5 w-5 text-rose-soft" />
                )}
              </div>

              {/* Info */}
              <div className={cx('min-w-0 flex-1 overflow-hidden', !svc.is_active && 'opacity-60')}>
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="truncate text-[0.92rem] font-semibold text-ink">{svc.title}</h4>
                  {!svc.is_active && <Tag>Inactive</Tag>}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8rem] tabular-nums text-ink-muted">
                  <Tag>{CATEGORY_LABELS[svc.category] || svc.category}</Tag>
                  {/* Price and length wrap as one, so a dot never ends a line. */}
                  <span className="max-w-full truncate">
                    <span className="text-ink-soft">{svc.price}</span>
                    <span aria-hidden className="mx-1.5 text-line-strong">·</span>
                    {svc.duration}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1.5">
                {deleteConfirm === svc.id ? (
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => deleteMutation.mutate(svc.id)}
                      className={buttonClass('alert', 'sm')}>
                      Delete
                    </button>
                    <Button size="sm" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button type="button" onClick={e => { e.stopPropagation(); setDeleteConfirm(svc.id); }}
                    aria-label="Delete service"
                    className="press flex h-9 w-9 items-center justify-center rounded-ctl text-ink-muted transition-colors hover:bg-tone-alert/[0.06] hover:text-tone-alert focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" aria-hidden>
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                )}
                {/* Chevron: the row opens */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-ink-muted/60 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </div>
          ))}
        </RowPanel>
      )}

      {services.length === 0 && (
        <div className="rounded-card border border-line bg-paper px-5 py-14 text-center">
          <p className="mb-4 text-[0.86rem] text-ink-muted">No services yet</p>
          <Button variant="solid" onClick={openNew}>
            Create your first service
          </Button>
        </div>
      )}

      {/* Form sheet */}
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
