import { describe, it, expect } from 'vitest';
import { buildImport, collectFolders, extractNamedRoots, type BookmarkTreeNodeLike } from '../bookmarkImport';
import type { LinkItem, Section, RegularLink } from '../../types';

const bookmark = (id: string, title: string, url: string): BookmarkTreeNodeLike => ({ id, title, url });
const folder = (id: string, title: string, children: BookmarkTreeNodeLike[]): BookmarkTreeNodeLike => ({ id, title, children });

// Mimics the named-roots array (Bookmarks Bar, Other Bookmarks) — what readBookmarkTree returns.
const tree = (...rootChildren: BookmarkTreeNodeLike[]): BookmarkTreeNodeLike[] => [
  { id: '1', title: 'Bookmarks Bar', children: rootChildren },
];

describe('collectFolders', () => {
  it('separates top-level folders from direct (Other) bookmarks', () => {
    const t = tree(
      folder('f1', 'Work', [bookmark('b1', 'Site A', 'https://a.com')]),
      bookmark('b2', 'Direct', 'https://direct.com'),
    );
    const result = collectFolders(t);
    expect(result.folders).toHaveLength(1);
    expect(result.folders[0]!.title).toBe('Work');
    expect(result.folders[0]!.bookmarks).toEqual([{ title: 'Site A', url: 'https://a.com' }]);
    expect(result.otherBookmarks).toEqual([{ title: 'Direct', url: 'https://direct.com' }]);
  });

  it('flattens nested folders into the top-level section', () => {
    const t = tree(
      folder('f1', 'Work', [
        bookmark('b1', 'Site A', 'https://a.com'),
        folder('f2', 'Projects', [
          bookmark('b2', 'Site B', 'https://b.com'),
          bookmark('b3', 'Site C', 'https://c.com'),
        ]),
      ]),
    );
    const result = collectFolders(t);
    expect(result.folders).toHaveLength(1);
    expect(result.folders[0]!.bookmarks.map((b) => b.url)).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ]);
  });

  it('skips empty folders', () => {
    const t = tree(
      folder('f1', 'Empty', []),
      folder('f2', 'Has Content', [bookmark('b1', 'A', 'https://a.com')]),
    );
    const result = collectFolders(t);
    expect(result.folders.map((f) => f.title)).toEqual(['Has Content']);
  });

  it('dedupes by URL across nested folders', () => {
    const t = tree(
      folder('f1', 'Work', [
        bookmark('b1', 'A', 'https://a.com'),
        folder('f2', 'Sub', [bookmark('b2', 'A dupe', 'https://a.com')]),
      ]),
    );
    const result = collectFolders(t);
    expect(result.folders[0]!.bookmarks).toHaveLength(1);
  });

  it('merges children from multiple roots (Bookmarks Bar + Other Bookmarks)', () => {
    const namedRoots: BookmarkTreeNodeLike[] = [
      { id: '1', title: 'Bookmarks Bar', children: [folder('f1', 'Bar Folder', [bookmark('b1', 'A', 'https://a.com')])] },
      { id: '2', title: 'Other Bookmarks', children: [folder('f2', 'Other Folder', [bookmark('b2', 'B', 'https://b.com')])] },
    ];
    const result = collectFolders(namedRoots);
    expect(result.folders.map((f) => f.title)).toEqual(['Bar Folder', 'Other Folder']);
  });

  it('uses hostname when title is empty', () => {
    const t = tree(bookmark('b1', '', 'https://example.com/path'));
    const result = collectFolders(t);
    expect(result.otherBookmarks[0]!.title).toBe('example.com');
  });
});

describe('extractNamedRoots', () => {
  it('unwraps the unnamed wrapper root returned by chrome.bookmarks.getTree', () => {
    const raw: BookmarkTreeNodeLike[] = [
      {
        id: '0', title: '', children: [
          { id: '1', title: 'Bookmarks Bar', children: [] },
          { id: '2', title: 'Other Bookmarks', children: [] },
        ],
      },
    ];
    const out = extractNamedRoots(raw);
    expect(out.map((n) => n.title)).toEqual(['Bookmarks Bar', 'Other Bookmarks']);
  });

  it('returns the input as-is when roots are already named', () => {
    const namedRoots: BookmarkTreeNodeLike[] = [
      { id: '1', title: 'Bookmarks Bar', children: [] },
    ];
    expect(extractNamedRoots(namedRoots)).toEqual(namedRoots);
  });
});

