import { deriveSwatchTones, type ChromeTheme } from '../lib/chromeThemes';

interface Props {
  theme: ChromeTheme;
  selected: boolean;
  onSelect: (seed: string) => void;
}

export default function ThemeSwatch({ theme, selected, onSelect }: Readonly<Props>) {
  const tones = deriveSwatchTones(theme.seed);
  // Bottom layer: left/right halves. Top layer: upper half overlays the bottom.
  const background = [
    `linear-gradient(to bottom, hsl(${tones.top}) 0 50%, transparent 50% 100%)`,
    `linear-gradient(to right, hsl(${tones.bottomLeft}) 0 50%, hsl(${tones.bottomRight}) 50% 100%)`,
  ].join(', ');

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={theme.name}
      title={theme.name}
      onClick={() => onSelect(theme.seed)}
      className={`w-10 h-10 p-0 rounded-full transition-transform hover:scale-110 ${
        selected
          ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
          : 'ring-1 ring-border'
      }`}
      style={{ background }}
    />
  );
}
