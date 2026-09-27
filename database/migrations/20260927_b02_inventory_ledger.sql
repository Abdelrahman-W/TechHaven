-- ============================================================================
-- Migration: 20260927_b02_inventory_ledger.sql
-- Description: Inventory Movement Ledger, Constraints, Initial Import & Atomic Adjustment RPC
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 02)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create inventory_movements Table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'INITIAL_IMPORT',
    'SALE',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'DAMAGE',
    'RETURN_RESTOCK',
    'PURCHASE_RECEIPT'
  )),
  quantity_delta INT NOT NULL CHECK (quantity_delta <> 0),
  stock_before INT NOT NULL CHECK (stock_before >= 0),
  stock_after INT NOT NULL CHECK (stock_after >= 0),
  reference_type TEXT NOT NULL DEFAULT 'MANUAL',
  reference_id TEXT,
  reason TEXT,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_inventory_stock_math CHECK (stock_after = stock_before + quantity_delta)
);

-- 2. Indexes for Query Performance & Audit Filtering
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_type_created
  ON public.inventory_movements(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference
  ON public.inventory_movements(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_actor
  ON public.inventory_movements(actor_id, created_at DESC);

-- 3. Row Level Security Policies
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'Service role full access on inventory_movements'
  ) THEN
    CREATE POLICY "Service role full access on inventory_movements"
      ON public.inventory_movements
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'Staff read access on inventory_movements'
  ) THEN
    CREATE POLICY "Staff read access on inventory_movements"
      ON public.inventory_movements
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND (users.role IN ('owner', 'admin', 'store_manager', 'inventory_officer', 'fulfillment_agent'))
        )
      );
  END IF;
END $$;

-- 4. Initial Stock Import Migration (Idempotent)
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
)
SELECT
  uuid_generate_v4(),
  p.id,
  'INITIAL_IMPORT',
  COALESCE(p.stock_qty, 0),
  0,
  COALESCE(p.stock_qty, 0),
  'MIGRATION',
  'migration_b02_initial_import',
  'Initial inventory ledger import of existing stock',
  'system',
  NOW()
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_movements m
  WHERE m.product_id = p.id AND m.type = 'INITIAL_IMPORT'
)
AND COALESCE(p.stock_qty, 0) > 0;

