import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Monitor, Upload } from 'lucide-react';
import type { Settings, DashboardBackground } from '../types';
import ThemeSwatch from './ThemeSwatch';
import { CHROME_THEMES } from '../lib/chromeThemes';

const bgColors = ['#0f172a', '#111827', '#1e293b', '#18181b', '#1e3a8a', '#3730a3', '#0b3b2e', '#7f1d1d'];
const bgGradients = [
  { name: 'Dusk', value: 'linear-gradient(135deg,#1e3a8a,#6d28d9)' },
  { name: 'Sunset', value: 'linear-gradient(135deg,#f97316,#db2777)' },
  { name: 'Ocean', value: 'linear-gradient(135deg,#0ea5e9,#14b8a6)' },
  { name: 'Forest', value: 'linear-gradient(160deg,#065f46,#022c22)' },
  { name: 'Slate', value: 'linear-gradient(160deg,#334155,#0f172a)' },
  { name: 'Aurora', value: 'linear-gradient(135deg,#7c3aed,#2563eb,#06b6d4)' },
];
const bgTypes: ReadonlyArray<{ id: DashboardBackground['type']; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'color', label: 'Color' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image', label: 'Image' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  updateSettings: (next: Settings) => void;
}

type ThemeMode = NonNullable<Settings['themeMode']>;

