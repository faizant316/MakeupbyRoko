/**
 * API client — wraps all Supabase/backend calls used across components.
 */

import { createClient } from '@/lib/supabase/client';

const apiFetch = async (url, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    const e = new Error(err.error || err.message || 'API error');
    e.status = res.status;
    e.data = err;
    throw e;
  }
  return res.json();
};

// camelCase → kebab-case  e.g. "sendBookingConfirmation" → "send-booking-confirmation"
const toKebab = (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

const makeEntity = (path) => ({
  list: (sort, limit) => apiFetch(`/api/${path}`),
  filter: (conditions) => {
    const params = new URLSearchParams();
    Object.entries(conditions || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    return apiFetch(`/api/${path}?${params}`);
  },
  create: (data) => apiFetch(`/api/${path}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/${path}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/${path}/${id}`, { method: 'DELETE' }),
});

export const api = {
  entities: {
    Booking: makeEntity('bookings'),
    BridalInquiry: makeEntity('bridal-inquiries'),
    Service: makeEntity('services'),
    Review: makeEntity('reviews'),
    ClassRegistration: makeEntity('class-registrations'),
    DayCapacity: makeEntity('day-capacities'),
    BlockedDate: makeEntity('blocked-dates'),
    AppSettings: makeEntity('app-settings'),
  },

  functions: {
    invoke: async (name, data) => {
      const endpoint = toKebab(name);
      const json = await apiFetch(`/api/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      });
      return { data: json };
    },
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);
        const json = await apiFetch('/api/upload-photo', { method: 'POST', body: formData });
        return { file_url: json.url };
      },
    },
  },

  auth: {
    me: async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw Object.assign(new Error('Not authenticated'), { status: 401 });
      return { ...user, role: 'admin', full_name: user.user_metadata?.full_name || user.email };
    },
    logout: async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
  },
};
