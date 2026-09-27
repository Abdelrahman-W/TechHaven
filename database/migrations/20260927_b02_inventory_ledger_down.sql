-- ============================================================================
-- Rollback Migration: 20260927_b02_inventory_ledger_down.sql
-- Description: Rollback Inventory Movement Ledger and Restore P1-01 RPC
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 02)
-- ============================================================================

DROP FUNCTION IF EXISTS public.adjust_product_inventory(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS public.inventory_movements CASCADE;
