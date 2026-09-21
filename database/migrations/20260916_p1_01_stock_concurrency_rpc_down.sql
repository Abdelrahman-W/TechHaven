-- ============================================================================
-- Rollback Migration: 20260916_p1_01_stock_concurrency_rpc_down.sql
-- Description: Drops public.process_order_checkout function
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_order_checkout(
  UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, JSONB, JSONB
);

-- Drop any alternate signatures
DROP FUNCTION IF EXISTS public.process_order_checkout;
