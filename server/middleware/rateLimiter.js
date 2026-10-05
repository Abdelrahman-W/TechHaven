// server/middleware/rateLimiter.js
// P1-03 Phase 2 — Shared Rate Limiter Middleware
// Supports SupabaseRateLimitStore in multi-worker production and built-in MemoryStore in local fallback.

import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { SupabaseRateLimitStore, isSupabaseConfigured } from '../lib/SupabaseRateLimitStore.js';
import { extractToken, JWT_SECRET } from './auth.js';

// Shared singleton Supabase store instance when Supabase is configured
const sharedSupabaseStore = isSupabaseConfigured ? new SupabaseRateLimitStore() : null;

/**
 * Extract identity key from Express request.
 * Prioritizes authenticated user ID (from req.user or valid Authorization Bearer token),
 * falling back to client IP.
 *
 * @param {import('express').Request} req
 * @returns {string} Identity key
 */
export const generateIdentityKey = (req) => {
  // 1. Authenticated user already set on req.user
  if (req.user && (req.user.id || req.user.userId)) {
    return `user:${req.user.id || req.user.userId}`;
  }

  // 2. Token present in Authorization header (without requiring previous auth middleware)
  const token = extractToken(req);
  const secret = process.env.JWT_SECRET || JWT_SECRET;
  if (token && secret) {
    try {
      const decoded = jwt.verify(token, secret);
      if (decoded && decoded.userId) {
        return `user:${decoded.userId}`;
      }
    } catch {
      // Invalid or expired token: fall through to IP identity
    }
  }

  // 3. Anonymous client identifier by IP
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return `ip:${ip}`;
};

/**
 * Express-Rate-Limit Store Adapter for SupabaseRateLimitStore
 */
export class SupabaseExpressStoreAdapter {
  constructor(options = {}) {
    this.scope = options.scope || 'api';
    this.store = options.store || sharedSupabaseStore;
    this.windowMs = options.windowMs || 60000;
    this.limit = options.limit || 1000;
    this.localKeys = false; // Signals distributed shared store to express-rate-limit
  }

  init(options) {
    if (options.windowMs) this.windowMs = options.windowMs;
    if (typeof options.max === 'number') this.limit = options.max;
    if (typeof options.limit === 'number') this.limit = options.limit;
  }

  async increment(key) {
    if (!this.store || !this.store.isConfigured) {
      return {
        totalHits: 1,
        resetTime: undefined,
      };
    }

    const result = await this.store.checkLimit(
      key,
      this.scope,
      this.limit,
      this.windowMs
    );

    if (result.storeUnavailable) {
      const failClosed = this.scope === 'auth' || this.scope === 'admin';
      console.error(`[P1-03] Rate limit store unavailable for scope [${this.scope}], key [${key}]; failing ${failClosed ? 'closed' : 'open'}.`);
      return {
        totalHits: failClosed ? this.limit + 1 : 0,
        resetTime: failClosed ? new Date(Date.now() + this.windowMs) : undefined,
      };
    }

    const totalHits = result.currentCount !== undefined
      ? result.currentCount
      : (result.allowed ? Math.max(1, this.limit - (result.remaining ?? 0)) : (this.limit + 1));

    return {
      totalHits,
      resetTime: result.resetAt || new Date(Date.now() + this.windowMs),
    };
  }

  async decrement() {
    // Atomic shared store does not decrement; no-op
  }

  async resetKey() {
    // Optional reset hook
  }
}

/**
 * Factory to create rate limiter middleware instances.
 */
export function createLimiter({ windowMs, max, scope, message, customStore }) {
  const store = customStore !== undefined
    ? customStore
    : (sharedSupabaseStore
        ? new SupabaseExpressStoreAdapter({ scope, store: sharedSupabaseStore, windowMs, limit: max })
        : undefined);

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateIdentityKey,
    store,
    validate: false,
  });
}

// ── General API Limiter (1,000 req/min) ────────────────────────
export const rateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 1000,
  scope: 'api',
  message: {
    error: 'كثرة طلباتك، حاول مرة أخرى بعد قليل',
    code: 'RATE_LIMITED',
    retryAfter: 60,
  },
});

// ── Auth Limiter (30 req/min) ──────────────────────────────────
export const authLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  scope: 'auth',
  message: {
    error: 'كثرة محاولات الدخول، حاول بعد دقيقة',
    code: 'AUTH_RATE_LIMITED',
  },
});

// ── Admin Limiter (2,000 req/min) ──────────────────────────────
export const adminLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 2000,
  scope: 'admin',
  message: {
    error: 'كثرة طلبات الإدارة',
    code: 'ADMIN_RATE_LIMITED',
  },
});
