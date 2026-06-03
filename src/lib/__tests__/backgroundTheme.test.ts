import { describe, it, expect } from 'vitest';
import { deriveBackgroundTheme } from '../backgroundTheme';

describe('deriveBackgroundTheme', () => {
  it('should return null when there is no background', async () => {
    expect(await deriveBackgroundTheme({ type: 'none' })).toBeNull();
  });

  it('should derive a vivid accent and luminance from a solid color', async () => {
    const result = await deriveBackgroundTheme({ type: 'color', value: '#1e3a8a' });
    expect(result?.accent).toMatch(/^\d+ \d+% 50%$/);
    expect(result?.luminance ?? 0).toBeGreaterThan(0);
  });

  it('should floor a washed-out color to a usable accent saturation', async () => {
    const result = await deriveBackgroundTheme({ type: 'color', value: '#bfc4cc' });
    const sat = Number(result?.accent.split(' ')[1]?.replace('%', ''));
    expect(sat).toBeGreaterThanOrEqual(45);
  });

  it('should average gradient stops into an accent', async () => {
    const result = await deriveBackgroundTheme({
      type: 'gradient',
      value: 'linear-gradient(135deg,#ff0000,#0000ff)',
    });
    expect(result?.accent).toMatch(/^\d+ \d+% 50%$/);
  });

  it('should return null for a gradient with no parseable colors', async () => {
    expect(await deriveBackgroundTheme({ type: 'gradient', value: 'linear-gradient(var(--x),var(--y))' })).toBeNull();
  });

  it('should reduce luminance as the dim overlay increases', async () => {
    const bright = await deriveBackgroundTheme({ type: 'color', value: '#ffffff' });
    const dimmed = await deriveBackgroundTheme({ type: 'color', value: '#ffffff', dim: 0.5 });
    expect(dimmed?.luminance ?? 1).toBeLessThan(bright?.luminance ?? 0);
  });
});
