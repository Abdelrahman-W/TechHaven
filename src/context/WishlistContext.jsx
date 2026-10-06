import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';

const WishlistContext = createContext(null);

function getProductId(item) {
  return item?.product_id || item?.productId || item?.id;
}

function normalizeWishlistResponse(res) {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, i) => getProductId(item) === getProductId(b[i]));
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const refreshWishlist = useCallback(async ({ force = false } = {}) => {
    const token = localStorage.getItem('eh_token');

    if (!token) {
      let saved = [];
      try {
        const parsed = JSON.parse(localStorage.getItem('egy_wishlist') || '[]');
        saved = Array.isArray(parsed) ? parsed : [];
      } catch {
        saved = [];
      }
      setItems((current) => arraysEqual(current, saved) ? current : saved);
      loadedRef.current = true;
      return saved;
    }

    if (loadedRef.current && !force) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api.getWishlist();
      const nextItems = normalizeWishlistResponse(res);
      setItems((current) => arraysEqual(current, nextItems) ? current : nextItems);
      loadedRef.current = true;
      return nextItems;
    } catch (err) {
      setItems((current) => current.length === 0 ? current : []);
      loadedRef.current = true;
      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWishlist().catch(() => {
      setItems((current) => current.length === 0 ? current : []);
      loadedRef.current = true;
    });
  }, [refreshWishlist]);

  const wishlistIds = useMemo(() => new Set(items.map(getProductId).filter(Boolean)), [items]);

  const isWishlisted = useCallback((productId) => wishlistIds.has(productId), [wishlistIds]);

  const addToWishlist = useCallback(async (product) => {
    const productId = getProductId(product);
    if (!productId) return [];

    const optimisticItem = typeof product === 'object' ? product : { id: productId };
    setItems((current) => {
      if (current.some((item) => getProductId(item) === productId)) return current;
      return [...current, optimisticItem];
    });

    try {
      const res = await api.addToWishlist(productId);
      const nextItems = normalizeWishlistResponse(res);
      if (nextItems.length > 0 || Array.isArray(res?.data)) setItems(nextItems);
      return nextItems;
    } catch (err) {
      // Rollback: remove the optimistic item
      setItems((current) => current.filter((item) => getProductId(item) !== productId));
      throw err;
    }
  }, []);

  const removeFromWishlist = useCallback(async (productId) => {
    let previous = [];
    setItems((current) => {
      previous = current;
      return current.filter((item) => getProductId(item) !== productId);
    });

    const token = localStorage.getItem('eh_token');
    if (!token) {
      try {
        localStorage.setItem('egy_wishlist', JSON.stringify(previous.filter((item) => getProductId(item) !== productId)));
      } catch { /* non-fatal */ }
      return;
    }

    try {
      const res = await api.removeFromWishlist(productId);
      const nextItems = normalizeWishlistResponse(res);
      if (nextItems.length > 0 || Array.isArray(res?.data)) setItems(nextItems);
    } catch (err) {
      // Rollback
      setItems(previous);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    items,
    loading,
    wishlistIds,
    isWishlisted,
    refreshWishlist,
    addToWishlist,
    removeFromWishlist,
  }), [items, loading, wishlistIds, isWishlisted, refreshWishlist, addToWishlist, removeFromWishlist]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
