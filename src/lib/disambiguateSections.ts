import type { Section } from '../types';

export function disambiguateSections(sections: readonly Section[]): Array<{ id: string; title: string }> {
  const seenIds = new Set<string>();
  const unique = sections.filter((s) => {
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
