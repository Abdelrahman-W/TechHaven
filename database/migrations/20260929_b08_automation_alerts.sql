-- ============================================================================
-- Migration: 20260929_b08_automation_alerts.sql
-- Description: Operational Automation & Alerts Engine for TechHaven ERP-Lite
-- Safety: Alerts are operational projections. Non-authoritative, zero mutations to stock/balances.
-- ============================================================================

DO $$
BEGIN
  -- 1. Create Operational Alerts Table
  CREATE TABLE IF NOT EXISTS public.operational_alerts (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    deduplication_key VARCHAR(255) UNIQUE NOT NULL,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(64),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Create Automation Runs Observability Table
  CREATE TABLE IF NOT EXISTS public.automation_runs (
    id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    alerts_created INT NOT NULL DEFAULT 0,
    alerts_updated INT NOT NULL DEFAULT 0,
    alerts_resolved INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    actor_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 3. Create Performance Indexes
  CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.operational_alerts(status);
  CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.operational_alerts(severity);
  CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.operational_alerts(type);
  CREATE INDEX IF NOT EXISTS idx_alerts_entity ON public.operational_alerts(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_dedup ON public.operational_alerts(deduplication_key);
  CREATE INDEX IF NOT EXISTS idx_alerts_last_detected ON public.operational_alerts(last_detected_at DESC);
  CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON public.automation_runs(started_at DESC);

END $$;
