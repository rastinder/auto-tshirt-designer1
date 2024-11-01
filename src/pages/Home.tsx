import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Star, Truck, Shield, Sparkles, Palette, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';

function Home() {
  const popularShirts = [
    {
      id: 1,
      name: "Cosmic Dreams #1",
      price: 1499,
      purchases: 1247,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 2,
      name: "Digital Wilderness",
      price: 1699,
      purchases: 983,
      image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 3,
      name: "Neural Network",
      price: 1899,
      purchases: 756,
      image: "https://images.unsplash.com/photo-1527719327859-c6ce80353573?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    }
  ];

  return (
    <>
      <Helmet>
        <title>AI Tees - Unique AI-Generated T-Shirt Designs</title>
        <meta name="description" content="Discover unique, AI-generated t-shirt designs created with cutting-edge Stable Diffusion technology. Shop our collection of creative and original apparel." />
        <meta name="keywords" content="AI t-shirts, stable diffusion, custom designs, unique apparel, AI fashion" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Wear the Future with AI-Generated Designs
              </h1>
              <p className="text-lg mb-8 text-indigo-100">
                Unique t-shirts created by artificial intelligence, bringing you designs that have never existed before.
              </p>
              <div className="space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center px-6 py-3 border-2 border-white rounded-full text-lg font-medium hover:bg-white hover:text-indigo-600 transition-colors"
                >
                  Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/custom-design"
                  className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-full text-lg font-medium hover:bg-indigo-50 transition-colors"
                >
                  Create Your Own <Palette className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                alt="AI-designed t-shirt mockup"
                className="rounded-lg shadow-xl"
              />
              <div className="absolute -bottom-4 -right-4 bg-white text-indigo-600 px-6 py-2 rounded-full font-medium shadow-lg">
                New Designs Daily!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Most Popular Designs</h2>
            <p className="text-gray-600">Our community's favorite AI-generated t-shirts</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {popularShirts.map((shirt) => (
              <Link key={shirt.id} to={`/product/${shirt.id}`} className="group">
                <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform group-hover:scale-105">
                  <img
                    src={shirt.image}
                    alt={shirt.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="font-semibold text-lg mb-2">{shirt.name}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-indigo-600">
                        ₹{shirt.price}
                      </span>
                      <div className="flex items-center text-gray-600">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        <span>{shirt.purchases.toLocaleString()} sold</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Unique Designs</h3>
              <p className="text-gray-600">Every design is one-of-a-kind, generated by advanced AI</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast Shipping</h3>
              <p className="text-gray-600">Free shipping on orders over ₹2499</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quality Guarantee</h3>
              <p className="text-gray-600">100% satisfaction guaranteed or your money back</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;