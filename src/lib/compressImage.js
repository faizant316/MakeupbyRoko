/**
 * Downscale + compress an image File in the browser before upload.
 *
 * Camera/phone photos are routinely 5-12MB, which exceeds Vercel's ~4.5MB
 * serverless request-body limit. When that happens the upload request is
 * rejected by the platform before our route even runs, so the user just sees
 * "upload failed." This shrinks the image to a sane max dimension and
 * re-encodes it as JPEG so it uploads fast and reliably. Falls back to the
 * original file on any error (e.g. HEIC, which most browsers can't decode).
 */
export async function compressImage(
  file,
  { maxDim = 1600, quality = 0.82, maxBytes = 3 * 1024 * 1024 } = {}
) {
  if (typeof window === 'undefined' || !file || !file.type?.startsWith('image/')) return file;
  // HEIC/HEIF can't be drawn to a canvas in most browsers — leave untouched.
  if (/heic|heif/i.test(file.type)) return file;
  // Already small enough to upload safely — no need to re-encode.
  if (file.size <= maxBytes) return file;

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
