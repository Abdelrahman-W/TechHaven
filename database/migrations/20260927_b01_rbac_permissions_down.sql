-- ==============================================================================
-- Migration Down: 20260927_b01_rbac_permissions_down.sql
-- Description: Rollback Granular RBAC and Permission Infrastructure
-- Author: TechHaven Architecture Team
-- ==============================================================================

-- Remove role_id from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS role_id;

-- Drop RBAC tables in dependency order
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
