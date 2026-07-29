import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdminEmail } from './adminAllowlist';

// Gate for admin-only API routes. Every route that reads or mutates client data
// must call this first and return `authError` when present. It verifies there is
// a real Supabase session AND that the session's email is on the admin allowlist
// (see adminAllowlist.js) — a logged-in stranger is still turned away.
export async function requireAdmin() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return { authError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    return { session };
  } catch {
    return { authError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

// True when the caller is a signed-in admin, without turning anyone away.
// For routes that are public by design but should relax a client-facing rule
// for Roko — she books walk-ins and squeezes people in, and no lead-time rule
// meant for the public calendar should ever stop her own admin from doing that.
export async function isAdminRequest() {
  const { session } = await requireAdmin();
  return !!session;
}

// Allowed image MIME types and max size for uploads
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file) {
  if (!file) return 'No file provided';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Invalid file type. Only JPG, PNG, WebP allowed.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File too large. Maximum 10MB.';
  return null;
}
