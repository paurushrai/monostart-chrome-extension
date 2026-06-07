import type { GroupItem } from '../types';

export function disambiguateGroups(groups: readonly GroupItem[]): Array<{ id: string; title: string }> {
  const seenIds = new Set<string>();
  const unique = groups.filter((s) => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  const titleCounts: Record<string, number> = {};
  unique.forEach((s) => {
    const t = s.title?.trim() || 'Untitled';
    titleCounts[t] = (titleCounts[t] ?? 0) + 1;
  });

  const titleSeen: Record<string, number> = {};
  return unique.map((s) => {
    const t = s.title?.trim() || 'Untitled';
    if ((titleCounts[t] ?? 0) > 1) {
      titleSeen[t] = (titleSeen[t] ?? 0) + 1;
      return { id: s.id, title: `${t} #${titleSeen[t]}` };
    }
    return { id: s.id, title: t };
  });
}
