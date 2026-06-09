import { IDB_REF_PREFIX, isIdbRef, findOrphanRefs } from './imageRef';

const DB_NAME = 'monostart-images';
const DB_VERSION = 1;
const STORE = 'images';

const objectUrlCache = new Map<string, string>();

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });

const runTx = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    const fail = (error: DOMException | null, fallback: string): void => {
      db.close();
      reject(error ?? new Error(fallback));
    };
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => fail(tx.error, 'IndexedDB transaction failed');
    tx.onabort = () => fail(tx.error, 'IndexedDB transaction aborted');
    request.onerror = () => fail(request.error, 'IndexedDB request failed');
  });
};

const refToKey = (ref: string): string => ref.slice(IDB_REF_PREFIX.length);

export const putImage = async (data: Blob): Promise<string> => {
  const key = crypto.randomUUID();
  await runTx('readwrite', (store) => store.put(data, key));
  return `${IDB_REF_PREFIX}${key}`;
};

export const getObjectUrl = async (ref: string): Promise<string> => {
  const cached = objectUrlCache.get(ref);
  if (cached) return cached;
  const data = await runTx<Blob | undefined>('readonly', (store) => store.get(refToKey(ref)));
  if (!data) throw new Error(`Image not found: ${ref}`);
  const url = URL.createObjectURL(data);
  objectUrlCache.set(ref, url);
  return url;
};

export const deleteImage = async (ref: string): Promise<void> => {
  if (!isIdbRef(ref)) return;
  await runTx('readwrite', (store) => store.delete(refToKey(ref)));
  const url = objectUrlCache.get(ref);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(ref);
  }
};

export const listRefs = async (): Promise<string[]> => {
  const keys = await runTx<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
  return keys.map((key) => `${IDB_REF_PREFIX}${String(key)}`);
};

export const sweepOrphanImages = async (referenced: ReadonlySet<string>): Promise<number> => {
  const stored = await listRefs();
  const orphans = findOrphanRefs(stored, referenced);
  await Promise.all(orphans.map((ref) => deleteImage(ref)));
  return orphans.length;
};
