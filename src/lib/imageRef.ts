import type { WidgetItem, DashboardBackground } from '../types';

export const IDB_REF_PREFIX = 'idb:';

export const isIdbRef = (value: string | undefined): value is string =>
  typeof value === 'string' && value.startsWith(IDB_REF_PREFIX);

// Image widgets are always top-level (groups nest only LinkItems), so no
// recursion into groups is needed to find every referenced image.
export const collectReferencedRefs = (
  items: readonly WidgetItem[],
  background: DashboardBackground | undefined,
): Set<string> => {
  const refs = new Set<string>();
  for (const item of items) {
    if (item.type === 'image' && isIdbRef(item.url)) refs.add(item.url);
  }
  if (background?.type === 'image' && isIdbRef(background.value)) refs.add(background.value);
  return refs;
};

export const findOrphanRefs = (
  storedRefs: readonly string[],
  referenced: ReadonlySet<string>,
): string[] => storedRefs.filter((ref) => isIdbRef(ref) && !referenced.has(ref));
