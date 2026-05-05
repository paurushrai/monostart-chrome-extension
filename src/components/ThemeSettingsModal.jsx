import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Pipette } from 'lucide-react';

const presetColors = [
  { name: 'Blue', hsl: '200 73% 52%' },
  { name: 'Indigo', hsl: '239 84% 67%' },
  { name: 'Purple', hsl: '271 91% 65%' },
  { name: 'Pink', hsl: '326 100% 74%' },
  { name: 'Red', hsl: '346 87% 61%' },
  { name: 'Orange', hsl: '24 100% 50%' },
  { name: 'Yellow', hsl: '45 93% 47%' },
  { name: 'Green', hsl: '142 71% 45%' },
  { name: 'Teal', hsl: '175 84% 32%' },
  { name: 'Cyan', hsl: '189 94% 43%' },
  { name: 'Slate', hsl: '215 16% 47%' },
  { name: 'Zinc', hsl: '240 5% 65%' },
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
              
              {/* Custom Color Picker */}
              <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-secondary border border-border transition-transform hover:scale-110 group cursor-pointer overflow-hidden">
                <input 
                  type="color" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleCustomColor}
                  title="Custom Color"
                />
                <Pipette size={18} className="text-muted-foreground group-hover:text-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
