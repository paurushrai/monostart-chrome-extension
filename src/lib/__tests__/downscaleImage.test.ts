import { describe, expect, it } from 'vitest';
import { fitWithinMaxEdge, MAX_EDGE_PX } from '../downscaleImage';

describe('fitWithinMaxEdge', () => {
  it('leaves images at or under the max edge unchanged (no upscaling)', () => {
    expect(fitWithinMaxEdge({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
    expect(fitWithinMaxEdge({ width: MAX_EDGE_PX, height: 1000 })).toEqual({
      width: MAX_EDGE_PX,
      height: 1000,
    });
  });

  it('scales landscape images so the longest edge equals the max', () => {
    const result = fitWithinMaxEdge({ width: 5120, height: 2560 });
    expect(result.width).toBe(MAX_EDGE_PX);
    expect(result.height).toBe(MAX_EDGE_PX / 2);
  });

  it('scales portrait images so the longest edge equals the max', () => {
    const result = fitWithinMaxEdge({ width: 1280, height: 5120 });
    expect(result.height).toBe(MAX_EDGE_PX);
    expect(result.width).toBe(MAX_EDGE_PX / 4);
  });
});