describe('buildImport', () => {
  it('creates sections for each folder + Other section for direct bookmarks', () => {
    const existing: LinkItem[] = [];
    const t = tree(
      folder('f1', 'Work', [bookmark('b1', 'A', 'https://a.com')]),
      bookmark('b2', 'Direct', 'https://direct.com'),
    );
    const result = buildImport(existing, t);
    expect(result.sectionsCreated).toBe(2);
    expect(result.sectionsMerged).toBe(0);
    expect(result.bookmarksImported).toBe(2);

    const sections = result.links.filter((l): l is Section => l.type === 'section');
    expect(sections.map((s) => s.title)).toEqual(['Work', 'Other']);
    expect(sections[0]!.links).toHaveLength(1);
    expect(sections[1]!.links).toHaveLength(1);
  });

  it('merges into existing section when title matches', () => {
    const existingSection: Section = {
      id: 'sec-1',
      type: 'section',
      title: 'Work',
      borderColor: '200 73% 52%',
      cols: 3,
      links: [{
        id: 'L0', type: 'link', url: 'https://existing.com', title: 'Existing',
        viewMode: 'icon', w: 1, h: 1, x: 0, y: 0, parentId: 'sec-1',
      }],
      x: 0, y: 0, w: 4, h: 4,
    };
    const t = tree(folder('f1', 'Work', [bookmark('b1', 'A', 'https://a.com')]));
    const result = buildImport([existingSection], t);

    expect(result.sectionsCreated).toBe(0);
    expect(result.sectionsMerged).toBe(1);
    const updated = result.links.find((l) => l.id === 'sec-1') as Section;
    expect(updated.links.map((l) => l.url)).toEqual(['https://existing.com', 'https://a.com']);
  });

  it('skips merging bookmarks that already exist by URL in the matching section', () => {
    const existingSection: Section = {
      id: 'sec-1',
      type: 'section',
      title: 'Work',
      borderColor: '200 73% 52%',
      cols: 3,
      links: [{
        id: 'L0', type: 'link', url: 'https://a.com', title: 'Dup',
        viewMode: 'icon', w: 1, h: 1, x: 0, y: 0, parentId: 'sec-1',
      }],
      x: 0, y: 0, w: 4, h: 4,
    };
    const t = tree(folder('f1', 'Work', [
      bookmark('b1', 'A', 'https://a.com'),
      bookmark('b2', 'New', 'https://new.com'),
    ]));
    const result = buildImport([existingSection], t);
    expect(result.sectionsMerged).toBe(1);
    expect(result.bookmarksImported).toBe(1);
    const updated = result.links.find((l) => l.id === 'sec-1') as Section;
    expect(updated.links).toHaveLength(2);
  });

  it('imports zero when bookmark tree has no folders and no direct bookmarks', () => {
    const result = buildImport([], tree());
    expect(result.sectionsCreated).toBe(0);
    expect(result.bookmarksImported).toBe(0);
    expect(result.links).toEqual([]);
  });

  it('skips Other section creation when no direct bookmarks exist', () => {
    const t = tree(folder('f1', 'Work', [bookmark('b1', 'A', 'https://a.com')]));
    const result = buildImport([], t);
    const titles = result.links.filter((l): l is Section => l.type === 'section').map((s) => s.title);
    expect(titles).toEqual(['Work']);
  });

  it('places new sections in different grid slots', () => {
    const t = tree(
      folder('f1', 'A', [bookmark('b1', '1', 'https://1.com')]),
      folder('f2', 'B', [bookmark('b2', '2', 'https://2.com')]),
      folder('f3', 'C', [bookmark('b3', '3', 'https://3.com')]),
    );
    const result = buildImport([], t);
    const sections = result.links.filter((l): l is Section => l.type === 'section');
    const positions = sections.map((s) => `${s.x},${s.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('extends grid downward and never stacks when existing layout fills MAIN_ROWS', () => {
    // Saturate rows 0..11 with 4-wide × 4-tall sections (MAIN_COLS=18 → 4 per row)
    const filler: Section[] = [];
    let id = 0;
    for (let y = 0; y < 12; y += 4) {
      for (let x = 0; x + 4 <= 18; x += 4) {
        filler.push({
          id: `pre-${id++}`,
          type: 'section',
          title: `Pre ${id}`,
          borderColor: '0 0% 50%',
          cols: 3,
          links: [],
          x, y, w: 4, h: 4,
        });
      }
    }
    const t = tree(
      folder('f1', 'A', [bookmark('b1', '1', 'https://1.com')]),
      folder('f2', 'B', [bookmark('b2', '2', 'https://2.com')]),
      folder('f3', 'C', [bookmark('b3', '3', 'https://3.com')]),
    );
    const result = buildImport(filler, t);
    const newSections = result.links
      .filter((l): l is Section => l.type === 'section' && !l.id.startsWith('pre-'));
    expect(newSections).toHaveLength(3);

    const positions = newSections.map((s) => `${s.x},${s.y}`);
    expect(new Set(positions).size).toBe(positions.length);

    // All new sections sit at y >= 12 (below the saturated region)
    for (const s of newSections) {
      expect(s.y).toBeGreaterThanOrEqual(12);
    }

    // First new section id is surfaced for scroll-to behavior
    expect(result.firstNewSectionId).toBe(newSections[0]!.id);
  });

  it('assigns intra-section x/y so links flow left-to-right in rows of 3', () => {
    const t = tree(folder('f1', 'Work', [
      bookmark('b1', '1', 'https://1.com'),
      bookmark('b2', '2', 'https://2.com'),
      bookmark('b3', '3', 'https://3.com'),
      bookmark('b4', '4', 'https://4.com'),
    ]));
    const result = buildImport([], t);
    const section = result.links.find((l): l is Section => l.type === 'section')!;
    expect(section.links.map((l): RegularLink => l).map((l) => ({ x: l.x, y: l.y }))).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 },
    ]);
  });
});
