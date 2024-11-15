import React from 'react';

interface TransparencySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export const TransparencySlider = ({ value, onChange }: TransparencySliderProps) => {
  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <label className="flex justify-between items-center text-sm font-medium text-gray-700">
        <span>Transparency</span>
        <span>{value}%</span>
      </label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
};
