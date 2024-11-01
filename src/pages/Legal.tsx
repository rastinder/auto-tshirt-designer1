import React from 'react';
import { Helmet } from 'react-helmet-async';

function Legal() {
  return (
    <>
      <Helmet>
        <title>Legal Information | AI Tees</title>
        <meta
          name="description"
          content="View our legal information, including privacy policy, terms of service, and GDPR compliance details."
        />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Legal Information</h1>
        <p className="text-lg text-gray-600 mb-6">Coming soon...</p>
      </div>
    </>
  );
}

export default Legal;