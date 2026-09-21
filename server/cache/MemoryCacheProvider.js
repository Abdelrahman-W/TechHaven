import { CacheProvider } from './CacheProvider.js';

const DEFAULT_MAX_SIZE = 1000;

const SCOPE_TO_PATTERNS = {
  products: ['/api/products'],
  categories: ['/api/categories'],
  settings: ['/api/settings'],
};

/**
 * In-memory Map Cache Provider.
 * Preserves the exact high-performance, process-local memory caching semantics
 * used across TechHaven.
 */
export class MemoryCacheProvider extends CacheProvider {
  /**
   * @param {object} [options]
   * @param {number} [options.maxSize=1000] - Maximum number of entries before eviction
   * @param {number} [options.cleanupIntervalMs=300000] - Background cleanup interval (default 5m)
   */
  constructor(options = {}) {
    super();
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.cache = new Map();

    const intervalMs = options.cleanupIntervalMs !== undefined ? options.cleanupIntervalMs : 5 * 60 * 1000;
    if (intervalMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanExpiredEntries(), intervalMs);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Removes expired entries from the in-memory map.
   */
  cleanExpiredEntries() {
    const now = Date.now();
    for (const [key, val] of this.cache.entries()) {
      if (now >= val.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Retrieves cached data if key exists and is unexpired.
   * @param {string} key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    if (!key || typeof key !== 'string') return undefined;
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() >= entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Stores value in cache with TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds=300]
   */
  set(key, value, ttlSeconds = 300) {
    if (!key || typeof key !== 'string') return;

    // Evict oldest entry if capacity is reached
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Deletes a specific key.
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    if (!key || typeof key !== 'string') return false;
    return this.cache.delete(key);
  }

  /**
   * Checks if key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Clears all cache entries or entries matching a substring pattern / scope.
   * @param {string} [patternOrScope]
   */
  clear(patternOrScope) {
    if (!patternOrScope) {
      this.cache.clear();
      return;
    }

    if (typeof patternOrScope !== 'string') return;

    const patterns = SCOPE_TO_PATTERNS[patternOrScope] || [patternOrScope];
    for (const pat of patterns) {
      for (const key of this.cache.keys()) {
        if (key.includes(pat)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Current number of entries in the cache.
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Stops background cleanup timer and clears cache (useful for teardown).
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}
