import React from 'react';
import { Helmet } from 'react-helmet-async';

function About() {
  return (
    <>
      <Helmet>
        <title>About Us | AI Tees</title>
        <meta
          name="description"
          content="Learn about our mission to revolutionize fashion with AI-generated t-shirt designs. Discover how we blend technology and creativity."
        />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">About Us</h1>
        <p className="text-lg text-gray-600 mb-6">Coming soon...</p>
      </div>
    </>
  );
}

export default About;