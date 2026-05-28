import { useState, useEffect } from 'react';

const ASSUMED_MAX_ROWS = 12;
const HEADER_PADDING = 100;
const ROW_MARGIN_PX = 16;
const MIN_ROW_HEIGHT_PX = 30;

export interface GridDimensions {
  rowHeight: number;
}

const computeDimensions = (): GridDimensions => {
  if (typeof window === 'undefined') return { rowHeight: 60 };

  const height = document.documentElement.clientHeight;
  const availableHeight = height - HEADER_PADDING;
  const rowHeight = Math.max(
    (availableHeight - (ROW_MARGIN_PX * (ASSUMED_MAX_ROWS - 1))) / ASSUMED_MAX_ROWS,
    MIN_ROW_HEIGHT_PX
  );

  return { rowHeight: Math.floor(rowHeight) };
};

export function useGridDimensions(): GridDimensions {
  const [dims, setDims] = useState<GridDimensions>(computeDimensions);

  useEffect(() => {
    const handleResize = () => setDims(computeDimensions());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dims;
}
