-- ============================================================================
-- Migration Down: 20260927_b05_receiving_wac_down.sql
-- Description: Rollback Purchase Order Receiving Workflow & WAC
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_purchase_order_receiving(UUID, JSONB, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS public.receiving_items CASCADE;
DROP TABLE IF EXISTS public.receivings CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'receiving_status'
  ) THEN
    ALTER TABLE public.purchase_orders DROP COLUMN receiving_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'received_quantity'
  ) THEN
    ALTER TABLE public.purchase_order_items DROP COLUMN received_quantity;
  END IF;
END $$;
