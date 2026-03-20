type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = 'query-cache:v2:';

function getStorageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      if (canUseSessionStorage()) {
        window.sessionStorage.removeItem(getStorageKey(key));
      }
      return null;
    }

    return entry.value as T;
  }

  if (!canUseSessionStorage()) return null;

  const rawEntry = window.sessionStorage.getItem(getStorageKey(key));
  if (!rawEntry) return null;

  try {
    const parsed = JSON.parse(rawEntry) as CacheEntry<T>;
    if (Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return null;
    }

    cache.set(key, parsed as CacheEntry<unknown>);
    return parsed.value;
  } catch {
    window.sessionStorage.removeItem(getStorageKey(key));
    return null;
  }
}

export function writeCache<T>(key: string, value: T, ttlMs = 30_000) {
  const entry = {
    value,
    expiresAt: Date.now() + ttlMs,
  };

  cache.set(key, entry);

  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  }
}

export function invalidateCache(key: string) {
  cache.delete(key);
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(getStorageKey(key));
  }
}

export function invalidateCacheByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }

  if (!canUseSessionStorage()) return;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const storageKey = window.sessionStorage.key(index);
    if (!storageKey?.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    const cacheKey = storageKey.slice(STORAGE_PREFIX.length);
    if (cacheKey.startsWith(prefix)) {
      window.sessionStorage.removeItem(storageKey);
    }
  }
}

export function updateCacheByPrefix<T>(prefix: string, updater: (value: T, key: string) => T | null) {
  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      if (canUseSessionStorage()) {
        window.sessionStorage.removeItem(getStorageKey(key));
      }
      continue;
    }

    const nextValue = updater(entry.value as T, key);
    if (nextValue === null) {
      invalidateCache(key);
      continue;
    }

    writeCache(key, nextValue, Math.max(1, entry.expiresAt - Date.now()));
  }

  if (!canUseSessionStorage()) return;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const storageKey = window.sessionStorage.key(index);
    if (!storageKey?.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    const cacheKey = storageKey.slice(STORAGE_PREFIX.length);
    if (!cacheKey.startsWith(prefix) || cache.has(cacheKey)) {
      continue;
    }

    const rawEntry = window.sessionStorage.getItem(storageKey);
    if (!rawEntry) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawEntry) as CacheEntry<T>;
      if (Date.now() > parsed.expiresAt) {
        window.sessionStorage.removeItem(storageKey);
        continue;
      }

      const nextValue = updater(parsed.value, cacheKey);
      if (nextValue === null) {
        window.sessionStorage.removeItem(storageKey);
        continue;
      }

      writeCache(cacheKey, nextValue, Math.max(1, parsed.expiresAt - Date.now()));
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }
}

export function readAllCacheByPrefix<T>(prefix: string) {
  const entries = new Map<string, T>();

  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      if (canUseSessionStorage()) {
        window.sessionStorage.removeItem(getStorageKey(key));
      }
      continue;
    }

    entries.set(key, entry.value as T);
  }

  if (!canUseSessionStorage()) {
    return Array.from(entries.values());
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const storageKey = window.sessionStorage.key(index);
    if (!storageKey?.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    const cacheKey = storageKey.slice(STORAGE_PREFIX.length);
    if (!cacheKey.startsWith(prefix) || entries.has(cacheKey)) {
      continue;
    }

    const rawEntry = window.sessionStorage.getItem(storageKey);
    if (!rawEntry) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawEntry) as CacheEntry<T>;
      if (Date.now() > parsed.expiresAt) {
        window.sessionStorage.removeItem(storageKey);
        continue;
      }

      entries.set(cacheKey, parsed.value);
      cache.set(cacheKey, parsed as CacheEntry<unknown>);
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }

  return Array.from(entries.values());
}
