import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { putImage, getObjectUrl, deleteImage, listRefs, sweepOrphanImages } from '../imageStore';
import { isIdbRef, IDB_REF_PREFIX } from '../imageRef';

let urlCounter = 0;
const revoked: string[] = [];

beforeEach(() => {
  urlCounter = 0;
  revoked.length = 0;
  vi.stubGlobal('URL', {
    createObjectURL: () => `blob:fake-${++urlCounter}`,
    revokeObjectURL: (url: string) => { revoked.push(url); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  indexedDB.deleteDatabase('monostart-images');
});

const blob = () => new Blob(['hello'], { type: 'image/webp' });

describe('imageStore', () => {
  it('putImage returns an idb ref and getObjectUrl resolves it', async () => {
    const ref = await putImage(blob());
    expect(isIdbRef(ref)).toBe(true);
    const url = await getObjectUrl(ref);
    expect(url).toMatch(/^blob:fake-/);
  });

  it('getObjectUrl memoizes one url per ref', async () => {
    const ref = await putImage(blob());
    const a = await getObjectUrl(ref);
    const b = await getObjectUrl(ref);
    expect(a).toBe(b);
    expect(urlCounter).toBe(1);
  });

  it('getObjectUrl rejects for a missing ref', async () => {
    await expect(getObjectUrl(`${IDB_REF_PREFIX}missing`)).rejects.toThrow();
  });

  it('deleteImage removes the blob and revokes its url', async () => {
    const ref = await putImage(blob());
    const url = await getObjectUrl(ref);
    await deleteImage(ref);
    expect(revoked).toContain(url);
    await expect(getObjectUrl(ref)).rejects.toThrow();
  });

  it('deleteImage ignores non-idb values', async () => {
    await expect(deleteImage('data:image/png;base64,ZZ')).resolves.toBeUndefined();
  });

  it('listRefs returns stored refs as idb-prefixed strings', async () => {
    const a = await putImage(blob());
    const b = await putImage(blob());
    const refs = await listRefs();
    expect(refs.sort()).toEqual([a, b].sort());
    expect(refs.every(isIdbRef)).toBe(true);
  });

  it('sweepOrphanImages deletes only unreferenced refs', async () => {
    const keep = await putImage(blob());
    const drop = await putImage(blob());
    const removed = await sweepOrphanImages(new Set([keep]));
    expect(removed).toBe(1);
    expect((await listRefs()).sort()).toEqual([keep]);
    await expect(getObjectUrl(drop)).rejects.toThrow();
  });
});
