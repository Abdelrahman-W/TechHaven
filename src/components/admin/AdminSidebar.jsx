import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  History,
  Package,
  ShoppingBag,
  Truck,
  ClipboardList,
  Users,
  Sliders,
  Tags,
  Building2,
  TrendingUp,
  Star,
  Settings,
  LogOut,
  Zap,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/admin/alerts', icon: Bell, label: 'التنبيهات والأتمتة' },
  { to: '/admin/products', icon: Package, label: 'إدارة المنتجات' },
  { to: '/admin/inventory', icon: History, label: 'حركة المخزون' },
  { to: '/admin/reorder', icon: Sliders, label: 'ذكاء إعادة الطلب' },
  { to: '/admin/suppliers', icon: Truck, label: 'إدارة الموردين' },
  { to: '/admin/purchasing', icon: ClipboardList, label: 'أوامر الشراء والتوريد' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'الطلبات والشحن' },
  { to: '/admin/users', icon: Users, label: 'العملاء والمستخدمين' },
  { to: '/admin/categories', icon: Tags, label: 'الفئات والأقسام' },
  { to: '/admin/b2b', icon: Building2, label: 'طلبات الشركات B2B' },
  { to: '/admin/reviews', icon: Star, label: 'إدارة التقييمات' },
  { to: '/admin/reports', icon: TrendingUp, label: 'التقارير والتحليلات' },
  { to: '/admin/settings', icon: Settings, label: 'إعدادات النظام' },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const { logout } = useAuth();

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div
        style={{
          padding: 'var(--space-5) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 900, color: 'var(--text-primary)' }}>
              TECH<span style={{ color: 'var(--brand-orange)' }}>HAVEN</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>لوحة الإدارة المركزية</div>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="admin-sidebar-close-btn"
          aria-label="إغلاق القائمة"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: 'var(--space-3) var(--space-2)', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={() => {
                if (onClose) onClose();
              }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(108, 99, 255, 0.12)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
                marginBottom: '4px',
                transition: 'all var(--transition-fast)',
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={logout}
          className="btn btn-ghost"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--danger)',
            fontSize: 'var(--text-xs)',
            padding: '8px',
          }}
        >
          <LogOut size={16} />
          <span>تسجيل خروج المشرف</span>
        </button>
      </div>
    </aside>
  );
}

