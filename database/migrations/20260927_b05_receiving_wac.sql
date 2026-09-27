-- ============================================================================
-- Migration: 20260927_b05_receiving_wac.sql
-- Description: Purchase Order Receiving Workflow & Weighted Average Cost (WAC)
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 05)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure columns on purchase_order_items for received tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'received_quantity'
  ) THEN
    ALTER TABLE public.purchase_order_items ADD COLUMN received_quantity INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_poi_received_qty'
  ) THEN
    ALTER TABLE public.purchase_order_items
    ADD CONSTRAINT chk_poi_received_qty CHECK (received_quantity >= 0 AND received_quantity <= quantity);
  END IF;
END $$;

-- 2. Ensure receiving_status on purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'receiving_status'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN receiving_status TEXT NOT NULL DEFAULT 'UNRECEIVED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_po_receiving_status'
  ) THEN
    ALTER TABLE public.purchase_orders
    ADD CONSTRAINT chk_po_receiving_status CHECK (receiving_status IN ('UNRECEIVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'));
  END IF;
END $$;

-- 3. Table: receivings
CREATE TABLE IF NOT EXISTS public.receivings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  notes TEXT,
  received_by TEXT,
  total_items_count INT NOT NULL DEFAULT 0,
  total_received_qty INT NOT NULL DEFAULT 0,
  total_receipt_value NUMERIC NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on receivings
CREATE INDEX IF NOT EXISTS idx_receivings_po_id
  ON public.receivings(purchase_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receivings_supplier_id
  ON public.receivings(supplier_id);

CREATE INDEX IF NOT EXISTS idx_receivings_number
  ON public.receivings(receiving_number);

-- 4. Table: receiving_items
CREATE TABLE IF NOT EXISTS public.receiving_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_id UUID NOT NULL REFERENCES public.receivings(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  received_quantity INT NOT NULL CHECK (received_quantity > 0),
  unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
  old_stock INT NOT NULL DEFAULT 0,
  new_stock INT NOT NULL DEFAULT 0,
  old_cost_price NUMERIC,
  new_cost_price NUMERIC NOT NULL CHECK (new_cost_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receiving_item_total CHECK (total_cost = received_quantity * unit_cost)
);

-- Indexes on receiving_items
CREATE INDEX IF NOT EXISTS idx_receiving_items_receiving_id
  ON public.receiving_items(receiving_id);

CREATE INDEX IF NOT EXISTS idx_receiving_items_product_id
  ON public.receiving_items(product_id);

-- Enable RLS
ALTER TABLE public.receivings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'receivings' AND policyname = 'receivings_service_role_all'
  ) THEN
    CREATE POLICY receivings_service_role_all ON public.receivings FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'receiving_items' AND policyname = 'receiving_items_service_role_all'
  ) THEN
    CREATE POLICY receiving_items_service_role_all ON public.receiving_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. RPC: process_purchase_order_receiving
