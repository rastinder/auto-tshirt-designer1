import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SlidersHorizontal } from 'lucide-react';
import FilterSidebar from '../components/FilterSidebar';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';

function Shop() {
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts] = useState(products);

  const handlePriceChange = (min: number, max: number) => {
    // Implement price filtering logic
    console.log(`Filter by price: ${min} - ${max}`);
  };

  const handleSizeChange = (size: string) => {
    // Implement size filtering logic
    console.log(`Filter by size: ${size}`);
  };

  const handleColorChange = (color: string) => {
    // Implement color filtering logic
    console.log(`Filter by color: ${color}`);
  };

  return (
    <>
      <Helmet>
        <title>Shop AI-Generated T-Shirts | AI Tees</title>
        <meta
          name="description"
          content="Browse our collection of unique AI-generated t-shirt designs. Find the perfect blend of art and technology in our comfortable, high-quality apparel."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Filter Button */}
        <button
          className="md:hidden flex items-center space-x-2 mb-4 text-gray-600 hover:text-indigo-600"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span>Filters</span>
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
            <FilterSidebar
              onPriceChange={handlePriceChange}
              onSizeChange={handleSizeChange}
              onColorChange={handleColorChange}
            />
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Shop;