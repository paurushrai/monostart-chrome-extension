import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../downscaleImage', () => ({
  downscaleImage: vi.fn(),
}));
vi.mock('../imageStore', () => ({
  putImage: vi.fn(),
}));

import { processImageUpload, MAX_UPLOAD_BYTES } from '../processImageUpload';
import { downscaleImage } from '../downscaleImage';
import { putImage } from '../imageStore';

const fileOfSize = (bytes: number): File => {
  const file = new File(['x'], 'photo.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

afterEach(() => vi.clearAllMocks());

describe('processImageUpload', () => {
  it('rejects files larger than 10MB', async () => {
    await expect(processImageUpload(fileOfSize(MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/10MB/);
  });

  it('downscales and stores, returning an idb ref value', async () => {
    vi.mocked(downscaleImage).mockResolvedValue(new Blob(['z'], { type: 'image/webp' }));
    vi.mocked(putImage).mockResolvedValue('idb:generated');
    const result = await processImageUpload(fileOfSize(5 * 1024 * 1024));
    expect(result.value).toBe('idb:generated');
    expect(downscaleImage).toHaveBeenCalledOnce();
  });

  it('throws the 1.5MB error when downscale fails and the file is too big to inline', async () => {
    vi.mocked(downscaleImage).mockRejectedValue(new Error('no canvas'));
    await expect(processImageUpload(fileOfSize(3 * 1024 * 1024))).rejects.toThrow(/1.5MB/);
  });
});
