-- ============================================================================
-- Rollback Migration: 20260927_b04_suppliers_purchasing_down.sql
-- Description: Rollback Suppliers and Purchase Orders tables and indexes
-- Author: TechHaven Architecture Team (Milestone ERP-Lite Batch 04)
-- ============================================================================

DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
