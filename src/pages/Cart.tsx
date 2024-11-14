import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

function Cart() {
  const { state, dispatch } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity: newQuantity } });
  };

  const removeItem = (productId: number) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  };

  if (state.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600 mb-6">Your cart is empty</p>
          <Link
            to="/shop"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Shopping Cart | AI Tees</title>
        <meta
          name="description"
          content="Review and checkout your selected AI-generated t-shirt designs."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2">
            {state.items.map((item) => (
              <div
                key={`${item.product.id}-${item.size}-${item.color}`}
                className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm mb-4"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-grow">
                  <h3 className="font-semibold">{item.product.name}</h3>
                  <p className="text-sm text-gray-600">
                    Size: {item.size} | Color: {item.color}
                  </p>
                  <div className="flex items-center mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="mx-3">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-red-600 hover:text-red-700 mt-2"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${state.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{state.total > 50 ? 'Free' : '$4.99'}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(state.total + (state.total > 50 ? 0 : 4.99)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCheckingOut(true)}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Cart;