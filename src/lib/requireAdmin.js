import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { authError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    return { session };
  } catch {
    return { authError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

// Allowed image MIME types and max size for uploads
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file) {
  if (!file) return 'No file provided';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Invalid file type. Only JPG, PNG, WebP allowed.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File too large. Maximum 10MB.';
  return null;
}
