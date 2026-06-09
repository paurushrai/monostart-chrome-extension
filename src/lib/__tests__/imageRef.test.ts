import { describe, expect, it } from 'vitest';
import { isIdbRef, collectReferencedRefs, findOrphanRefs, IDB_REF_PREFIX } from '../imageRef';
import type { WidgetItem, DashboardBackground } from '../../types';

const imageWidget = (id: string, url?: string): WidgetItem =>
  ({ id, type: 'image', title: 'x', url } as WidgetItem);

describe('isIdbRef', () => {
  it('returns true only for idb-prefixed strings', () => {
    expect(isIdbRef(`${IDB_REF_PREFIX}abc`)).toBe(true);
    expect(isIdbRef('data:image/png;base64,AAAA')).toBe(false);
    expect(isIdbRef('https://example.com/a.png')).toBe(false);
    expect(isIdbRef(undefined)).toBe(false);
    expect(isIdbRef('')).toBe(false);
  });
});

describe('collectReferencedRefs', () => {
  it('gathers idb refs from image widgets and an image background', () => {
    const items = [
      imageWidget('1', `${IDB_REF_PREFIX}a`),
      imageWidget('2', 'data:image/png;base64,ZZ'),
      imageWidget('3', undefined),
      { id: '4', type: 'note', title: 'n' } as WidgetItem,
    ];
    const background: DashboardBackground = { type: 'image', value: `${IDB_REF_PREFIX}b` };
    const refs = collectReferencedRefs(items, background);
    expect([...refs].sort()).toEqual([`${IDB_REF_PREFIX}a`, `${IDB_REF_PREFIX}b`]);
  });

  it('ignores non-image backgrounds and missing background', () => {
    const items = [imageWidget('1', `${IDB_REF_PREFIX}a`)];
    expect(collectReferencedRefs(items, { type: 'color', value: '#fff' })).toEqual(
      new Set([`${IDB_REF_PREFIX}a`]),
    );
    expect(collectReferencedRefs(items, undefined)).toEqual(new Set([`${IDB_REF_PREFIX}a`]));
  });
});

describe('findOrphanRefs', () => {
  it('returns stored idb refs not present in the referenced set', () => {
    const stored = [`${IDB_REF_PREFIX}a`, `${IDB_REF_PREFIX}b`, `${IDB_REF_PREFIX}c`];
    const referenced = new Set([`${IDB_REF_PREFIX}b`]);
    expect(findOrphanRefs(stored, referenced)).toEqual([`${IDB_REF_PREFIX}a`, `${IDB_REF_PREFIX}c`]);
  });

  it('never returns non-idb values', () => {
    const stored = ['data:image/png;base64,ZZ', `${IDB_REF_PREFIX}a`];
    expect(findOrphanRefs(stored, new Set())).toEqual([`${IDB_REF_PREFIX}a`]);
  });
});
