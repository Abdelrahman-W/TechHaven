-- ============================================================================
-- Migration Down: 20260927_b06_reorder_intelligence_down.sql
-- Description: Rollback Reorder Intelligence columns and indexes
-- ============================================================================

DROP INDEX IF EXISTS public.idx_products_reorder;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reorder_enabled'
  ) THEN
    ALTER TABLE public.products DROP COLUMN reorder_enabled;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'target_stock'
  ) THEN
    ALTER TABLE public.products DROP COLUMN target_stock;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reorder_point'
  ) THEN
    ALTER TABLE public.products DROP COLUMN reorder_point;
  END IF;
END $$;
