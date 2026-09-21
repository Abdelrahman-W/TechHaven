import cluster from 'cluster';
import { CacheProvider } from '../cache/CacheProvider.js';
import { MemoryCacheProvider } from '../cache/MemoryCacheProvider.js';

let activeProvider = new MemoryCacheProvider();

/**
 * Returns the currently active CacheProvider instance.
 * @returns {CacheProvider}
 */
export function getCacheProvider() {
  return activeProvider;
}

/**
 * Replaces the active CacheProvider instance (useful for testing or custom providers).
 * @param {CacheProvider} provider
 */
export function setCacheProvider(provider) {
  if (provider && typeof provider.get === 'function' && typeof provider.set === 'function') {
    activeProvider = provider;
  }
}

/**
 * Explicit route path prefixes that MUST NEVER be cached under any circumstances.
 * These endpoints handle private user state, financial transactions, authentication,
 * or administrative/confidential operations.
 */
const FORBIDDEN_CACHE_PREFIXES = [
  '/api/cart',
  '/api/wishlist',
  '/api/auth',
  '/api/orders',
  '/api/payments',
  '/api/admin',
  '/api/b2b',
  '/api/analytics',
];

/**
 * Standard cache scopes and their corresponding route path prefixes.
 */
export const SCOPES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
};

/**
 * Normalizes request URL by sorting query parameters alphabetically
 * and stripping redundant trailing slashes to prevent duplicate cache entries.
 */
export function getNormalizedCacheKey(req) {
  try {
    const rawUrl = req.originalUrl || req.url || '/';
    const url = new URL(rawUrl, 'http://localhost');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(url.searchParams);
    params.sort();
    const sortedQuery = params.toString();
    return sortedQuery ? `${pathname}?${sortedQuery}` : pathname;
  } catch {
    return (req.originalUrl || req.url || '/').replace(/\/+$/, '') || '/';
  }
}

/**
 * Checks whether a request must strictly bypass the cache.
 */
export function shouldBypassCache(req) {
  const headers = req.headers || {};

  // 1. Only GET requests are eligible for caching
  if (req.method !== 'GET') {
    return true;
  }

  // 2. Explicit bypass headers
  if (headers['x-bypass-cache'] === 'true' || headers['cache-control'] === 'no-cache') {
    return true;
  }

  // 3. Authenticated requests with Authorization header must never share cached responses
  if (headers.authorization) {
    return true;
  }

  // 4. Forbidden private/admin/transactional paths
  const path = (req.originalUrl || req.url || '').toLowerCase();
  for (const prefix of FORBIDDEN_CACHE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      return true;
    }
  }

  return false;
}

/**
 * Route-level Cache Middleware with strict safety guards.
 *
 * @param {number} ttlSeconds - Time to live in seconds
 */
