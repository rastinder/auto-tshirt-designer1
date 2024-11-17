import React from 'react';
import { Loader2 } from 'lucide-react';

interface TransparencySliderProps {
  value: number;
  onChange: (value: number) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const TransparencySlider = ({ 
  value, 
  onChange, 
  isLoading = false,
  disabled = false 
}: TransparencySliderProps) => {
  return (
    <div className="w-full max-w-xs space-y-2">
      <label className="flex justify-between items-center text-sm font-medium text-gray-700">
        <span>Transparency</span>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{value}%</span>
        </div>
      </label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'accent-indigo-600 hover:accent-indigo-700'}
        `}
        disabled={disabled || isLoading}
      />
    </div>
  );
};
