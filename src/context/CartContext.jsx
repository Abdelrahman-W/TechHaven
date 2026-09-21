import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadCart = async () => {
    try {
      const res = await api.getCart();
      setCart(res.data || []);
    } catch {
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCart();
  }, []);

  const addItem = async (product, quantity = 1, openDrawer = false) => {
    await api.addToCart(product.id, quantity);
    await loadCart();
    if (openDrawer) {
      setOpen(true);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeItem(productId);
    }
    setCart((prev) =>
      prev.map((it) => {
        if (
          it.product_id === productId ||
          it.id === productId ||
          it.product?.id === productId
        ) {
          return { ...it, quantity };
        }
        return it;
      })
    );
    try {
      await api.updateCartItem(productId, quantity);
    } finally {
      await loadCart();
    }
  };

  const removeItem = async (productId) => {
    setCart((prev) =>
      prev.filter(
        (it) =>
          it.product_id !== productId &&
          it.id !== productId &&
          it.product?.id !== productId
      )
    );
    try {
      await api.removeFromCart(productId);
    } finally {
      await loadCart();
    }
  };

  const clear = async () => {
    try {
      await api.clearCart();
    } catch {
      // ignore
    }
    setCart([]);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item?.price || item?.unit_price || 0) * Number(item?.quantity || 1),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems: cart,
        loading,
        open,
        setOpen,
        subtotal,
        getCartTotal: () => subtotal,
        addItem,
        addToCart: addItem,
        updateQuantity,
        removeItem,
        removeFromCart: removeItem,
        clear,
        clearCart: clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
