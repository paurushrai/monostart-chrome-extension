import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Pipette } from 'lucide-react';

const presetColors = [
  { name: 'Red', hsl: '346 87% 61%' },
  { name: 'Pink', hsl: '326 100% 74%' },
  { name: 'Purple', hsl: '271 91% 65%' },
  { name: 'Indigo', hsl: '239 84% 67%' },
  { name: 'Blue', hsl: '200 73% 52%' },
  { name: 'Cyan', hsl: '189 94% 43%' },
  { name: 'Teal', hsl: '175 84% 32%' },
  { name: 'Green', hsl: '142 71% 45%' },
  { name: 'Yellow', hsl: '45 93% 47%' },
  { name: 'Orange', hsl: '24 100% 50%' },
  { name: 'Slate', hsl: '215 16% 47%' },
  { name: 'Neutral', hsl: '0 0% 50%' },
];

export default function ThemeSettingsModal({ open, onOpenChange, settings, updateSettings }) {
  const currentMode = settings.themeMode || 'device';
  const currentColor = settings.themeColor || '200 73% 52%';

  const setMode = (mode) => {
    updateSettings({ ...settings, themeMode: mode });
  };

  const setColor = (colorHsl) => {
    updateSettings({ ...settings, themeColor: colorHsl });
  };

  // Convert hex to HSL for the custom color picker
  const handleCustomColor = (e) => {
    const hex = e.target.value;
    // Simple RGB to HSL conversion
    let r = parseInt(hex.substring(1, 3), 16) / 255;
    let g = parseInt(hex.substring(3, 5), 16) / 255;
    let b = parseInt(hex.substring(5, 7), 16) / 255;
    
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    const hValue = Math.round(h * 360);
    const sValue = Math.round(s * 100);
    const lValue = Math.round(l * 100);
    const hslString = `${hValue} ${sValue}% ${lValue}%`;
    setColor(hslString);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Theme & Appearance</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize the look and feel of your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col gap-6">
          {/* Theme Mode Toggle */}
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setMode('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                currentMode === 'light' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun size={16} /> Light
            </button>
            <button
              onClick={() => setMode('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                currentMode === 'dark' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon size={16} /> Dark
            </button>
            <button
              onClick={() => setMode('device')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                currentMode === 'device' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor size={16} /> Device
            </button>
          </div>

          {/* Color Grid */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Primary Color</h4>
            <div className="grid grid-cols-6 gap-3">
              {presetColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setColor(color.hsl)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    currentColor === color.hsl ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'ring-1 ring-border'
                  }`}
                  style={{ backgroundColor: `hsl(${color.hsl})` }}
                  title={color.name}
                />
              ))}
            </div>
            
            {/* Custom Hue Slider */}
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
                  // Keep a nice vibrant saturation and lightness for the custom color
                  setColor(`${hue} 80% 55%`);
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
