import React from 'react';

const COLORS = [
  '#FFFFFF', // White
  '#47E8D2', // Turquoise
  '#DCA381', // Tan
  '#702C3C', // Burgundy
  '#E9C660', // Yellow
  '#A11D1F', // Red
  '#897115', // Brown
  '#598DE6', // Blue
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => {
        const hex = c.replace('#', '');
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-10 h-10 rounded-lg border-2 ${
              color.toUpperCase() === c ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'
            } hover:border-blue-500 transition-all duration-200 relative overflow-hidden`}
            aria-label={`Select color ${c}`}
          >
            <img 
              src={`https://res.cloudinary.com/demo-robert/image/upload/w_30,h_30/e_replace_color:${hex}:60:white/l_heather_texture,o_0,w_30,h_30,c_crop/white-bar.jpg`}
              alt={`Color ${c}`}
              className="w-full h-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
};