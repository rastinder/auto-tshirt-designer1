import React from 'react';
import { Helmet } from 'react-helmet-async';

function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog | AI Tees</title>
        <meta
          name="description"
          content="Read about the latest trends in AI fashion, sustainable clothing, and behind-the-scenes looks at our design process."
        />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Blog</h1>
        <p className="text-lg text-gray-600 mb-6">Coming soon...</p>
      </div>
    </>
  );
}

export default Blog;