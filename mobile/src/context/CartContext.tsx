import React, { createContext, useContext, useState } from 'react';
import { CartItem, Product } from '../types';
import * as Haptics from 'expo-haptics';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => boolean;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
  estimatedProfit: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity: number = 1): boolean => {
    // Prevent adding inactive or 0 stock products if desired
    const existingIndex = items.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = items[existingIndex].quantity;
      const newQty = currentQty + quantity;

      if (newQty > product.quantity) {
        // Exceeds available stock
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
        return false;
      }

      const updated = [...items];
      updated[existingIndex].quantity = newQty;
      setItems(updated);
    } else {
      if (quantity > product.quantity) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
        return false;
      }
      setItems([...items, { product, quantity, unitPrice: product.sellingPrice }]);
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    return true;
  };

  const removeItem = (productId: number) => {
    setItems(items.filter((i) => i.product.id !== productId));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(
      items.map((i) => {
        if (i.product.id === productId) {
          const validQty = Math.min(quantity, i.product.quantity);
          return { ...i, quantity: validQty };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedProfit = items.reduce(
    (sum, item) => sum + item.quantity * (item.unitPrice - (item.product.purchasePrice || 0)),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItems,
        estimatedProfit,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
