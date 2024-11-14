import React from 'react';

const COLORS = [
  '#ffffff', // White
  '#000000', // Black
  '#0f172a', // Navy
  '#6b7280', // Gray
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-10 h-10 rounded-full border-2 ${
            color === c ? 'border-indigo-600' : 'border-gray-300'
          }`}
          style={{ backgroundColor: c }}
          aria-label={`Select color ${c}`}
        />
      ))}
    </div>
  );
}