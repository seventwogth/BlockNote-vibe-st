import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover/Popover';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  presetColors?: string[];
}

const DEFAULT_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#71717a', '#000000', '#ffffff',
];

export function ColorPicker({
  value,
  onChange,
  label,
  presetColors = DEFAULT_PRESETS,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value || '#3b82f6');

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text mb-2">{label}</label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`
              w-8 h-8 rounded-md border border-border
              transition-transform hover:scale-105
              ${!value ? 'bg-gradient-to-br from-red-400 via-green-400 to-blue-400' : ''}
            `}
            style={value ? { backgroundColor: value } : undefined}
          />
        </PopoverTrigger>
        <PopoverContent>
          <div className="p-3 w-56">
            <div className="grid grid-cols-8 gap-1 mb-3">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-6 h-6 rounded-md transition-transform hover:scale-110
                    ${value === color ? 'ring-2 ring-offset-2 ring-primary' : ''}
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <div className="border-t border-border pt-3">
              <label className="block text-xs text-text-secondary mb-2">Custom Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-border rounded bg-surface text-text"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ColorSwatchProps {
  colors: string[];
  selectedColor?: string;
  onSelect: (color: string) => void;
  onRemove?: (color: string) => void;
}

export function ColorSwatch({ colors, selectedColor, onSelect, onRemove }: ColorSwatchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <div key={color} className="relative group">
          <button
            onClick={() => onSelect(color)}
            className={`
              w-8 h-8 rounded-md transition-transform hover:scale-105
              ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2' : ''}
            `}
            style={{ backgroundColor: color }}
          />
          {onRemove && (
            <button
              onClick={() => onRemove(color)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {onRemove && (
        <button
          onClick={() => {
            const newColor = prompt('Enter hex color:');
            if (newColor && /^#[0-9A-Fa-f]{6}$/.test(newColor)) {
              onSelect(newColor);
            }
          }}
          className="w-8 h-8 rounded-md border-2 border-dashed border-border flex items-center justify-center text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          +
        </button>
      )}
    </div>
  );
}
