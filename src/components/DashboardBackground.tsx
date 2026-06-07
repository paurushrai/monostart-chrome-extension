import type { CSSProperties } from 'react';
import type { DashboardBackground as BackgroundConfig } from '../types';

interface Props {
  background?: BackgroundConfig;
}

export default function DashboardBackground({ background }: Readonly<Props>) {
  if (!background || background.type === 'none' || !background.value) return null;

  const { type, value, blur = 0, dim = 0 } = background;
  const layer: CSSProperties = {};

  if (type === 'color') {
    layer.backgroundColor = value;
  } else if (type === 'gradient') {
    layer.backgroundImage = value;
  } else if (type === 'image') {
    layer.backgroundImage = `url("${value}")`;
    layer.backgroundSize = 'cover';
    layer.backgroundPosition = 'center';
    layer.backgroundRepeat = 'no-repeat';
  }

  if (blur > 0) {
    layer.filter = `blur(${blur}px)`;
    layer.transform = 'scale(1.08)';
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0" style={layer} />
      {dim > 0 && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />
      )}
    </div>
  );
}
