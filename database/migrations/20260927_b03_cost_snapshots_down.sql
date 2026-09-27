-- ============================================================================
-- Rollback Migration: 20260927_b03_cost_snapshots_down.sql
-- Description: Rollback Historical Cost Snapshots columns and restore Batch 02 RPC
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 03)
-- ============================================================================

DROP INDEX IF EXISTS public.idx_order_items_unit_cost;

ALTER TABLE public.order_items DROP COLUMN IF EXISTS total_cost CASCADE;
ALTER TABLE public.order_items DROP COLUMN IF EXISTS unit_cost CASCADE;
ALTER TABLE public.products DROP COLUMN IF EXISTS cost_price CASCADE;
