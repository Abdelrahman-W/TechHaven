/**
 * Abstract Base CacheProvider Interface.
 * Defines the pluggable cache contract for derived data caching in TechHaven.
 *
 * NOTE: The cache provider is strictly for derived, transient data.
 * Authoritative transactional data (Cart, Wishlist, Auth, Orders, Settings)
 * MUST NEVER be backed by this cache.
 */
export class CacheProvider {
  /**
   * Retrieves a cached value by key.
   * @param {string} key
   * @returns {Promise<any>|any} The cached data or undefined/null if missing/expired.
   */
  get() {
    throw new Error(`get() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Stores a value in the cache with a time-to-live (TTL).
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - Time-to-live in seconds
   * @returns {Promise<void>|void}
   */
  set() {
    throw new Error(`set() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Deletes a specific cache key.
   * @param {string} key
   * @returns {Promise<boolean>|boolean}
   */
  delete() {
    throw new Error(`delete() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Checks if a key exists and is unexpired.
   * @param {string} key
   * @returns {Promise<boolean>|boolean}
   */
  has() {
    throw new Error(`has() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Clears all cache entries or entries matching a scope/pattern.
   * @param {string} [patternOrScope] - Substring pattern or logical scope name (e.g. 'products', '/api/products')
   * @returns {Promise<void>|void}
   */
  clear() {
    throw new Error(`clear() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Returns the count of cached entries.
   * @returns {number}
   */
  get size() {
    throw new Error(`size must be implemented by ${this.constructor.name}`);
  }
}
