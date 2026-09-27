-- ==============================================================================
-- Migration: 20260927_b01_rbac_permissions.sql
-- Description: Production-Safe Granular RBAC and Permission Infrastructure (Batch 01)
-- Author: TechHaven Architecture Team (ERP-Lite Foundation)
-- ==============================================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Table: permissions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,             -- e.g. 'products.edit'
    resource TEXT NOT NULL,                -- e.g. 'products'
    action TEXT NOT NULL,                  -- e.g. 'edit'
    name TEXT NOT NULL,                    -- Human-readable Arabic label
    description TEXT,                      -- Detailed description
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);

-- ------------------------------------------------------------------------------
-- 2. Table: roles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,             -- e.g. 'owner', 'store_manager'
    name TEXT NOT NULL,                    -- Human-readable label (e.g. 'المدير العام')
    description TEXT,                      -- Role description
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);

-- ------------------------------------------------------------------------------
-- 3. Table: role_permissions (Many-to-Many Bridge)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

-- ------------------------------------------------------------------------------
-- 4. Alter users table: Add role_id and rbac fields (preserving legacy role column)
-- ------------------------------------------------------------------------------
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- ------------------------------------------------------------------------------
-- 5. Seed Permissions Catalog
-- ------------------------------------------------------------------------------
INSERT INTO public.permissions (code, resource, action, name, description) VALUES
  -- Products
  ('products.view', 'products', 'view', 'عرض المنتجات', 'الاطلاع على تفاصيل المنتجات والكتالوج والمخزون'),
  ('products.create', 'products', 'create', 'إضافة منتج', 'إنشاء وإضافة منتجات جديدة في المتجر'),
  ('products.edit', 'products', 'edit', 'تعديل المنتجات', 'تعديل بيانات المنتجات والأسعار والمواصفات'),
  ('products.delete', 'products', 'delete', 'حذف المنتجات', 'حذف المنتجات نهائياً من الكتالوج'),

  -- Categories
  ('categories.view', 'categories', 'view', 'عرض الأقسام', 'الاطلاع على الأقسام والفئات'),
  ('categories.create', 'categories', 'create', 'إضافة قسم', 'إنشاء أقسام وتصنيفات جديدة'),
  ('categories.edit', 'categories', 'edit', 'تعديل الأقسام', 'تعديل أسماء وأيقونات الأقسام وترتيبها'),
  ('categories.delete', 'categories', 'delete', 'حذف الأقسام', 'حذف التصنيفات والأقسام'),

  -- Orders
  ('orders.view', 'orders', 'view', 'عرض الطلبات', 'استعراض طلبات العملاء وتفاصيل الفواتير'),
  ('orders.edit', 'orders', 'edit', 'تعديل الطلبات', 'تحديث حالة الشحن والطلب والملاحظات الداخلية'),
  ('orders.cancel', 'orders', 'cancel', 'إلغاء الطلبات', 'إلغاء طلبات الشراء'),
  ('orders.export', 'orders', 'export', 'تصدير كشوف الشحن', 'تصدير بيانات الشحنات والمانيفست لشركات الشحن (CSV)'),

  -- Inventory
  ('inventory.view', 'inventory', 'view', 'عرض المخزون', 'الاطلاع على كميات المخزون وتنبيهات النواقص'),
  ('inventory.adjust', 'inventory', 'adjust', 'تعديل المخزون السريع', 'تعديل وتحديث أرصدة المخزون بالمستودع'),
  ('inventory.movements', 'inventory', 'movements', 'سجل حركة المخزون', 'استعراض سجل حركات الوارد والمنصرف والتالف'),

  -- Purchasing & Procurement (Ready for future batches)
  ('purchasing.view', 'purchasing', 'view', 'عرض المشتريات والموردين', 'الاطلاع على قائمة الموردين وأوامر الشراء'),
  ('purchasing.create', 'purchasing', 'create', 'إنشاء أوامر شراء', 'إنشاء أوامر شراء جديدة وتوجيهها للموردين'),
  ('purchasing.receive', 'purchasing', 'receive', 'استلام بضائع المشتريات', 'تسجيل استلام البضائع وزيادة رصيد المستودع'),

  -- Reports & Business Intelligence
  ('reports.sales', 'reports', 'sales', 'تقارير المبيعات', 'استعراض إحصائيات المبيعات وحجم الطلبات اليومي'),
  ('reports.profit', 'reports', 'profit', 'تقارير الأرباح وهوامش الربح', 'استعراض تكلفة البضاعة المباعة COGS وصافي الأرباح'),
  ('reports.inventory', 'reports', 'inventory', 'تقارير حركة المخزون', 'استعراض معدل دوران المخزون والمنتجات الراكدة'),

  -- B2B Corporate
  ('b2b.view', 'b2b', 'view', 'عرض طلبات الشركات', 'استعراض طلبات عروض أسعار الشركات والمؤسسات B2B'),
  ('b2b.manage', 'b2b', 'manage', 'إدارة طلبات الشركات', 'تحديث حالات عروض الأسعار والتواصل مع الشركات'),

  -- Customer Reviews
  ('reviews.view', 'reviews', 'view', 'عرض التقييمات', 'استعراض تقييمات وتعليقات العملاء لكافة المنتجات'),
  ('reviews.moderate', 'reviews', 'moderate', 'إدارة وحذف التقييمات', 'حذف وإدارة الملاحظات غير اللائقة أو العشوائية'),

  -- Users & Staff
  ('users.view', 'users', 'view', 'عرض المستخدمين', 'الاطلاع على قائمة العملاء وفريق العمل'),
  ('users.manage', 'users', 'manage', 'إدارة المستخدمين', 'إنشاء وتعديل وحذف حسابات الموظفين والعملاء'),

  -- Permissions & Roles
  ('permissions.view', 'permissions', 'view', 'عرض الصلاحيات والأدوار', 'استعراض مصفوفة الصلاحيات والأدوار'),
  ('permissions.manage', 'permissions', 'manage', 'إدارة الصلاحيات والأدوار', 'تعديل وتعيين الأدوار والصلاحيات للمستخدمين'),

  -- Store Settings
  ('settings.view', 'settings', 'view', 'عرض إعدادات النظام', 'الاطلاع على إعدادات المتجر وبيانات الاتصال'),
  ('settings.manage', 'settings', 'manage', 'تعديل إعدادات النظام', 'تعديل بوابات الدفع وسياسات الشحن والربط الخارجي')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action;

