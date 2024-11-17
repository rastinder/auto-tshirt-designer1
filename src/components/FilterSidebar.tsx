import React from 'react';
import { Sliders } from 'lucide-react';

interface FilterSidebarProps {
  onPriceChange: (min: number, max: number) => void;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
}

function FilterSidebar({ onPriceChange, onSizeChange, onColorChange }: FilterSidebarProps) {
  return (
    <div className="w-64 bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center space-x-2 mb-6">
        <Sliders className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Price Range</h3>
        <div>
          <label className="flex items-center mb-2">
            <input
              type="radio"
              name="price"
              className="form-radio text-indigo-600"
              onChange={() => onPriceChange(0, 25)}
            />
            <span className="ml-2">Under $25</span>
          </label>
          <label className="flex items-center mb-2">
            <input
              type="radio"
              name="price"
              className="form-radio text-indigo-600"
              onChange={() => onPriceChange(25, 50)}
            />
            <span className="ml-2">$25 - $50</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="price"
              className="form-radio text-indigo-600"
              onChange={() => onPriceChange(50, 100)}
            />
            <span className="ml-2">$50 - $100</span>
          </label>
        </div>
      </div>

      {/* Size Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(size)}
              className="px-3 py-1 border border-gray-300 rounded-full hover:border-indigo-600 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50"
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <h3 className="font-medium mb-3">Color</h3>
        <div className="flex flex-wrap gap-2">
          {['Black', 'White', 'Navy', 'Gray'].map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className="px-3 py-1 border border-gray-300 rounded-full hover:border-indigo-600 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50"
            >
              {color}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FilterSidebar;