-- 5. RPC: process_order_checkout (Updated with Atomic SALE Movements)
CREATE OR REPLACE FUNCTION public.process_order_checkout(
  p_order_id UUID DEFAULT uuid_generate_v4(),
  p_reference TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT '',
  p_customer_phone TEXT DEFAULT '',
  p_customer_email TEXT DEFAULT '',
  p_customer_city TEXT DEFAULT '',
  p_customer_address TEXT DEFAULT '',
  p_customer_notes TEXT DEFAULT '',
  p_payment_method TEXT DEFAULT 'cod',
  p_payment_status TEXT DEFAULT 'pending',
  p_status TEXT DEFAULT 'pending',
  p_shipping_cost NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0,
  p_coupon_code TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_timeline JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_reference TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_requested_qty INT;
  v_item_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_created_order JSONB;
  v_created_items JSONB := '[]'::jsonb;
  v_locked_product RECORD;
  v_item_total NUMERIC;
  v_item_id UUID;
  v_sku TEXT;
  v_img TEXT;
  v_name TEXT;
  v_distinct_count INT;
  v_found_count INT;
BEGIN
  -- 1. Input Validation: Customer Profile
  IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "INVALID_DATA", "error": "يرجى إكمال جميع بيانات العميل والعنوان"}';
  END IF;

  IF p_customer_phone IS NULL OR TRIM(p_customer_phone) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "INVALID_DATA", "error": "يرجى إكمال جميع بيانات العميل والعنوان"}';
  END IF;

  IF p_customer_address IS NULL OR TRIM(p_customer_address) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "INVALID_DATA", "error": "يرجى إكمال جميع بيانات العميل والعنوان"}';
  END IF;

  -- 2. Input Validation: Items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "EMPTY_CART", "error": "سلة المشتريات فارغة"}';
  END IF;

  -- Validate each item syntax
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'product_id') IS NULL AND (v_item->>'productId') IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = '{"code": "INVALID_ITEM", "error": "بيانات المنتج غير صالحة"}';
    END IF;

    v_requested_qty := COALESCE((v_item->>'quantity')::int, 0);
    IF v_requested_qty <= 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = '{"code": "INVALID_QUANTITY", "error": "الكمية المطلوبة يجب أن تكون 1 أو أكثر"}';
    END IF;
  END LOOP;

  -- 3. Aggregate Duplicate Product Lines & Order Deterministically (Deadlock Prevention)
  CREATE TEMPORARY TABLE IF NOT EXISTS _temp_order_checkout_agg (
    prod_id UUID PRIMARY KEY,
    total_qty INT NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE _temp_order_checkout_agg;

  INSERT INTO _temp_order_checkout_agg (prod_id, total_qty)
  SELECT
    COALESCE(NULLIF(elem->>'product_id', '')::uuid, NULLIF(elem->>'productId', '')::uuid) AS prod_id,
    SUM((elem->>'quantity')::int)::int AS total_qty
  FROM jsonb_array_elements(p_items) AS elem
  GROUP BY 1;

  SELECT COUNT(*) INTO v_distinct_count FROM _temp_order_checkout_agg;

  -- 4. Acquire Row-Level Locks in Deterministic Ascending UUID Order & Validate Stock
  v_found_count := 0;

  FOR v_locked_product IN
    SELECT p.id, p.name, p.sku, p.price, p.stock_qty, p.thumbnail, t.total_qty
    FROM public.products p
    JOIN _temp_order_checkout_agg t ON p.id = t.prod_id
    ORDER BY p.id ASC
    FOR UPDATE OF p
  LOOP
    v_found_count := v_found_count + 1;

    -- Check if locked available stock satisfies the aggregate requested quantity
    IF v_locked_product.stock_qty < v_locked_product.total_qty THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = json_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'error', 'الكمية المطلوبة من (' || v_locked_product.name || ') غير متوفرة. المتاح حالياً: ' || v_locked_product.stock_qty,
          'product_id', v_locked_product.id,
          'product_name', v_locked_product.name,
          'available_stock', v_locked_product.stock_qty,
          'requested_qty', v_locked_product.total_qty
        )::text;
    END IF;
  END LOOP;

  -- Verify all requested distinct products were found
  IF v_found_count < v_distinct_count THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "PRODUCT_NOT_FOUND", "error": "واحد أو أكثر من المنتجات المطلوبة غير متوفر في النظام"}';
  END IF;

  -- 5. Prepare Order Identifiers
  v_order_id := COALESCE(p_order_id, uuid_generate_v4());
  v_reference := COALESCE(
    NULLIF(p_reference, ''),
    'TH-' || to_char(NOW(), 'YYYY') || '-' || upper(substring(replace(v_order_id::text, '-', '') from 1 for 6))
  );

  -- 6. Decrement Stock AND Insert SALE Inventory Movement Atomically
  FOR v_locked_product IN
    SELECT p.id, p.name, p.sku, p.price, p.stock_qty, t.total_qty
    FROM public.products p
    JOIN _temp_order_checkout_agg t ON p.id = t.prod_id
    ORDER BY p.id ASC
  LOOP
    UPDATE public.products
    SET
      stock_qty = stock_qty - v_locked_product.total_qty,
      updated_at = NOW()
    WHERE id = v_locked_product.id;

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
      v_locked_product.id,
      'SALE',
      -v_locked_product.total_qty,
      v_locked_product.stock_qty,
      v_locked_product.stock_qty - v_locked_product.total_qty,
      'ORDER',
      v_order_id::text,
      'Order checkout sale: ' || v_reference,
      COALESCE(p_user_id::text, 'customer'),
      NOW()
    );
  END LOOP;

  -- 7. Authoritative Monetary Calculation
  SELECT COALESCE(SUM(p.price * (elem->>'quantity')::int), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS elem
  JOIN public.products p ON p.id = COALESCE(NULLIF(elem->>'product_id', '')::uuid, NULLIF(elem->>'productId', '')::uuid);

  v_total := GREATEST(0, v_subtotal + COALESCE(p_shipping_cost, 0) - COALESCE(p_discount_amount, 0));

  -- 8. Insert Order Record
  INSERT INTO public.orders (
    id,
    reference,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_city,
    customer_address,
    customer_notes,
    payment_method,
    payment_status,
    status,
    subtotal,
    shipping_cost,
    tax_amount,
    discount_amount,
    total,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_reference,
    p_user_id,
    p_customer_name,
    COALESCE(p_customer_email, ''),
    p_customer_phone,
    p_customer_city,
    p_customer_address,
    COALESCE(p_customer_notes, ''),
    p_payment_method,
    p_payment_status,
    p_status,
    v_subtotal,
    COALESCE(p_shipping_cost, 0),
    0,
    COALESCE(p_discount_amount, 0),
    v_total,
    NOW(),
    NOW()
  );

  -- 9. Insert Order Items (Authoritative Snapshots)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := COALESCE(NULLIF(v_item->>'product_id', '')::uuid, NULLIF(v_item->>'productId', '')::uuid);
    v_requested_qty := (v_item->>'quantity')::int;

    SELECT p.name, p.sku, p.price, COALESCE(p.thumbnail, '')
    INTO v_name, v_sku, v_item_price, v_img
    FROM public.products p
    WHERE p.id = v_product_id;

    v_item_total := v_item_price * v_requested_qty;
    v_item_id := uuid_generate_v4();

    INSERT INTO public.order_items (
      id,
      order_id,
      product_id,
      product_name,
      product_sku,
      product_image,
      quantity,
      unit_price,
      total_price,
      specs_snapshot,
      created_at
    ) VALUES (
      v_item_id,
      v_order_id,
      v_product_id,
      v_name,
      COALESCE(v_sku, v_product_id::text),
      v_img,
      v_requested_qty,
      v_item_price,
      v_item_total,
      COALESCE(v_item->'specs_snapshot', '{}'::jsonb),
      NOW()
    );

    v_created_items := v_created_items || jsonb_build_object(
      'id', v_item_id,
      'order_id', v_order_id,
      'product_id', v_product_id,
      'product_name', v_name,
      'product_sku', COALESCE(v_sku, v_product_id::text),
      'product_image', v_img,
      'quantity', v_requested_qty,
      'unit_price', v_item_price,
      'total_price', v_item_total
    );
  END LOOP;

  -- 10. Assemble and Return Order Representation
  SELECT json_build_object(
    'id', v_order_id,
    'reference', v_reference,
    'order_number', v_reference,
    'user_id', p_user_id,
    'customer_name', p_customer_name,
    'customer_phone', p_customer_phone,
    'customer_email', p_customer_email,
    'customer_city', p_customer_city,
    'customer_address', p_customer_address,
    'customer_notes', p_customer_notes,
    'payment_method', p_payment_method,
    'payment_status', p_payment_status,
    'status', p_status,
    'subtotal', v_subtotal,
    'shipping_cost', COALESCE(p_shipping_cost, 0),
    'discount_amount', COALESCE(p_discount_amount, 0),
    'coupon_code', p_coupon_code,
    'total', v_total,
    'items', v_created_items,
    'created_at', NOW(),
    'updated_at', NOW()
  )::jsonb INTO v_created_order;

  RETURN v_created_order;
END;
$$;

-- 6. RPC: adjust_product_inventory (Atomic Stock Adjustment with Movement Ledger)
CREATE OR REPLACE FUNCTION public.adjust_product_inventory(
  p_product_id UUID,
  p_quantity_delta INT,
  p_type TEXT DEFAULT 'ADJUSTMENT_IN',
  p_reason TEXT DEFAULT '',
  p_actor_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT 'STOCK_ADJUSTMENT',
  p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product RECORD;
  v_new_stock INT;
  v_movement_id UUID := uuid_generate_v4();
  v_movement JSONB;
BEGIN
  IF p_quantity_delta = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "INVALID_QUANTITY", "error": "قيمة التعديل لا يمكن أن تكون صفراً"}';
  END IF;

  SELECT id, name, sku, stock_qty
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = '{"code": "PRODUCT_NOT_FOUND", "error": "المنتج غير موجود"}';
  END IF;

  v_new_stock := v_product.stock_qty + p_quantity_delta;
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = json_build_object(
        'code', 'INSUFFICIENT_STOCK',
        'error', 'لا يمكن أن يصبح المخزون سالباً. المتاح حالياً: ' || v_product.stock_qty,
        'current_stock', v_product.stock_qty,
        'requested_delta', p_quantity_delta
      )::text;
  END IF;

  UPDATE public.products
  SET
    stock_qty = v_new_stock,
    updated_at = NOW()
  WHERE id = p_product_id;

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
    v_movement_id,
    p_product_id,
    p_type,
    p_quantity_delta,
    v_product.stock_qty,
    v_new_stock,
    p_reference_type,
    COALESCE(p_reference_id, v_movement_id::text),
    p_reason,
    p_actor_id,
    NOW()
  );

  SELECT json_build_object(
    'id', v_movement_id,
    'product_id', p_product_id,
    'type', p_type,
    'quantity_delta', p_quantity_delta,
    'stock_before', v_product.stock_qty,
    'stock_after', v_new_stock,
    'reference_type', p_reference_type,
    'reference_id', COALESCE(p_reference_id, v_movement_id::text),
    'reason', p_reason,
    'actor_id', p_actor_id,
    'created_at', NOW()
  )::jsonb INTO v_movement;

  RETURN v_movement;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_order_checkout TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_checkout TO anon;
GRANT EXECUTE ON FUNCTION public.process_order_checkout TO service_role;

GRANT EXECUTE ON FUNCTION public.adjust_product_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_inventory TO service_role;
