import React from 'react';

export const SIZES = {
  S: { chest: '36-38"', length: '28"', shoulders: '17"' },
  M: { chest: '38-40"', length: '29"', shoulders: '18"' },
  L: { chest: '40-42"', length: '30"', shoulders: '19"' },
  XL: { chest: '42-44"', length: '31"', shoulders: '20"' },
  '2XL': { chest: '44-46"', length: '32"', shoulders: '21"' }
};

interface SizeSelectorProps {
  size: string;
  onChange: (size: string) => void;
}

export const SizeSelector = ({ size, onChange }: SizeSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.keys(SIZES).map((sizeOption) => (
          <button
            key={sizeOption}
            onClick={() => onChange(sizeOption)}
            className={`px-4 py-2 rounded-lg border-2 ${
              size === sizeOption
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                : 'border-gray-300 hover:border-indigo-600'
            }`}
          >
            {sizeOption}
          </button>
        ))}
      </div>
      
      {/* Size Details */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Size Details</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Chest:</span>
            <br />
            {SIZES[size as keyof typeof SIZES].chest}
          </div>
          <div>
            <span className="text-gray-600">Length:</span>
            <br />
            {SIZES[size as keyof typeof SIZES].length}
          </div>
          <div>
            <span className="text-gray-600">Shoulders:</span>
            <br />
            {SIZES[size as keyof typeof SIZES].shoulders}
          </div>
        </div>
      </div>
    </div>
  );
}