export const cacheMiddleware = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Check safety bypass rules
    if (shouldBypassCache(req)) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Client browsers must revalidate and never serve stale cached responses
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');

    const key = getNormalizedCacheKey(req);
    let cachedResponse;

    try {
      cachedResponse = await activeProvider.get(key);
    } catch {
      // Safe degradation: provider failure must never crash or block the request
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    if (cachedResponse !== undefined && cachedResponse !== null) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json;

    res.json = function (body) {
      // Restore original function
      res.json = originalJson;

      // Only cache successful (2xx) responses — never cache error or redirect responses
      // Never cache if response contains sensitive headers like Set-Cookie
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      const hasSetCookie = !!res.getHeader('set-cookie');

      if (isSuccess && !hasSetCookie) {
        try {
          Promise.resolve(activeProvider.set(key, body, ttlSeconds)).catch(() => {});
        } catch {
          // Safe degradation: provider set errors must never disrupt response
        }
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Invalidates cache entries matching a substring pattern or scope name,
 * and broadcasts an IPC invalidation message to sibling workers when running in cluster mode.
 *
 * @param {string} patternOrScope - Substring path (e.g. '/api/products') or scope (e.g. 'products')
 * @param {object} [options]
 * @param {string} [options.scope] - Logical scope ('products', 'categories', 'settings')
 * @param {boolean} [options.fromIPC] - True if this invalidation was received from IPC (prevents echo loops)
 */
export const invalidateCache = (patternOrScope, options = {}) => {
  if (!patternOrScope || typeof patternOrScope !== 'string') return;

  // 1. Invalidate active provider cache
  try {
    activeProvider.clear(patternOrScope);
  } catch {
    // Safe degradation: provider error must never disrupt mutations
  }

  // 2. Broadcast to primary via Node.js Cluster IPC (if running in cluster worker mode)
  if (!options.fromIPC && cluster.isWorker && typeof process.send === 'function') {
    try {
      const payload = {
        type: 'CACHE_INVALIDATE',
        scope: options.scope || patternOrScope,
        pattern: patternOrScope,
        sourceWorkerId: cluster.worker ? cluster.worker.id : process.pid,
      };
      process.send(payload);
    } catch {
      // Safe degradation: IPC errors must never disrupt business mutations
    }
  }
};

/**
 * Handles incoming IPC message on primary process and broadcasts
 * cache invalidations to all sibling workers (excluding the origin worker).
 *
 * @param {object} clusterModule - Node cluster module or mock
 * @param {object} sourceWorker - Worker that sent the message
 * @param {object} message - IPC message payload
 */
export function handlePrimaryIPCMessage(clusterModule, sourceWorker, message) {
  if (!message || typeof message !== 'object') return;
  if (message.type !== 'CACHE_INVALIDATE') return;

  const pattern = message.pattern || message.scope;
  if (!pattern || typeof pattern !== 'string') return;

  const sourceWorkerId = message.sourceWorkerId !== undefined
    ? message.sourceWorkerId
    : (sourceWorker ? sourceWorker.id : null);

  const workers = clusterModule?.workers;
  if (!workers) return;

  for (const id in workers) {
    const targetWorker = workers[id];
    if (!targetWorker) continue;

    // Exclude originating worker
    if (targetWorker.id === sourceWorkerId) continue;

    // Safely verify connection state before sending
    const isConnected = typeof targetWorker.isConnected === 'function'
      ? targetWorker.isConnected()
      : true;
    const isDead = typeof targetWorker.isDead === 'function'
      ? targetWorker.isDead()
      : false;

    if (isConnected && !isDead) {
      try {
        targetWorker.send({
          type: 'CACHE_INVALIDATE',
          scope: message.scope || pattern,
          pattern: pattern,
          sourceWorkerId: sourceWorkerId,
        });
      } catch {
        // Safe degradation: ignore if worker died or closed connection during broadcast
      }
    }
  }
}

/**
 * Registers primary process IPC cache invalidation listener.
 *
 * @param {object} [clusterModule=cluster]
 */
export function setupPrimaryCacheIPC(clusterModule = cluster) {
  if (!clusterModule || !clusterModule.isPrimary) return;
  clusterModule.on('message', (worker, message) => {
    handlePrimaryIPCMessage(clusterModule, worker, message);
  });
}

/**
 * Handles incoming IPC invalidation message in a worker process.
 *
 * @param {object} message - IPC message payload
 */
export function handleWorkerIPCMessage(message) {
  if (!message || typeof message !== 'object') return;
  if (message.type !== 'CACHE_INVALIDATE') return;

  const pattern = message.pattern || message.scope;
  if (typeof pattern === 'string' && pattern.length > 0) {
    invalidateCache(pattern, { fromIPC: true });
  }
}

// Automatically attach worker message listener if running in cluster worker mode
if (cluster.isWorker && typeof process.on === 'function') {
  process.on('message', (message) => {
    try {
      handleWorkerIPCMessage(message);
    } catch {
      // Safe degradation: malformed or unexpected IPC message never crashes worker
    }
  });
}

/**
 * Clears all cache entries (utility for testing and system resets).
 */
export const clearAllCache = () => {
  try {
    activeProvider.clear();
  } catch {
    // Safe degradation
  }
};

/**
 * Returns current cache size (utility for testing and observability).
 */
export const getCacheSize = () => {
  return activeProvider.size || 0;
};

export { CacheProvider, MemoryCacheProvider };
