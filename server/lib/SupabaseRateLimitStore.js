// server/lib/SupabaseRateLimitStore.js
// P1-03 — Supabase Shared Rate Limit Store
// Atomic shared counter for multi-worker rate limiting via PostgreSQL RPC

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export class SupabaseRateLimitStore {
  constructor(options = {}) {
    this.client =
      options.client ||
      (isSupabaseConfigured
        ? createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false },
            db: { schema: 'public' },
          })
        : null);
    this.isConfigured =
      options.isConfigured !== undefined
        ? options.isConfigured
        : Boolean(this.client && isSupabaseConfigured);
    this.timeoutMs = options.timeoutMs || 1500;
  }

  /**
   * Atomic check-and-increment via PostgreSQL RPC.
   * Deterministically buckets window start and executes check_rate_limit RPC.
   *
   * @param {string} identityKey - Client identifier (IP, user ID, etc.)
   * @param {string} scope - Endpoint or route scope (e.g. 'auth:login', 'api:global')
   * @param {number} limit - Maximum allowed requests in the window
   * @param {number} [windowMs=60000] - Window duration in milliseconds (default 60s)
   * @returns {Promise<{ allowed: boolean, remaining: number|null, resetAt: Date|null, storeUnavailable: boolean }>}
   */
  async checkLimit(identityKey, scope, limit, windowMs = 60000) {
    if (!this.isConfigured || !this.client) {
      return {
        allowed: true,
        remaining: null,
        resetAt: null,
        storeUnavailable: true,
      };
    }

    if (
      !identityKey ||
      typeof identityKey !== 'string' ||
      !scope ||
      typeof scope !== 'string' ||
      typeof limit !== 'number' ||
      limit <= 0
    ) {
      return {
        allowed: true,
        remaining: null,
        resetAt: null,
        storeUnavailable: true,
      };
    }

    const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
    const now = Date.now();
    // Deterministic client-side bucketing aligned to the window interval
    const bucketedStartTimestamp = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
    const windowStartISO = new Date(bucketedStartTimestamp).toISOString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const { data, error } = await this.client.rpc(
        'check_rate_limit',
        {
          p_identity_key: identityKey,
          p_scope: scope,
          p_window_start: windowStartISO,
          p_limit: limit,
          p_window_seconds: windowSeconds,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (error) {
        console.error('[P1-03] RPC error:', error.message);
        return {
          allowed: true,
          remaining: null,
          resetAt: null,
          storeUnavailable: true,
        };
      }

      if (!data || typeof data.allowed !== 'boolean' || !data.reset_at) {
        console.error('[P1-03] Malformed RPC response:', data);
        return {
          allowed: true,
          remaining: null,
          resetAt: null,
          storeUnavailable: true,
        };
      }

      return {
        allowed: data.allowed,
        remaining: typeof data.remaining === 'number' ? data.remaining : 0,
        resetAt: new Date(data.reset_at),
        storeUnavailable: false,
        currentCount: typeof data.current_count === 'number' ? data.current_count : undefined,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[P1-03] Store checkLimit exception:', err.message);
      return {
        allowed: true,
        remaining: null,
        resetAt: null,
        storeUnavailable: true,
      };
    }
  }

  /**
   * Clean up expired rate limit rows (maintenance).
   * @param {number} [retentionHours=1]
   */
  async cleanupExpired(retentionHours = 1) {
    if (!this.isConfigured || !this.client) return;

    try {
      const { error } = await this.client.rpc('purge_expired_rate_limits', {
        p_retention_hours: retentionHours,
      });
      if (error) {
        console.error('[P1-03] Cleanup RPC error:', error.message);
      }
    } catch (err) {
      console.error('[P1-03] Cleanup exception:', err.message);
    }
  }
}

export default SupabaseRateLimitStore;
