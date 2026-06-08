import { downscaleImage } from './downscaleImage';
import { putImage } from './imageStore';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const FALLBACK_MAX_BYTES = 1.5 * 1024 * 1024;

export interface UploadResult {
  // Value to persist in ImageItem.url / DashboardBackground.value:
  // an `idb:` ref on the happy path, or a base64 data URL on fallback.
  value: string;
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader did not return a string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });

// Validate, downscale, and store an upload. Falls back to a base64 data URL
// (capped at 1.5MB) when downscale or IndexedDB is unavailable, so behavior is
// never worse than the legacy path.
export const processImageUpload = async (file: File): Promise<UploadResult> => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be smaller than 10MB.');
  }
  try {
    const blob = await downscaleImage(file);
    return { value: await putImage(blob) };
  } catch {
    if (file.size > FALLBACK_MAX_BYTES) {
      throw new Error("Couldn't save this image. Try one smaller than 1.5MB.");
    }
    return { value: await readAsDataUrl(file) };
  }
};
