-- ============================================================================
-- Migration Down: 20260929_b08_automation_alerts_down.sql
-- Description: Rollback Operational Alerts & Automation Engine Tables
-- ============================================================================

DROP TABLE IF EXISTS public.automation_runs CASCADE;
DROP TABLE IF EXISTS public.operational_alerts CASCADE;
