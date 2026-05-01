import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const EMPTY = { id: null, groups: [], grandTotal: 0, itemCount: 0, warnings: [] };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isBuyer = user?.role === 'BUYER';

  const refresh = useCallback(async () => {
    if (!isBuyer) {
      setCart(EMPTY);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/buyer/cart');
      setCart(data || EMPTY);
    } catch (e) {
      setError(e?.message || 'Failed to load cart.');
    } finally {
      setLoading(false);
    }
  }, [isBuyer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async ({ listingId, quantityKg, notes }) => {
    setError(null);
    try {
      const data = await apiPost('/buyer/cart/items', null, { listingId, quantityKg, notes });
      setCart(data || EMPTY);
      return { ok: true };
    } catch (e) {
      setError(e?.message || 'Could not add to cart.');
      return { ok: false, error: e?.message };
    }
  }, []);

  const updateItem = useCallback(async (itemId, { quantityKg, notes }) => {
    setError(null);
    try {
      const data = await apiPatch(`/buyer/cart/items/${itemId}`, null, { quantityKg, notes });
      setCart(data || EMPTY);
      return { ok: true };
    } catch (e) {
      setError(e?.message || 'Could not update item.');
      return { ok: false, error: e?.message };
    }
  }, []);

  const removeItem = useCallback(async (itemId) => {
    setError(null);
    try {
      const data = await apiDelete(`/buyer/cart/items/${itemId}`);
      setCart(data || EMPTY);
      return { ok: true };
    } catch (e) {
      setError(e?.message || 'Could not remove item.');
      return { ok: false, error: e?.message };
    }
  }, []);

  const clearCart = useCallback(async () => {
    setError(null);
    try {
      const data = await apiDelete('/buyer/cart');
      setCart(data || EMPTY);
      return { ok: true };
    } catch (e) {
      setError(e?.message || 'Could not clear cart.');
      return { ok: false, error: e?.message };
    }
  }, []);

  return (
    <CartContext.Provider value={{
      cart, loading, error,
      refresh, addItem, updateItem, removeItem, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
