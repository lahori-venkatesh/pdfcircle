import { CachedOperation, CachedSettings } from '../types/cache';
import { setCache, getCache, CACHE_KEYS, CACHE_EXPIRY } from './cache';
import { useAuth } from '../contexts/AuthContext';

const MAX_RECENT_OPERATIONS = 10;

export function useOperationsCache() {
  const { user } = useAuth();
  const userId = user?.id;

  const saveOperation = (operation: Omit<CachedOperation, 'id' | 'timestamp'>) => {
    if (!userId) return;

    const key = CACHE_KEYS.RECENT_CONVERSIONS + '-' + userId;
    const recent = getCache<CachedOperation[]>(key) || [];

    const newOperation: CachedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updated = [newOperation, ...recent].slice(0, MAX_RECENT_OPERATIONS);
    setCache(key, updated, CACHE_EXPIRY.MEDIUM);

    return newOperation;
  };

  const getRecentOperations = () => {
    if (!userId) return [];
    return getCache<CachedOperation[]>(CACHE_KEYS.RECENT_CONVERSIONS + '-' + userId) || [];
  };

  const saveSettings = (tool: string, settings: Partial<CachedSettings>) => {
    if (!userId) return;
    
    const key = CACHE_KEYS.USER_PREFERENCES + '-' + userId + '-' + tool;
    const current = getCache<CachedSettings>(key) || {};
    const updated = { ...current, ...settings };
    setCache(key, updated, CACHE_EXPIRY.LONG);
  };

  const getSettings = (tool: string): Partial<CachedSettings> | null => {
    if (!userId) return null;
    return getCache<CachedSettings>(CACHE_KEYS.USER_PREFERENCES + '-' + userId + '-' + tool);
  };

  return {
    saveOperation,
    getRecentOperations,
    saveSettings,
    getSettings,
  };
}