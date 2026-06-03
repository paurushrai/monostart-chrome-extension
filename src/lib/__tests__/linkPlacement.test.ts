import { describe, it, expect } from 'vitest';
import {
  removeLinkAnywhere,
  placeInHeader,
  placeInGroup,
  placeOnMain,
} from '../linkPlacement';
import type { WidgetItem, RegularLink, Group } from '../../types';

const linkAt = (id: string, x: number, y: number, extra: Partial<RegularLink> = {}): RegularLink => ({
  id,
  type: 'link',
  url: `https://example.com/${id}`,
  title: id,
  x,
  y,
  w: 1,
  h: 1,
  ...extra,
});

const group = (id: string, links: RegularLink[] = [], cols = 3): Group => ({
  id,
  type: 'group',
  title: `Group ${id}`,
  borderColor: '200 73% 52%',
  cols,
  links,
});

describe('removeLinkAnywhere', () => {
  it('removes a top-level link', () => {
    const links: WidgetItem[] = [linkAt('a', 0, 0), linkAt('b', 1, 0)];
    const { cleanedLinks, foundLink } = removeLinkAnywhere(links, 'a');
    expect(foundLink?.id).toBe('a');
    expect(cleanedLinks.map((l) => l.id)).toEqual(['b']);
  });

  it('removes a link nested inside a group', () => {
    const links: WidgetItem[] = [
      group('s1', [linkAt('a', 0, 0), linkAt('b', 1, 0)]),
    ];
    const { cleanedLinks, foundLink } = removeLinkAnywhere(links, 'a');
    expect(foundLink?.id).toBe('a');
    expect((cleanedLinks[0] as Group).links.map((l) => l.id)).toEqual(['b']);
  });

  it('returns foundLink=null when id is missing', () => {
    const { foundLink } = removeLinkAnywhere([linkAt('a', 0, 0)], 'missing');
    expect(foundLink).toBeNull();
  });

  it('does not mutate the input array', () => {
    const links: WidgetItem[] = [linkAt('a', 0, 0)];
    removeLinkAnywhere(links, 'a');
    expect(links).toHaveLength(1);
  });
});

describe('placeInHeader', () => {
  it('appends link with isHeaderLink=true and next order', () => {
    const links: WidgetItem[] = [
      { ...linkAt('h1', 0, 0), isHeaderLink: true, order: 0 },
      { ...linkAt('h2', 0, 0), isHeaderLink: true, order: 1 },
    ];
    const result = placeInHeader(links, linkAt('new', 0, 0));
    const placed = result[result.length - 1]!;
    expect(placed.isHeaderLink).toBe(true);
    expect(placed.order).toBe(2);
    expect(placed.x).toBeUndefined();
    expect(placed.y).toBeUndefined();
  });

  it('starts order at 0 when no existing header links', () => {
    const result = placeInHeader([], linkAt('new', 0, 0));
    expect(result[0]!.order).toBe(0);
  });
});

describe('placeInGroup', () => {
  it('appends link to the target group', () => {
    const links: WidgetItem[] = [group('s1')];
    const result = placeInGroup(links, linkAt('new', 0, 0), 's1');
    const target = result[0] as Group;
    expect(target.links).toHaveLength(1);
    expect(target.links[0]!.id).toBe('new');
  });

  it('places at targetCoords when provided (clamped to group bounds)', () => {
    const links: WidgetItem[] = [group('s1')];
    const result = placeInGroup(links, linkAt('new', 99, 99), 's1', { x: 5, y: 2 });
    const placed = (result[0] as Group).links[0]!;
    // cols=3 with w=1 → max x = 2
    expect(placed.x).toBe(2);
    expect(placed.y).toBe(2);
  });

  it('clamps link width to group cols', () => {
    const links: WidgetItem[] = [group('s1', [], 2)];
    const result = placeInGroup(links, { ...linkAt('new', 0, 0), w: 6, h: 1 }, 's1');
    expect((result[0] as Group).links[0]!.w).toBe(2);
  });

  it('finds next free slot when targetCoords is omitted', () => {
    const links: WidgetItem[] = [group('s1', [linkAt('existing', 0, 0)])];
    const result = placeInGroup(links, linkAt('new', 0, 0), 's1');
    const placed = (result[0] as Group).links.find((l) => l.id === 'new');
    expect(placed?.x).toBe(1);
    expect(placed?.y).toBe(0);
  });

  it('leaves non-target groups untouched', () => {
    const links: WidgetItem[] = [group('s1'), group('s2')];
    const result = placeInGroup(links, linkAt('new', 0, 0), 's2');
    expect((result[0] as Group).links).toHaveLength(0);
    expect((result[1] as Group).links).toHaveLength(1);
  });
});

describe('placeOnMain', () => {
  it('places at targetCoords when provided', () => {
    const result = placeOnMain([], linkAt('new', 0, 0), { x: 5, y: 3 });
    const placed = result[result.length - 1]!;
    expect(placed.x).toBe(5);
    expect(placed.y).toBe(3);
  });

  it('finds free slot when targetCoords is omitted', () => {
    const occupied: WidgetItem[] = [linkAt('a', 0, 0)]; // a 1×1 at (0,0)
    const result = placeOnMain(occupied, linkAt('new', 99, 99));
    const placed = result[result.length - 1]!;
    expect(placed.x).toBe(1);
    expect(placed.y).toBe(0);
  });

  it('always returns isHeaderLink=false on main', () => {
    const result = placeOnMain([], { ...linkAt('new', 0, 0), isHeaderLink: true });
    expect(result[0]!.isHeaderLink).toBe(false);
  });

  it('falls back to last row when no slot fits', () => {
    // Fill the main grid completely
    const occupied: WidgetItem[] = [];
    for (let r = 0; r < 12; r++) occupied.push(linkAt(`row-${r}`, 0, r, { w: 18, h: 1 }));
    const result = placeOnMain(occupied, linkAt('overflow', 0, 0));
    const placed = result[result.length - 1]!;
    expect(placed.y).toBe(11);
  });
});