-- ------------------------------------------------------------------------------
-- 6. Seed Predefined Roles
-- ------------------------------------------------------------------------------
INSERT INTO public.roles (code, name, description, is_system) VALUES
  ('owner', 'المدير العام (Owner)', 'صلاحيات كاملة وغير مقيدة على كافة أقسام النظام والتقارير المالية وإدارة الصلاحيات', true),
  ('store_manager', 'مدير المتجر والعمليات (Store Manager)', 'إدارة العمليات اليومية: المنتجات، الطلبات، المخزون، الشركات، والتقارير التشغيلية', true),
  ('inventory_officer', 'مسؤول المخازن (Inventory Officer)', 'إدارة المخزون، الجرد السريع، متابعة النواقص، واستلام أوامر الشراء', true),
  ('fulfillment_agent', 'مسؤول الشحن والتجهيز (Fulfillment Agent)', 'متابعة الطلبات، تحديث حالات الشحن، وتصدير كشوف التوصيل لمندوبي الشحن', true),
  ('user', 'عميل (Customer)', 'حساب عميل عادي للتسوق والطلب ومتابعة المشتريات الشخصية', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system;

-- ------------------------------------------------------------------------------
-- 7. Populate Role-Permission Relationships
-- ------------------------------------------------------------------------------
-- A. Owner Role: Receives ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'owner'
ON CONFLICT DO NOTHING;

-- B. Store Manager Role: Operational management
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
  'orders.view', 'orders.edit', 'orders.cancel', 'orders.export',
  'inventory.view', 'inventory.adjust', 'inventory.movements',
  'purchasing.view', 'purchasing.create', 'purchasing.receive',
  'b2b.view', 'b2b.manage',
  'reviews.view', 'reviews.moderate',
  'reports.sales', 'reports.inventory',
  'users.view',
  'settings.view'
)
WHERE r.code = 'store_manager'
ON CONFLICT DO NOTHING;

-- C. Inventory Officer Role: Inventory & stock movements
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'products.view',
  'inventory.view', 'inventory.adjust', 'inventory.movements',
  'purchasing.view', 'purchasing.receive',
  'reports.inventory'
)
WHERE r.code = 'inventory_officer'
ON CONFLICT DO NOTHING;

-- D. Fulfillment Agent Role: Orders & delivery manifests
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'products.view',
  'orders.view', 'orders.edit', 'orders.export',
  'inventory.view'
)
WHERE r.code = 'fulfillment_agent'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 8. Backward Compatibility: Link existing admin users to 'owner' role_id
-- ------------------------------------------------------------------------------
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE code = 'owner')
WHERE role = 'admin' AND (role_id IS NULL OR role_id != (SELECT id FROM public.roles WHERE code = 'owner'));

-- Link existing customer users to 'user' role_id
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE code = 'user')
WHERE role = 'user' AND role_id IS NULL;
