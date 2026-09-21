import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Cpu,
  ShoppingCart,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function MobileBottomNav() {
  const { cart, setOpen } = useCart();
  const { user } = useAuth();
  const { t, isRtl } = useLanguage();
  const location = useLocation();

  // Don't display inside admin dashboard - admin has its own dedicated mobile layout
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const cartCount = cart.reduce(
    (total, item) => total + (item?.quantity || 1),
    0
  );

  const isAdmin = user && user.role === 'admin';

  return (
    <nav className="th-mobile-bottom-nav" aria-label={isRtl ? 'شريط الملاحة السفلي للموبايل' : 'Mobile Bottom Navigation Bar'}>
      <div className="th-mobile-bottom-nav-inner">
        {/* 1. Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `th-bottom-nav-item btn-apple-tactile ${isActive ? 'active' : ''}`
          }
        >
          <div className="th-bottom-nav-icon-wrap">
            <Home size={20} />
          </div>
          <span className="th-bottom-nav-label">{t('nav_home', 'الرئيسية')}</span>
        </NavLink>

        {/* 2. Shop / Market */}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `th-bottom-nav-item btn-apple-tactile ${isActive ? 'active' : ''}`
          }
        >
          <div className="th-bottom-nav-icon-wrap">
            <ShoppingBag size={20} />
          </div>
          <span className="th-bottom-nav-label">{t('nav_shop', 'المتجر')}</span>
        </NavLink>

        {/* 3. Center Elevated Action Button (PC Builder) */}
        <NavLink
          to="/pc-builder"
          className={({ isActive }) =>
            `th-bottom-nav-center-btn btn-apple-tactile ${isActive ? 'active' : ''}`
          }
          title={isRtl ? 'بناء جهازك الاحترافي' : 'Custom PC Builder'}
          aria-label={t('nav_pc_builder', 'بناء جهازك')}
        >
          <div className="th-center-btn-disc">
            <Cpu size={24} className="th-center-btn-icon" />
          </div>
          <span className="th-bottom-nav-label-center">{t('nav_pc_builder', 'ابنِ جهازك')}</span>
        </NavLink>

        {/* 4. Cart (Triggers Cart Drawer) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`th-bottom-nav-item btn-apple-tactile ${cartCount > 0 ? 'has-items' : ''}`}
          aria-label={t('nav_cart', 'سلة المشتريات')}
        >
          <div className="th-bottom-nav-icon-wrap" style={{ position: 'relative' }}>
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="th-bottom-nav-badge">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <span className="th-bottom-nav-label">{t('nav_cart', 'السلة')}</span>
        </button>

        {/* 5. Account / Admin */}
        <NavLink
          to={isAdmin ? '/admin' : '/profile'}
          className={({ isActive }) =>
            `th-bottom-nav-item btn-apple-tactile ${isActive ? 'active' : ''}`
          }
        >
          <div className="th-bottom-nav-icon-wrap">
            {isAdmin ? (
              <ShieldCheck size={20} style={{ color: 'var(--brand-orange)' }} />
            ) : (
              <User size={20} />
            )}
          </div>
          <span className="th-bottom-nav-label">
            {isAdmin ? t('nav_admin', 'الإدارة') : t('nav_account', 'حسابي')}
          </span>
        </NavLink>
      </div>
    </nav>
  );
}