CREATE OR REPLACE FUNCTION public.process_purchase_order_receiving(
  p_purchase_order_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_actor_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po RECORD;
  v_receiving_id UUID;
  v_receiving_number TEXT;
  v_item JSONB;
  v_poi_id UUID;
  v_recv_qty INT;
  v_poi RECORD;
  v_prod RECORD;
  v_old_qty INT;
  v_old_cost NUMERIC;
  v_new_qty INT;
  v_new_cost NUMERIC;
  v_receipt_val NUMERIC;
  v_line_total NUMERIC;
  v_total_recv_qty INT := 0;
  v_total_receipt_val NUMERIC := 0;
  v_created_items JSONB := '[]'::jsonb;
  v_all_fully_received BOOLEAN := TRUE;
  v_existing_rec RECORD;
  v_item_count INT := 0;
BEGIN
  -- 1. Idempotency Check
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing_rec FROM public.receivings WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN json_build_object(
        'id', v_existing_rec.id,
        'receiving_number', v_existing_rec.receiving_number,
        'purchase_order_id', v_existing_rec.purchase_order_id,
        'status', v_existing_rec.status,
        'is_duplicate', true,
        'created_at', v_existing_rec.created_at
      )::jsonb;
    END IF;
  END IF;

  -- 2. Lock and Validate Purchase Order
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_purchase_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "PO_NOT_FOUND", "error": "أمر الشراء غير موجود"}';
  END IF;

  IF v_po.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "PO_NOT_ELIGIBLE_FOR_RECEIVING", "error": "لا يمكن استلام أمر شراء غير مؤكد أو ملغي أو مغلق"}';
  END IF;

  IF v_po.receiving_status = 'FULLY_RECEIVED' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "PO_ALREADY_FULLY_RECEIVED", "error": "تم استلام جميع أصناف أمر الشراء بالكامل مسبقاً"}';
  END IF;

  -- 3. Validate items payload
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "EMPTY_RECEIVING_ITEMS", "error": "يجب تحديد صنف واحد على الأقل للاستلام"}';
  END IF;

  v_receiving_id := uuid_generate_v4();
  v_receiving_number := 'REC-' || to_char(NOW(), 'YYYY') || '-' || upper(substring(replace(v_receiving_id::text, '-', '') from 1 for 6));

  -- 4. Process each received item atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_poi_id := COALESCE(NULLIF(v_item->>'purchase_order_item_id', '')::uuid, NULLIF(v_item->>'poi_id', '')::uuid);
    v_recv_qty := (v_item->>'quantity')::int;

    IF v_poi_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = '{"code": "MISSING_POI_ID", "error": "معرف بند أمر الشراء غير محدد"}';
    END IF;

    IF v_recv_qty <= 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = '{"code": "INVALID_RECEIVING_QUANTITY", "error": "الكمية المستلمة يجب أن تكون 1 أو أكثر"}';
    END IF;

    -- Lock PO item
    SELECT * INTO v_poi FROM public.purchase_order_items WHERE id = v_poi_id AND purchase_order_id = p_purchase_order_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = '{"code": "POI_NOT_FOUND", "error": "بند أمر الشراء غير موجود في هذا الأمر"}';
    END IF;

    -- Validate remaining quantity
    IF (v_poi.received_quantity + v_recv_qty) > v_poi.quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = json_build_object(
          'code', 'OVER_RECEIVING_NOT_ALLOWED',
          'error', 'الكمية المستلمة (' || v_recv_qty || ') تتجاوز الكمية المتبقية (' || (v_poi.quantity - v_poi.received_quantity) || ') للصنف: ' || v_poi.product_name,
          'product_name', v_poi.product_name,
          'ordered', v_poi.quantity,
          'already_received', v_poi.received_quantity,
          'attempted', v_recv_qty
        )::text;
    END IF;

    -- Lock product row
    SELECT * INTO v_prod FROM public.products WHERE id = v_poi.product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = '{"code": "PRODUCT_NOT_FOUND", "error": "المنتج غير موجود في الكتالوج"}';
    END IF;

    v_old_qty := v_prod.stock_qty;
    v_old_cost := COALESCE(v_prod.cost_price, v_poi.unit_price);
    v_new_qty := v_old_qty + v_recv_qty;

    -- WAC Formula
    IF v_old_qty = 0 OR v_prod.cost_price IS NULL THEN
      v_new_cost := v_poi.unit_price;
    ELSE
      v_new_cost := ROUND(((v_old_qty * v_old_cost) + (v_recv_qty * v_poi.unit_price)) / v_new_qty, 2);
    END IF;

    v_line_total := ROUND(v_recv_qty * v_poi.unit_price, 2);
    v_total_recv_qty := v_total_recv_qty + v_recv_qty;
    v_total_receipt_val := v_total_receipt_val + v_line_total;
    v_item_count := v_item_count + 1;

    -- Update Product Stock and WAC Cost Price
    UPDATE public.products
    SET
      stock_qty = v_new_qty,
      cost_price = v_new_cost,
      updated_at = NOW()
    WHERE id = v_prod.id;

    -- Update PO Item received quantity
    UPDATE public.purchase_order_items
    SET
      received_quantity = received_quantity + v_recv_qty,
      updated_at = NOW()
    WHERE id = v_poi.id;

    -- Insert PURCHASE_RECEIPT movement into inventory ledger
    INSERT INTO public.inventory_movements (
      id,
      product_id,
      type,
      quantity_delta,
      stock_before,
      stock_after,
      reference_type,
      reference_id,
      reason,
      actor_id,
      created_at
    ) VALUES (
      uuid_generate_v4(),
      v_prod.id,
      'PURCHASE_RECEIPT',
      v_recv_qty,
      v_old_qty,
      v_new_qty,
      'PURCHASE_RECEIPT',
      v_receiving_id::text,
      'Physical receipt for PO ' || v_po.po_number || ' (' || v_receiving_number || ')',
      COALESCE(p_actor_id, 'staff'),
      NOW()
    );

    -- Insert receiving item row
    INSERT INTO public.receiving_items (
      id,
      receiving_id,
      purchase_order_item_id,
      product_id,
      product_name,
      product_sku,
      received_quantity,
      unit_cost,
      total_cost,
      old_stock,
      new_stock,
      old_cost_price,
      new_cost_price,
      created_at
    ) VALUES (
      uuid_generate_v4(),
      v_receiving_id,
      v_poi.id,
      v_prod.id,
      v_poi.product_name,
      v_poi.product_sku,
      v_recv_qty,
      v_poi.unit_price,
      v_line_total,
      v_old_qty,
      v_new_qty,
      v_prod.cost_price,
      v_new_cost,
      NOW()
    );

    v_created_items := v_created_items || jsonb_build_object(
      'product_id', v_prod.id,
      'product_name', v_poi.product_name,
      'product_sku', v_poi.product_sku,
      'received_quantity', v_recv_qty,
      'unit_cost', v_poi.unit_price,
      'total_cost', v_line_total,
      'old_stock', v_old_qty,
      'new_stock', v_new_qty,
      'old_cost_price', v_prod.cost_price,
      'new_cost_price', v_new_cost
    );
  END LOOP;

  -- 5. Insert receivings master row
  INSERT INTO public.receivings (
    id,
    receiving_number,
    purchase_order_id,
    supplier_id,
    status,
    notes,
    received_by,
    total_items_count,
    total_received_qty,
    total_receipt_value,
    idempotency_key,
    created_at,
    updated_at
  ) VALUES (
    v_receiving_id,
    v_receiving_number,
    p_purchase_order_id,
    v_po.supplier_id,
    'COMPLETED',
    p_notes,
    COALESCE(p_actor_id, 'staff'),
    v_item_count,
    v_total_recv_qty,
    v_total_receipt_val,
    p_idempotency_key,
    NOW(),
    NOW()
  );

  -- 6. Check if PO is now FULLY_RECEIVED or PARTIALLY_RECEIVED
  SELECT bool_and(received_quantity = quantity) INTO v_all_fully_received
  FROM public.purchase_order_items
  WHERE purchase_order_id = p_purchase_order_id;

  IF v_all_fully_received THEN
    UPDATE public.purchase_orders
    SET
      receiving_status = 'FULLY_RECEIVED',
      status = 'CLOSED',
      updated_at = NOW()
    WHERE id = p_purchase_order_id;
  ELSE
    UPDATE public.purchase_orders
    SET
      receiving_status = 'PARTIALLY_RECEIVED',
      updated_at = NOW()
    WHERE id = p_purchase_order_id;
  END IF;

  RETURN json_build_object(
    'id', v_receiving_id,
    'receiving_number', v_receiving_number,
    'purchase_order_id', p_purchase_order_id,
    'po_number', v_po.po_number,
    'supplier_id', v_po.supplier_id,
    'status', 'COMPLETED',
    'total_received_qty', v_total_recv_qty,
    'total_receipt_value', v_total_receipt_val,
    'po_receiving_status', CASE WHEN v_all_fully_received THEN 'FULLY_RECEIVED' ELSE 'PARTIALLY_RECEIVED' END,
    'po_status', CASE WHEN v_all_fully_received THEN 'CLOSED' ELSE 'CONFIRMED' END,
    'items', v_created_items,
    'created_at', NOW()
  )::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_purchase_order_receiving TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_purchase_order_receiving TO service_role;
