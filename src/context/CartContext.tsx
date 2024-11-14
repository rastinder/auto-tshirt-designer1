import React, { createContext, useContext, useReducer } from 'react';
import { CartState, CartItem } from '../types/cart';
import { Product } from '../types/product';

type CartAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: number; quantity: number } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {
  items: [],
  total: 0,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItemIndex = state.items.findIndex(
        item => 
          item.product.id === action.payload.product.id &&
          item.size === action.payload.size &&
          item.color === action.payload.color
      );

      if (existingItemIndex > -1) {
        const newItems = [...state.items];
        newItems[existingItemIndex].quantity += action.payload.quantity;
        return {
          ...state,
          items: newItems,
          total: state.total + (action.payload.product.price * action.payload.quantity),
        };
      }

      return {
        ...state,
        items: [...state.items, action.payload],
        total: state.total + (action.payload.product.price * action.payload.quantity),
      };
    }
    case 'REMOVE_FROM_CART': {
      const itemToRemove = state.items.find(item => item.product.id === action.payload);
      if (!itemToRemove) return state;

      return {
        ...state,
        items: state.items.filter(item => item.product.id !== action.payload),
        total: state.total - (itemToRemove.product.price * itemToRemove.quantity),
      };
    }
    case 'UPDATE_QUANTITY': {
      const itemIndex = state.items.findIndex(item => item.product.id === action.payload.productId);
      if (itemIndex === -1) return state;

      const newItems = [...state.items];
      const oldQuantity = newItems[itemIndex].quantity;
      newItems[itemIndex].quantity = action.payload.quantity;

      return {
        ...state,
        items: newItems,
        total: state.total + (newItems[itemIndex].product.price * (action.payload.quantity - oldQuantity)),
      };
    }
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}