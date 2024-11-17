import React from 'react';
import { Link } from 'react-router-dom';
import { Shirt, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Shirt className="h-8 w-8 text-indigo-400" />
              <span className="font-bold text-xl text-white">AI Tees</span>
            </Link>
            <p className="text-sm">
              Creating unique, AI-generated t-shirt designs that push the boundaries of creativity.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul>
              <li className="mb-2"><Link to="/shop" className="hover:text-white">Shop</Link></li>
              <li className="mb-2"><Link to="/blog" className="hover:text-white">Blog</Link></li>
              <li className="mb-2"><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold text-white mb-4">Customer Service</h3>
            <ul>
              <li className="mb-2"><Link to="/shipping" className="hover:text-white">Shipping Info</Link></li>
              <li className="mb-2"><Link to="/returns" className="hover:text-white">Returns</Link></li>
              <li className="mb-2"><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/size-guide" className="hover:text-white">Size Guide</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul>
              <li className="mb-2"><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li className="mb-2"><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li className="mb-2"><Link to="/gdpr" className="hover:text-white">GDPR</Link></li>
              <li><Link to="/cookies" className="hover:text-white">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mb-4 md:mb-0">
              <a href="#" className="hover:text-white"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-white"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="hover:text-white"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="hover:text-white"><Youtube className="h-5 w-5" /></a>
            </div>
            <div className="text-sm">
              {new Date().getFullYear()} AI Tees. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;