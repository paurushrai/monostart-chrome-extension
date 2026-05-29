export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SizeBounds {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface SwapInput {
  rect: Rect;
  bounds: SizeBounds;
}

export interface SwapOutput {
  draggedRect: Rect;
  targetRect: Rect;
}

const overlapArea = (a: Rect, b: Rect): number => {
  const dx = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const dy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return dx * dy;
};

export const pickSwapTarget = (
  dropped: Rect,
  others: ReadonlyArray<{ id: string; rect: Rect }>,
): string | null => {
  let bestId: string | null = null;
  let bestArea = 0;
  let bestY = Infinity;
  let bestX = Infinity;

  for (const other of others) {
    const area = overlapArea(dropped, other.rect);
    if (area <= 0) continue;
    if (
      area > bestArea ||
      (area === bestArea && (other.rect.y < bestY ||
        (other.rect.y === bestY && other.rect.x < bestX)))
    ) {
      bestId = other.id;
      bestArea = area;
      bestY = other.rect.y;
      bestX = other.rect.x;
    }
  }

  return bestId;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const fitSize = (desired: { w: number; h: number }, bounds: SizeBounds): { w: number; h: number } => {
  const minW = bounds.minW ?? 1;
  const minH = bounds.minH ?? 1;
  const maxW = bounds.maxW ?? Infinity;
  const maxH = bounds.maxH ?? Infinity;
  return {
    w: clamp(desired.w, minW, Math.max(minW, maxW)),
    h: clamp(desired.h, minH, Math.max(minH, maxH)),
  };
};

export const resolveSwap = (
  dragged: SwapInput,
  target: SwapInput,
): SwapOutput => {
  const draggedSize = fitSize({ w: target.rect.w, h: target.rect.h }, dragged.bounds);
  const targetSize = fitSize({ w: dragged.rect.w, h: dragged.rect.h }, target.bounds);

  return {
    draggedRect: {
      x: target.rect.x,
      y: target.rect.y,
      w: draggedSize.w,
      h: draggedSize.h,
    },
    targetRect: {
      x: dragged.rect.x,
      y: dragged.rect.y,
      w: targetSize.w,
      h: targetSize.h,
    },
  };
};
