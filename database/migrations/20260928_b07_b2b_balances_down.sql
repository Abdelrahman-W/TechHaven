-- ============================================================================
-- Migration Down: 20260928_b07_b2b_balances_down.sql
-- Description: Rollback B2B Customer Balances & Ledger Tables
-- ============================================================================

DROP TABLE IF EXISTS public.customer_balance_transactions CASCADE;
DROP TABLE IF EXISTS public.b2b_customers CASCADE;
