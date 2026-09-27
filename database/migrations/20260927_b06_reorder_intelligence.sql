-- ============================================================================
-- Migration: 20260927_b06_reorder_intelligence.sql
-- Description: Reorder Intelligence & Stock Replenishment Rules for ERP-Lite
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 06)
-- ============================================================================

-- 1. Ensure reorder columns on products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reorder_point'
  ) THEN
    ALTER TABLE public.products ADD COLUMN reorder_point INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'target_stock'
  ) THEN
    ALTER TABLE public.products ADD COLUMN target_stock INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reorder_enabled'
  ) THEN
    ALTER TABLE public.products ADD COLUMN reorder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_reorder_point_non_neg'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT chk_products_reorder_point_non_neg CHECK (reorder_point >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_target_stock_non_neg'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT chk_products_target_stock_non_neg CHECK (target_stock >= 0);
  END IF;
END $$;

-- 2. Indexes for efficient reorder intelligence queries
CREATE INDEX IF NOT EXISTS idx_products_reorder
  ON public.products (reorder_enabled, stock_qty, reorder_point);
