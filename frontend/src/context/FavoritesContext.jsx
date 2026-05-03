import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPost, apiDelete } from '../api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isBuyer = user?.role === 'BUYER';

  const refresh = useCallback(async () => {
    if (!isBuyer) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/buyer/favorites');
      setFavorites(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load favorites.');
    } finally {
      setLoading(false);
    }
  }, [isBuyer]);

  useEffect(() => { refresh(); }, [refresh]);

  // Fast-lookup sets keyed by `${type}:${id}` and the favorite-row id for unfavorite calls.
  const indexed = useMemo(() => {
    const byKey = new Map();
    for (const f of favorites) {
      byKey.set(`${f.targetType}:${f.targetId}`, f);
    }
    return byKey;
  }, [favorites]);

  const isFavorited = useCallback((targetType, targetId) => {
    return indexed.has(`${targetType}:${targetId}`);
  }, [indexed]);

  const toggle = useCallback(async (targetType, targetId) => {
    const existing = indexed.get(`${targetType}:${targetId}`);
    if (existing) {
      // Optimistic remove
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      try {
        await apiDelete(`/buyer/favorites/${existing.id}`);
      } catch (e) {
        // Roll back on failure
        setFavorites(prev => [existing, ...prev]);
        setError(e?.message || 'Could not remove favorite.');
        return { ok: false };
      }
      return { ok: true, action: 'removed' };
    } else {
      try {
        const created = await apiPost('/buyer/favorites', null, { targetType, targetId });
        if (created) setFavorites(prev => [created, ...prev]);
        return { ok: true, action: 'added' };
      } catch (e) {
        setError(e?.message || 'Could not save favorite.');
        return { ok: false };
      }
    }
  }, [indexed]);

  const listingFavorites = useMemo(
    () => favorites.filter(f => f.targetType === 'LISTING'),
    [favorites]
  );
  const vendorFavorites = useMemo(
    () => favorites.filter(f => f.targetType === 'VENDOR'),
    [favorites]
  );

  return (
    <FavoritesContext.Provider value={{
      favorites, listingFavorites, vendorFavorites,
      loading, error,
      refresh, toggle, isFavorited,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