export default function ThemeSettingsModal({ open, onOpenChange, settings, updateSettings }: Readonly<Props>) {
  const currentMode: ThemeMode = settings.themeMode || 'device';
  const currentColor = settings.themeColor || '271 91% 65%';

  const setMode = (mode: ThemeMode) => {
    updateSettings({ ...settings, themeMode: mode });
  };

  const setColor = (colorHsl: string) => {
    updateSettings({ ...settings, themeColor: colorHsl });
  };

  const bg: DashboardBackground = settings.background ?? { type: 'none' };
  const setBg = (next: Partial<DashboardBackground>) => {
    updateSettings({ ...settings, background: { ...bg, ...next } });
  };
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [bgError, setBgError] = useState('');

  const chooseType = (t: DashboardBackground['type']) => {
    setBgError('');
    if (t === 'color') setBg({ type: 'color', value: bg.type === 'color' && bg.value ? bg.value : bgColors[0] });
    else if (t === 'gradient') setBg({ type: 'gradient', value: bg.type === 'gradient' && bg.value ? bg.value : bgGradients[0]!.value });
    else if (t === 'image') setBg({ type: 'image', value: bg.type === 'image' ? bg.value : '' });
    else setBg({ type: 'none' });
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setBgError('Image must be under 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') { setBg({ type: 'image', value: result }); setBgError(''); }
    };
    reader.onerror = () => setBgError('Failed to read file.');
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-card border-border text-foreground"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Theme & Appearance</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize the look and feel of your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col gap-6">
          <div role="radiogroup" aria-label="Theme mode" className="flex bg-muted p-1 rounded-lg border border-border">
            <Button
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={currentMode === 'light'}
              onClick={() => setMode('light')}
              className={`flex-1 h-auto py-2 rounded-md text-sm font-medium transition-all ${
                currentMode === 'light' ? 'bg-card shadow-sm text-foreground hover:bg-card' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun size={16} className="mr-2" aria-hidden="true" /> Light
            </Button>
            <Button
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={currentMode === 'dark'}
              onClick={() => setMode('dark')}
              className={`flex-1 h-auto py-2 rounded-md text-sm font-medium transition-all ${
                currentMode === 'dark' ? 'bg-card shadow-sm text-foreground hover:bg-card' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon size={16} className="mr-2" aria-hidden="true" /> Dark
            </Button>
            <Button
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={currentMode === 'device'}
              onClick={() => setMode('device')}
              className={`flex-1 h-auto py-2 rounded-md text-sm font-medium transition-all ${
                currentMode === 'device' ? 'bg-card shadow-sm text-foreground hover:bg-card' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor size={16} className="mr-2" aria-hidden="true" /> Device
            </Button>
          </div>

          <section aria-labelledby="primary-color-heading" className="space-y-3">
            <h4 id="primary-color-heading" className="text-sm font-medium text-foreground">Primary Color</h4>
            <div role="radiogroup" aria-label="Primary color presets" className="grid grid-cols-4 gap-3">
              {CHROME_THEMES.map((theme) => (
                <ThemeSwatch
                  key={theme.name}
                  theme={theme}
                  selected={currentColor === theme.seed}
                  onSelect={setColor}
                />
              ))}
            </div>
            
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Custom Hue</span>
                <div 
                  className="w-5 h-5 rounded-full border border-border shadow-sm" 
                  style={{ backgroundColor: `hsl(${currentColor})` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={currentColor.split(' ')[0]}
                onChange={(e) => {
                  const hue = e.target.value;
                  setColor(`${hue} 70% 50%`);
                }}
                className="w-full h-3 rounded-full appearance-none cursor-pointer border border-border/50 shadow-inner"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: white;
                  border: 2px solid rgba(0,0,0,0.1);
                  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
                  cursor: pointer;
                  transition: transform 0.1s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                }
                input[type=range]:active::-webkit-slider-thumb {
                  transform: scale(0.95);
                }
              `}</style>
            </div>
          </section>

          <section aria-labelledby="background-heading" className="space-y-3">
            <h4 id="background-heading" className="text-sm font-medium text-foreground">Background</h4>

            <div role="radiogroup" aria-label="Background type" className="flex bg-muted p-1 rounded-lg border border-border">
              {bgTypes.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="ghost"
                  role="radio"
                  aria-checked={bg.type === t.id}
                  onClick={() => chooseType(t.id)}
                  className={`flex-1 h-auto py-1.5 rounded-md text-xs font-medium transition-all ${
                    bg.type === t.id ? 'bg-card shadow-sm text-foreground hover:bg-card' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {bg.type === 'color' && (
              <div role="radiogroup" aria-label="Background color" className="grid grid-cols-8 gap-2">
                {bgColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={bg.value === c}
                    onClick={() => setBg({ value: c })}
                    className={`w-full aspect-square rounded-md transition-transform hover:scale-110 ${
                      bg.value === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'ring-1 ring-border'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            )}

            {bg.type === 'gradient' && (
              <div role="radiogroup" aria-label="Background gradient" className="grid grid-cols-3 gap-2">
                {bgGradients.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    role="radio"
                    aria-checked={bg.value === g.value}
                    onClick={() => setBg({ value: g.value })}
                    className={`h-12 rounded-md transition-transform hover:scale-[1.03] ${
                      bg.value === g.value ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'ring-1 ring-border'
                    }`}
                    style={{ backgroundImage: g.value }}
                    title={g.name}
                  />
                ))}
              </div>
            )}

            {bg.type === 'image' && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Paste image URL..."
                  value={bg.value && !bg.value.startsWith('data:') ? bg.value : ''}
                  onChange={(e) => setBg({ value: e.target.value })}
                />
                <input type="file" accept="image/*" ref={fileRef} onChange={handleBgUpload} className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-8 gap-1.5 border-dashed"
                >
                  <Upload size={12} /> Upload Image
                </Button>
                {bg.value?.startsWith('data:') && (
                  <p className="text-2xs text-muted-foreground text-center">Custom image uploaded.</p>
                )}
                {bgError && <p className="text-2xs text-red-500 text-center">{bgError}</p>}
              </div>
            )}

            {bg.type !== 'none' && (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Blur</span>
                    <span className="text-2xs text-muted-foreground">{bg.blur ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={bg.blur ?? 0}
                    onChange={(e) => setBg({ blur: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted border border-border/50"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Dim</span>
                    <span className="text-2xs text-muted-foreground">{Math.round((bg.dim ?? 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={70}
                    value={Math.round((bg.dim ?? 0) * 100)}
                    onChange={(e) => setBg({ dim: Number(e.target.value) / 100 })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted border border-border/50"
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
