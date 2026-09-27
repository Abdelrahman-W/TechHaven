-- ============================================================================
-- Migration: 20260927_b04_suppliers_purchasing.sql
-- Description: ERP-Lite Suppliers & Purchase Orders Domain Foundation
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 04)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_active_created
  ON public.suppliers(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suppliers_name
  ON public.suppliers(name);

-- 2. Table: purchase_orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED', 'CLOSED')),
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_date TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
  ON public.purchase_orders(supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_number
  ON public.purchase_orders(po_number);

-- 3. Table: purchase_order_items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_po_item_line_total CHECK (line_total = quantity * unit_price)
);

-- Indexes on purchase_order_items
CREATE INDEX IF NOT EXISTS idx_po_items_order_id
  ON public.purchase_order_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_po_items_product_id
  ON public.purchase_order_items(product_id);

-- Enable RLS if supported
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_service_role_all'
  ) THEN
    CREATE POLICY suppliers_service_role_all ON public.suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'po_service_role_all'
  ) THEN
    CREATE POLICY po_service_role_all ON public.purchase_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'po_items_service_role_all'
  ) THEN
    CREATE POLICY po_items_service_role_all ON public.purchase_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
