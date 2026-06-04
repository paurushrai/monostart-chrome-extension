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

export interface Cell {
  x: number;
  y: number;
}

// A swap is intentional only when the cursor itself is over the target —
// the same rule the drag-time highlight uses. Footprint overlap of the
// dragged item must NOT trigger swaps: dropping a wide widget adjacent to
// another would otherwise swap them without any visual cue.
export const findSwapTargetAtCell = (
  cell: Cell,
  others: ReadonlyArray<{ id: string; rect: Rect }>,
): string | null => {
  const hit = others.find((o) =>
    cell.x >= o.rect.x && cell.x < o.rect.x + o.rect.w &&
    cell.y >= o.rect.y && cell.y < o.rect.y + o.rect.h,
  );
  return hit?.id ?? null;
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
