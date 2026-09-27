/**
 * TechHaven Granular RBAC (Role-Based Access Control) Foundation
 * Stable resource.action permission tokens and predefined system roles.
 */

export const PERMISSIONS = {
  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_COST_VIEW: 'products.cost.view',
  PRODUCTS_COST_MANAGE: 'products.cost.manage',

  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',

  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_EXPORT: 'orders.export',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_MOVEMENTS: 'inventory.movements',
  INVENTORY_REORDER_VIEW: 'inventory.reorder.view',
  INVENTORY_REORDER_MANAGE: 'inventory.reorder.manage',

  // Purchasing & Procurement
  PURCHASING_VIEW: 'purchasing.view',
  PURCHASING_CREATE: 'purchasing.create',
  PURCHASING_EDIT: 'purchasing.edit',
  PURCHASING_APPROVE: 'purchasing.approve',
  PURCHASING_CANCEL: 'purchasing.cancel',
  PURCHASING_RECEIVE: 'purchasing.receive',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',

  // Reports & Business Intelligence
  REPORTS_SALES: 'reports.sales',
  REPORTS_PROFIT: 'reports.profit',
  REPORTS_INVENTORY: 'reports.inventory',

  // B2B Corporate
  B2B_VIEW: 'b2b.view',
  B2B_MANAGE: 'b2b.manage',

  // Reviews
  REVIEWS_VIEW: 'reviews.view',
  REVIEWS_MODERATE: 'reviews.moderate',

  // Users & Staff
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',

  // Permissions & Roles
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_MANAGE: 'permissions.manage',

  // Store Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  // Admin Dashboard views
  ADMIN_DASHBOARD_VIEW: 'admin.dashboard.view',
  ADMIN_USERS_VIEW: 'admin.users.view',
  ADMIN_ORDERS_VIEW: 'admin.orders.view',
  ADMIN_B2B_VIEW: 'admin.b2b.view',
  ADMIN_REVIEWS_VIEW: 'admin.reviews.view',
  ADMIN_CATEGORIES_VIEW: 'admin.categories.view',
  ADMIN_ANALYTICS_VIEW: 'admin.analytics.view',
  ADMIN_SETTINGS_VIEW: 'admin.settings.view',
  ADMIN_SUPPLIERS_VIEW: 'admin.suppliers.view',
  ADMIN_PURCHASING_VIEW: 'admin.purchasing.view',
  ADMIN_REORDER_VIEW: 'admin.reorder.view',
};

export const ROLES = {
  OWNER: 'owner',
  STORE_MANAGER: 'store_manager',
  INVENTORY_OFFICER: 'inventory_officer',
  FULFILLMENT_AGENT: 'fulfillment_agent',
  USER: 'user',
};

export const ROLE_DEFINITIONS = [
  {
    code: 'owner',
    name: 'المدير العام (Owner)',
    description: 'صلاحيات كاملة وغير مقيدة على كافة أقسام المتجر والتقارير المالية وإدارة الصلاحيات',
    is_system: true,
    permissions: ['*'],
  },
  {
    code: 'store_manager',
    name: 'مدير المتجر والعمليات (Store Manager)',
    description: 'إدارة العمليات اليومية: المنتجات، الطلبات، المخزون، عروض الشركات، والتقارير التشغيلية',
    is_system: true,
    permissions: [
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
      'orders.view', 'orders.edit', 'orders.cancel', 'orders.export',
      'inventory.view', 'inventory.adjust', 'inventory.movements', 'inventory.reorder.view', 'inventory.reorder.manage',
      'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
      'purchasing.view', 'purchasing.create', 'purchasing.edit', 'purchasing.approve', 'purchasing.cancel', 'purchasing.receive',
      'b2b.view', 'b2b.manage',
      'reviews.view', 'reviews.moderate',
      'reports.sales', 'reports.profit', 'reports.inventory', 'products.cost.view', 'products.cost.manage',
      'users.view',
      'settings.view',
      'admin.dashboard.view', 'admin.users.view', 'admin.orders.view', 'admin.b2b.view', 'admin.reviews.view', 'admin.categories.view', 'admin.analytics.view', 'admin.suppliers.view', 'admin.purchasing.view', 'admin.reorder.view',
    ],
  },
  {
    code: 'inventory_officer',
    name: 'مسؤول المخازن (Inventory Officer)',
    description: 'إدارة المخزون، الجرد السريع، متابعة النواقص، واستلام أوامر الشراء',
    is_system: true,
    permissions: [
      'products.view',
      'inventory.view', 'inventory.adjust', 'inventory.movements', 'inventory.reorder.view', 'inventory.reorder.manage',
      'suppliers.view', 'purchasing.view', 'purchasing.create', 'purchasing.receive',
      'reports.inventory',
      'admin.dashboard.view', 'admin.purchasing.view', 'admin.reorder.view',
    ],
  },
  {
    code: 'fulfillment_agent',
    name: 'مسؤول الشحن والتجهيز (Fulfillment Agent)',
    description: 'متابعة الطلبات، تحديث حالات الشحن، وتصدير كشوف التوصيل لمندوبي الشحن',
    is_system: true,
    permissions: [
      'products.view',
      'orders.view', 'orders.edit', 'orders.export',
      'inventory.view',
      'admin.dashboard.view', 'admin.orders.view',
    ],
  },
  {
    code: 'user',
    name: 'عميل (Customer)',
    description: 'حساب عميل عادي للتسوق والطلب ومتابعة المشتريات الشخصية',
    is_system: true,
    permissions: [],
  },
];

export const ROLE_PERMISSIONS_MAP = {
  owner: ['*'],
  admin: ['*'], // Legacy admin alias -> full access
  store_manager: ROLE_DEFINITIONS.find(r => r.code === 'store_manager').permissions,
  inventory_officer: ROLE_DEFINITIONS.find(r => r.code === 'inventory_officer').permissions,
  fulfillment_agent: ROLE_DEFINITIONS.find(r => r.code === 'fulfillment_agent').permissions,
  user: [],
};

/**
 * Returns effective permission list for a given role code.
 */
export function getRolePermissions(roleCode) {
  const normalized = (roleCode || 'user').toLowerCase().trim();
  return ROLE_PERMISSIONS_MAP[normalized] || [];
}

/**
 * Checks if a role has the required permission.
 */
export function hasPermission(roleCode, requiredPermission) {
  if (!roleCode || !requiredPermission) return false;
  const normalizedRole = roleCode.toLowerCase().trim();

  // Root Owner and legacy Admin have global access
  if (normalizedRole === 'owner' || normalizedRole === 'admin') {
    return true;
  }

  const permissions = getRolePermissions(normalizedRole);
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}

/**
 * Resolves user's effective role and permission array.
 */
export function resolveUserPermissions(user) {
  if (!user) return { role: 'user', permissions: [] };
  const role = (user.role || 'user').toLowerCase().trim();
  const permissions = getRolePermissions(role);
  return {
    role,
    isOwner: role === 'owner' || role === 'admin' || user.is_super_admin,
    permissions,
  };
}
