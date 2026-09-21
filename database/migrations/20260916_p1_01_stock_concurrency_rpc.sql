-- ============================================================================
-- Migration: 20260916_p1_01_stock_concurrency_rpc.sql
-- Description: Transactional Atomic Checkout RPC (process_order_checkout)
-- Author: TechHaven Architecture Team (Milestone P1-01 Phase 2)
-- ============================================================================

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure check constraints exist on products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_qty_non_negative'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_stock_qty_non_negative CHECK (stock_qty >= 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- RPC: process_order_checkout
-- ----------------------------------------------------------------------------
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

  -- 5. Decrement Stock for all locked products atomically
  UPDATE public.products p
  SET
    stock_qty = p.stock_qty - t.total_qty,
    updated_at = NOW()
  FROM _temp_order_checkout_agg t
  WHERE p.id = t.prod_id;

  -- 6. Authoritative Monetary Calculation
  -- Subtotal is calculated solely from database product prices, ignoring any client-sent price
  SELECT COALESCE(SUM(p.price * (elem->>'quantity')::int), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS elem
  JOIN public.products p ON p.id = COALESCE(NULLIF(elem->>'product_id', '')::uuid, NULLIF(elem->>'productId', '')::uuid);

  v_total := GREATEST(0, v_subtotal + COALESCE(p_shipping_cost, 0) - COALESCE(p_discount_amount, 0));

  -- 7. Insert Order Record
  v_order_id := COALESCE(p_order_id, uuid_generate_v4());
  v_reference := COALESCE(
    NULLIF(p_reference, ''),
    'TH-' || to_char(NOW(), 'YYYY') || '-' || upper(substring(replace(v_order_id::text, '-', '') from 1 for 6))
  );

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

  -- 8. Insert Order Items (Authoritative Snapshots)
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

  -- 9. Assemble and Return Order Representation
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_order_checkout TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_checkout TO anon;
GRANT EXECUTE ON FUNCTION public.process_order_checkout TO service_role;
