// Cache utility functions
export const CACHE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  RECENT_CONVERSIONS: 'recent_conversions',
  AUTH_STATE: 'auth_state'
} as const;

export const CACHE_EXPIRY = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 60 * 60 * 1000, // 1 hour
  LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiry: number;
}

export function setCache<T>(key: string, value: T, expiry: number): void {
  const item: CacheItem<T> = {
    value,
    timestamp: Date.now(),
    expiry
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export function getCache<T>(key: string): T | null {
  const item = localStorage.getItem(key);
  if (!item) return null;

  const cached: CacheItem<T> = JSON.parse(item);
  const now = Date.now();

  if (now - cached.timestamp > cached.expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return cached.value;
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(key);
  } else {
    localStorage.clear();
  }
}

// Memory cache for frequently accessed data
const memoryCache = new Map<string, CacheItem<any>>();

export function setMemoryCache<T>(key: string, value: T, expiry: number): void {
  memoryCache.set(key, {
    value,
    timestamp: Date.now(),
    expiry
  });
}

export function getMemoryCache<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;

  const now = Date.now();
  if (now - item.timestamp > item.expiry) {
    memoryCache.delete(key);
    return null;
  }

  return item.value;
}

// Clean up expired memory cache items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (now - item.timestamp > item.expiry) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean up every minute