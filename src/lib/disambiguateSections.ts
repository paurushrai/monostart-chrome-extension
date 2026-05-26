import type { Section } from '../types';

/**
 * Produces a display-ready section list: dedupes by id (defensive against
 * any data-layer bug that double-counts), falls back to "Untitled" for
 * empty titles, and suffixes identically-titled sections with #1, #2, ...
 * so users can pick them apart in dropdowns.
 */
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
