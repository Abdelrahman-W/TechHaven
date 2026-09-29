-- ============================================================================
-- Migration: 20260928_b07_b2b_balances.sql
-- Description: B2B Operational Customer Balances & Ledger for TechHaven ERP-Lite
-- Boundary: Operational balances ONLY (Not General Ledger / Double-Entry)
-- ============================================================================

DO $$
BEGIN
  -- 1. Create B2B Customers / Accounts Table
  CREATE TABLE IF NOT EXISTS public.b2b_customers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    tax_id VARCHAR(100),
    credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'NET_30',
    account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Create Customer Balance Ledger Transactions Table
  CREATE TABLE IF NOT EXISTS public.customer_balance_transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES public.b2b_customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('B2B_INVOICE', 'PAYMENT', 'CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    balance_before NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    reference_id VARCHAR(100),
    payment_method VARCHAR(50),
    external_reference VARCHAR(100),
    note TEXT,
    actor_id VARCHAR(64),
    actor_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 3. Indexes for fast retrieval and filtering
  CREATE INDEX IF NOT EXISTS idx_b2b_customers_user ON public.b2b_customers(user_id);
  CREATE INDEX IF NOT EXISTS idx_b2b_customers_status ON public.b2b_customers(account_status);
  CREATE INDEX IF NOT EXISTS idx_balance_tx_customer ON public.customer_balance_transactions(customer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_balance_tx_ref ON public.customer_balance_transactions(reference_type, reference_id);

END $$;
