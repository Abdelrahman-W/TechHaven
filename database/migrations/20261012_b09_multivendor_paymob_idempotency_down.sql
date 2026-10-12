-- ============================================================================
-- Rollback Migration: 20261012_b09_multivendor_paymob_idempotency_down.sql
-- Description: Revert Multi-Vendor Marketplace & Paymob Idempotency Tables
-- ============================================================================

DROP TABLE IF EXISTS public.paymob_transactions CASCADE;
DROP TABLE IF EXISTS public.sellers CASCADE;

-- Remove added columns from products and order_items if needed
ALTER TABLE public.products DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS seller_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS seller_name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    ALTER TABLE public.order_items DROP COLUMN IF EXISTS vendor_id;
    ALTER TABLE public.order_items DROP COLUMN IF EXISTS commission_amount;
    ALTER TABLE public.order_items DROP COLUMN IF EXISTS vendor_payout_amount;
  END IF;
END $$;
