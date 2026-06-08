export const MAX_EDGE_PX = 2560;
const WEBP_QUALITY = 0.85;

export interface Dimensions {
  width: number;
  height: number;
}

// Scale so the longest edge is at most MAX_EDGE_PX; never upscale.
export const fitWithinMaxEdge = ({ width, height }: Dimensions): Dimensions => {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE_PX) return { width, height };
  const scale = MAX_EDGE_PX / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

export const downscaleImage = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithinMaxEdge({ width: bitmap.width, height: bitmap.height });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => (out ? resolve(out) : reject(new Error('Canvas toBlob returned null'))),
        'image/webp',
        WEBP_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
};
