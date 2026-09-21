-- ==============================================================================
-- Migration: 20260917_p1_03_rate_limit_store.sql
-- Description: Shared Rate-Limit Store Table for Multi-Worker Rate Limiting
-- Author: TechHaven Architecture Team (P1-03 Phase 1 Remediation)
-- ==============================================================================

-- Ensure uuid-ossp extension is enabled (matches P1-01 convention)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- Table: rate_limits
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_key TEXT NOT NULL,
    scope TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate counter rows for same identity/window/scope
    CONSTRAINT rate_limits_unique UNIQUE (identity_key, scope, window_start)
);

-- ------------------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------------------
-- Composite index for identity + scope lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_rate_limits_identity_scope 
    ON public.rate_limits (identity_key, scope);

-- Index for window-based cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
    ON public.rate_limits (window_start);

-- Index for finding stale records for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at 
    ON public.rate_limits (updated_at);

-- ------------------------------------------------------------------------------
-- Security & Row Level Security (RLS)
-- ------------------------------------------------------------------------------
-- Enable Row Level Security (no policies defined for public/anon/authenticated)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Revoke direct table privileges from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limits FROM anon;
REVOKE ALL ON TABLE public.rate_limits FROM authenticated;

-- Grant table privileges exclusively to backend service_role
GRANT ALL ON TABLE public.rate_limits TO service_role;

-- ------------------------------------------------------------------------------
-- Atomic RPC: check_rate_limit
-- ------------------------------------------------------------------------------
-- Performs atomic check-and-increment with authoritative database window bucketing.
-- 
-- Parameters:
--   p_identity_key: Client identifier (IP, user ID, etc.)
--   p_scope: Route/action scope (e.g. 'auth:login', 'api:global')
--   p_window_start: Optional client-suggested window timestamp
--   p_limit: Maximum allowed requests in the window
--   p_window_seconds: Window duration in seconds (default 60)
-- 
-- Returns:
--   { allowed: boolean, remaining: integer, reset_at: timestamptz, current_count: bigint }
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identity_key TEXT,
    p_scope TEXT,
    p_window_start TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 60,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_win_sec INTEGER;
    v_window_start TIMESTAMPTZ;
    v_count BIGINT;
    v_allowed BOOLEAN;
    v_remaining INTEGER;
    v_reset_at TIMESTAMPTZ;
BEGIN
    -- Input validation
    IF p_identity_key IS NULL OR TRIM(p_identity_key) = '' THEN
        RAISE EXCEPTION 'identity_key is required';
    END IF;
    IF p_scope IS NULL OR TRIM(p_scope) = '' THEN
        RAISE EXCEPTION 'scope is required';
    END IF;
    IF p_limit IS NULL OR p_limit <= 0 THEN
        RAISE EXCEPTION 'limit must be a positive integer';
    END IF;

    v_win_sec := COALESCE(p_window_seconds, 60);
    IF v_win_sec <= 0 THEN
        v_win_sec := 60;
    END IF;

    -- Authoritative window bucketing:
    -- If p_window_start is provided, align/floor it to v_win_sec bucket.
    -- If NULL, floor current database time NOW() to v_win_sec bucket.
    IF p_window_start IS NOT NULL THEN
        v_window_start := to_timestamp(floor(extract(epoch from p_window_start) / v_win_sec) * v_win_sec);
    ELSE
        v_window_start := to_timestamp(floor(extract(epoch from now()) / v_win_sec) * v_win_sec);
    END IF;

    -- Atomic upsert: insert initial counter or increment existing counter
    INSERT INTO public.rate_limits (identity_key, scope, window_start, request_count, created_at, updated_at)
    VALUES (p_identity_key, p_scope, v_window_start, 1, NOW(), NOW())
    ON CONFLICT (identity_key, scope, window_start)
    DO UPDATE SET 
        request_count = public.rate_limits.request_count + 1,
        updated_at = NOW()
    RETURNING public.rate_limits.request_count INTO v_count;

    -- Evaluate verdict
    v_allowed := (v_count <= p_limit);
    v_remaining := GREATEST(0, p_limit - v_count);
    v_reset_at := v_window_start + (v_win_sec || ' seconds')::INTERVAL;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'remaining', v_remaining,
        'reset_at', v_reset_at,
        'current_count', v_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- Cleanup function: purge_expired_rate_limits
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits(
    p_retention_hours INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INTEGER;
    v_retention INTEGER;
BEGIN
    v_retention := COALESCE(p_retention_hours, 1);
    IF v_retention < 0 THEN
        v_retention := 1;
    END IF;

    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - (v_retention || ' hours')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- ------------------------------------------------------------------------------
-- Function Permissions (Server-Only Access)
-- ------------------------------------------------------------------------------
-- Revoke all function permissions from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) FROM authenticated;

REVOKE ALL ON FUNCTION public.purge_expired_rate_limits(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_rate_limits(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.purge_expired_rate_limits(INTEGER) FROM authenticated;

-- Grant execution ONLY to server service_role
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits(INTEGER) TO service_role;
