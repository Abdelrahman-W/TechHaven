-- ============================================================================
-- Migration: 20261012_b09_multivendor_paymob_idempotency.sql
-- Description: Multi-Vendor Marketplace Core & Paymob Webhook Durable Idempotency
-- Architecture: TechHaven Multi-Vendor MVP (Sellers, Isolation, Payouts, Webhook Protection)
-- ============================================================================

DO $$
BEGIN
  -- 1. Create Sellers / Vendors Table
  CREATE TABLE IF NOT EXISTS public.sellers (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    company_name_en TEXT,
    tax_number TEXT DEFAULT '',
    commercial_register TEXT DEFAULT '',
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT DEFAULT '',
    address TEXT DEFAULT '',
    description TEXT DEFAULT '',
    logo_url TEXT,
    banner_url TEXT,
    rating NUMERIC(3,2) DEFAULT 0,
    total_sales NUMERIC(12,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    bank_account JSONB,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Add Vendor Link Columns to Products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'vendor_id') THEN
    ALTER TABLE public.products ADD COLUMN vendor_id VARCHAR(64);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'seller_id') THEN
    ALTER TABLE public.products ADD COLUMN seller_id VARCHAR(64);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'seller_name') THEN
    ALTER TABLE public.products ADD COLUMN seller_name TEXT;
  END IF;

  -- 3. Add Line Item Vendor Columns to Order Items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'vendor_id') THEN
      ALTER TABLE public.order_items ADD COLUMN vendor_id VARCHAR(64);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'commission_amount') THEN
      ALTER TABLE public.order_items ADD COLUMN commission_amount NUMERIC(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'vendor_payout_amount') THEN
      ALTER TABLE public.order_items ADD COLUMN vendor_payout_amount NUMERIC(12,2) DEFAULT 0;
    END IF;
  END IF;

  -- 4. Create Paymob Transactions Table (Durable Concurrency-Safe Idempotency)
  CREATE TABLE IF NOT EXISTS public.paymob_transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'ptx-' || gen_random_uuid(),
    paymob_order_id VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(64),
    amount_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    status VARCHAR(30) NOT NULL DEFAULT 'success',
    hmac_valid BOOLEAN NOT NULL DEFAULT TRUE,
    payment_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 5. Expand Users Role Constraint
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'seller', 'vendor'));

  -- 6. Indexes for Performance & Data Isolation
  CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);
  CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers(status);
  CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);
  CREATE INDEX IF NOT EXISTS idx_paymob_tx_order_id ON public.paymob_transactions(order_id);

END $$;
