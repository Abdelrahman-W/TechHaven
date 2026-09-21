-- ==============================================================================
-- Rollback: 20260917_p1_03_rate_limit_store_down.sql
-- Description: Remove P1-03 Shared Rate-Limit Store objects
-- ==============================================================================

DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS public.purge_expired_rate_limits(INTEGER);
DROP TABLE IF EXISTS public.rate_limits;

-- Note: uuid-ossp extension is shared with P1-01, so it is intentionally NOT dropped here.
