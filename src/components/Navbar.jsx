import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  User,
  Heart,
  Menu,
  X,
  Zap,
  Phone,
  Truck,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Package,
  Settings,
  Cpu,
  Flame,
  Laptop,
  Monitor,
  Headphones,
  Smartphone,
  Layers,
  ArrowLeft,
  Globe,
  Home,
  Briefcase,
  Tag,
  Scale,
  Clock,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../lib/api';
import SearchModal from './SearchModal';
import SideDrawer from './SideDrawer';

export default function Navbar() {
  const { cart, setOpen } = useCart();
  const { user, logout } = useAuth();
  const { lang, toggleLang, isRtl, t } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const megaMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Persistent Search & Scroll States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchContainerRef = useRef(null);

  const cartCount = cart.reduce((acc, item) => acc + (item?.quantity || 1), 0);
  const [cartBouncing, setCartBouncing] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCount.current) {
      setCartBouncing(true);
      const timer = setTimeout(() => setCartBouncing(false), 600);
      prevCount.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsMegaMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);


  // Sticky header scroll detector
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounced live search autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setSearchLoading(true);
      api.getProducts({ search: searchQuery.trim() })
        .then((res) => {
          const list = res.data || res.products || [];
          setSearchResults(list.slice(0, 6));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) {
        setIsMegaMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsSearchFocused(false);
  };

  const handleResultClick = (productId) => {
    navigate(`/product/${productId}`);
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  const navLinks = [
    { name: t('nav_home', 'الرئيسية'), path: '/' },
    { name: t('nav_categories', 'تصفح الأقسام'), isMegaToggle: true },
    { name: t('nav_shop', 'المتجر'), path: '/shop' },
    { name: t('nav_pc_builder', 'بناء جهازك'), path: '/pc-builder', badge: '🔥' },
    { name: t('nav_deals', 'العروض'), path: '/shop?featured=true' },
    { name: t('nav_b2b', 'قسم الشركات'), path: '/b2b' },
  ];

  return (
    <>
      {/* ── 1. Top Announcement Bar (TechHaven Style) ─────────────── */}
      <div className="th-topbar">
        <div className="container th-topbar-inner">
          <div className="th-topbar-item">
            <Truck size={14} style={{ color: 'var(--brand-orange)' }} />
            <span>
              {settings?.announcement_active && settings?.announcement_text
                ? settings.announcement_text
                : isRtl
                ? `شحن مجاني وسريع للطلبات فوق ${(Number(settings?.free_shipping_threshold) || 2500).toLocaleString('ar-EG')} ج.م لكافة المحافظات`
                : `Free express shipping on orders over ${(Number(settings?.free_shipping_threshold) || 2500).toLocaleString('en-US')} EGP nationwide`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="th-topbar-item">
              <ShieldCheck size={14} style={{ color: '#10B981' }} />
              <span>{isRtl ? 'ضمان الوكيل الرسمي 3 سنوات معتمد' : '3-Year Official Agent Warranty'}</span>
            </div>
            <a href={`tel:${settings?.hotline || '19888'}`} className="th-topbar-item">
              <Phone size={13} style={{ color: 'var(--brand-orange)' }} />
              <span>
                {isRtl ? `خدمة العملاء: ${settings?.hotline || '19888'}` : `Hotline: ${settings?.hotline || '19888'}`}
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. Main Header (Sticky & Persistent Search) ──────────── */}
      <header className={`th-header ${isScrolled ? 'th-header-scrolled' : ''}`}>
        <div className="container th-header-inner">
          {/* Logo */}
          <Link to="/" className="th-brand-logo">
            <div className="th-logo-icon">
              <Zap size={20} fill="#fff" />
            </div>
            <div className="th-logo-text">
              <div className="th-logo-title">
                Tech<span>Haven</span>
              </div>
              <div className="th-logo-sub">SMARTER TECH. BETTER LIFE.</div>
            </div>
          </Link>

          {/* Desktop Primary Navigation */}
          <nav className="th-desktop-nav" aria-label="Main Navigation">
            {/* 1. Home */}
            <Link
              to="/"
              className={`th-nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <span>{t('nav_home', 'الرئيسية')}</span>
            </Link>

            {/* 2. Browse Categories (Mega Menu) */}
            <div style={{ position: 'relative' }} ref={megaMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsMegaMenuOpen(!isMegaMenuOpen);
                  setIsMoreMenuOpen(false);
                }}
                className={`th-nav-link ${isMegaMenuOpen ? 'active' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 700,
                  color: isMegaMenuOpen ? 'var(--brand-orange)' : undefined,
                  padding: '6px 2px',
                }}
              >
                <Layers size={15} style={{ color: isMegaMenuOpen ? 'var(--brand-orange)' : 'var(--text-secondary)' }} />
                <span>{t('nav_categories', 'تصفح الأقسام')}</span>
                <ChevronDown
                  size={13}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: isMegaMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Mega Menu Dropdown */}
              {isMegaMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 14px)',
                    insetInlineStart: 0,
                    width: 560,
                    background: '#12141F',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
                    zIndex: 1100,
                    animation: 'fadeIn 0.15s ease',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}
                >
                  {[
                    { name: isRtl ? 'كروت شاشة ومعالجات' : 'GPUs & CPUs', desc: isRtl ? 'RTX 40 / RX 7000 / Intel / AMD' : 'Latest graphics & processors', path: '/shop?category=gpu', icon: Cpu },
                    { name: isRtl ? 'أجهزة لابتوب جيمنج' : 'Gaming Laptops', desc: isRtl ? 'ASUS, Lenovo, MSI, Dell' : 'High performance portable rigs', path: '/shop?category=laptop', icon: Laptop },
                    { name: isRtl ? 'شاشات ألعاب واحترافية' : 'Gaming Monitors', desc: isRtl ? '144Hz, 240Hz, 2K & 4K IPS/OLED' : 'High refresh rates & vibrant colors', path: '/shop?category=monitors', icon: Monitor },
                    { name: isRtl ? 'سماعات واكسسوارات' : 'Headsets & Peripherals', desc: isRtl ? 'لوحات مفاتيح، ماوسات، سماعات محيطية' : 'Keyboards, mice, surround audio', path: '/shop?category=accessories', icon: Headphones },
                    { name: isRtl ? 'عروض التجميعات الجاهزة' : 'Pre-Built PC Deals', desc: isRtl ? 'تجميعات مجمعة ومجهزة ومختبرة' : 'Ready to game out of the box', path: '/shop?featured=true', icon: Flame },
                  ].map((cat, idx) => {
                    const IconComponent = cat.icon;
                    return (
                      <Link
                        key={idx}
                        to={cat.path}
                        onClick={() => setIsMegaMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: 'rgba(255, 107, 53, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--brand-orange)',
                            flexShrink: 0,
                          }}
                        >
                          <IconComponent size={17} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#fff', fontSize: '0.84rem', fontWeight: 800 }}>
                            {cat.name}
                          </div>
                          <div style={{ color: '#9CA3AF', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat.desc}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Shop */}
            <Link
              to="/shop"
              className={`th-nav-link ${location.pathname === '/shop' ? 'active' : ''}`}
            >
              <span>{t('nav_shop', 'المتجر')}</span>
            </Link>

            {/* 4. PC Builder */}
            <Link
              to="/pc-builder"
              className={`th-nav-link ${location.pathname === '/pc-builder' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <span>{t('nav_pc_builder', 'بناء جهازك')}</span>
              <span
                style={{
                  fontSize: '0.66rem',
                  background: 'rgba(255, 107, 53, 0.2)',
                  border: '1px solid rgba(255, 107, 53, 0.4)',
                  color: '#FF6B35',
                  padding: '1px 5px',
                  borderRadius: 4,
                  fontWeight: 800,
                }}
              >
                🔥
              </span>
            </Link>

            {/* 5. More Dropdown ("المزيد") */}
            <div style={{ position: 'relative' }} ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(!isMoreMenuOpen);
                  setIsMegaMenuOpen(false);
                }}
                className={`th-nav-link ${isMoreMenuOpen ? 'active' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 700,
                  color: isMoreMenuOpen ? 'var(--brand-orange)' : undefined,
                  padding: '6px 2px',
                }}
              >
                <span>{isRtl ? 'المزيد' : 'More'}</span>
                <ChevronDown
                  size={13}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: isMoreMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {isMoreMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 14px)',
                    insetInlineStart: 0,
                    width: 220,
                    background: '#141622',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    padding: 8,
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85)',
                    zIndex: 1100,
                    animation: 'fadeIn 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {[
                    { name: t('nav_deals', 'العروض'), path: '/shop?featured=true', badge: '🏷️' },
                    { name: t('nav_b2b', 'قسم الشركات'), path: '/b2b', badge: '🏢' },
                  ].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 8,
                        color: '#E5E7EB',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 107, 53, 0.12)';
                        e.currentTarget.style.color = '#FF6B35';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#E5E7EB';
                      }}
                    >
                      <span>{item.name}</span>
                      {item.badge && <span style={{ fontSize: '0.8rem' }}>{item.badge}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Integrated Desktop Pill Search Bar */}
          <div className="th-header-search-wrap th-desktop-search" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="th-header-search-form">
              <Search size={15} className="th-header-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={isRtl ? "ابحث عن أي قطعة، كروت شاشة..." : "Search hardware, GPUs..."}
                className="th-header-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="th-header-search-clear"
                  title="مسح"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Live Autocomplete Dropdown */}
            {isSearchFocused && (searchLoading || searchResults.length > 0 || (searchQuery.trim() && searchResults.length === 0)) && (
              <div className="th-search-dropdown">
                {searchLoading ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.84rem' }}>
                    <span>جاري البحث في المنتجات...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="th-search-result-item"
                        onClick={() => handleResultClick(item.id)}
                      >
                        <img
                          src={item.thumbnail || item.images?.[0] || 'https://via.placeholder.com/80'}
                          alt={item.name}
                          className="th-search-result-thumb"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isRtl ? item.name : (item.name_en || item.name)}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ color: '#FF6B35', fontWeight: 900, fontSize: '0.84rem' }}>
                              {Number(item.price).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                            </span>
                            {item.brand && (
                              <span style={{ color: '#9CA3AF', fontSize: '0.72rem' }}>• {item.brand}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div
                      onClick={handleSearchSubmit}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 107, 53, 0.08)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        textAlign: 'center',
                        color: '#FF6B35',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? `عرض كل نتائج البحث لـ "${searchQuery}" ➔` : `View all results for "${searchQuery}" ➔`}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.84rem' }}>
                    {isRtl ? `لا توجد نتائج مطابقة لـ "${searchQuery}"` : `No matching products found`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Action Icons */}
          <div className="th-header-actions">
            {/* Quick Search Button (Mobile/Tablet Only) */}
            <button
              className="th-icon-btn th-mobile-search-btn"
              onClick={() => setIsSearchOpen(true)}
              title={t('nav_search', 'بحث عن منتج')}
              aria-label="Search"
            >
              <Search size={19} />
            </button>

            {/* Language Switcher */}
            <button
              className="th-lang-btn"
              onClick={toggleLang}
              title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
              aria-label="Toggle Language"
            >
              <Globe size={15} style={{ color: 'var(--brand-orange)' }} />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Wishlist - Desktop Only */}
            <Link
              to="/wishlist"
              className="th-icon-btn th-desktop-action"
              title={t('nav_wishlist')}
              aria-label="Wishlist"
            >
              <Heart size={19} />
            </Link>

            {/* Direct Admin Dashboard Shortcut - Only shown to authenticated admin accounts */}
            {user && user.role === 'admin' && (
              <Link
                to="/admin"
                className="th-icon-btn th-desktop-action"
                title={t('nav_admin')}
                style={{
                  gap: 5,
                  padding: '5px 10px',
                  background: 'rgba(255, 94, 20, 0.1)',
                  border: '1px solid rgba(255, 94, 20, 0.3)',
                  borderRadius: '6px',
                  color: 'var(--brand-orange)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                <Settings size={15} />
                <span>{t('nav_admin')}</span>
              </Link>
            )}

            {/* User Account / Dropdown */}
            {user ? (
              <div style={{ position: 'relative' }} ref={userMenuRef} className="th-desktop-action">
                <button
                  className="th-icon-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{ gap: 6, padding: '5px 9px', background: 'rgba(255,255,255,0.05)' }}
                >
                  <User size={17} style={{ color: 'var(--brand-orange)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                    {user.name ? user.name.split(' ')[0] : 'حسابي'}
                  </span>
                  <ChevronDown size={13} />
                </button>

                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      minWidth: 200,
                      background: '#14161F',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: 8,
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{user.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{user.email}</div>
                    </div>

                    <Link
                      to="/profile"
                      style={{
                        padding: '8px 12px',
                        color: '#D1D5DB',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <User size={15} />
                      <span>{isRtl ? 'الملف الشخصي' : 'My Profile'}</span>
                    </Link>

                    <Link
                      to="/orders"
                      style={{
                        padding: '8px 12px',
                        color: '#D1D5DB',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Package size={15} />
                      <span>{isRtl ? 'طلباتي' : 'My Orders'}</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        style={{
                          padding: '8px 12px',
                          color: 'var(--brand-orange)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Settings size={15} />
                        <span>{isRtl ? 'لوحة التحكم (Admin)' : 'Admin Dashboard'}</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      style={{
                        padding: '8px 12px',
                        color: '#EF4444',
                        fontSize: '0.82rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: isRtl ? 'right' : 'left',
                        width: '100%',
                      }}
                    >
                      <LogOut size={15} />
                      <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="th-icon-btn th-desktop-action"
                title={isRtl ? 'تسجيل الدخول' : 'Sign In'}
                style={{ gap: 5, padding: '5px 10px', background: 'rgba(255,255,255,0.06)' }}
              >
                <User size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{isRtl ? 'دخول' : 'Sign In'}</span>
              </Link>
            )}

            {/* Cart Icon Button with Neon Orange Badge */}
            <button
              className="th-icon-btn"
              onClick={() => setOpen(true)}
              title={t('nav_cart')}
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className={`th-cart-count-badge ${cartBouncing ? 'th-cart-badge-bounce' : ''}`}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="th-icon-btn th-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

      </header>

      {/* ── 3. TechHaven Premium Mobile Navigation Drawer ──────────── */}
      <SideDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        ariaLabel={isRtl ? 'قائمة التنقل' : 'Navigation Menu'}
        headerContent={
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="th-drawer-brand"
          >
            <div className="th-drawer-logo-icon">
              <Zap size={18} fill="#fff" />
            </div>
            <div className="th-drawer-logo-title">
              Tech<span>Haven</span>
            </div>
          </Link>
        }
        subHeader={
          <div className="th-drawer-search-bar">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOpen(true);
              }}
              className="th-drawer-search-trigger"
              aria-label={t('nav_search_placeholder', 'ابحث عن لابتوب، كارت شاشة...')}
            >
              <Search size={16} style={{ color: 'var(--brand-orange, #FF5E14)' }} />
              <span>{t('nav_search_placeholder', 'ابحث عن لابتوب، هاتف، كارت شاشة...')}</span>
            </button>

            <button
              type="button"
              className="th-lang-btn"
              onClick={toggleLang}
              title="Toggle Language"
            >
              <Globe size={15} style={{ color: 'var(--brand-orange, #FF5E14)' }} />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          </div>
        }
      >
        {/* Main Navigation */}
        <div className="th-drawer-section-title">
                {isRtl ? 'التنقل الرئيسي' : 'MAIN NAVIGATION'}
              </div>

              {/* 1. Home */}
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.pathname === '/' ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <Home size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{t('nav_home', 'الرئيسية')}</span>
                </div>
                {location.pathname === '/' && <span className="th-drawer-dot" />}
              </Link>

              {/* 2. Shop */}
              <Link
                to="/shop"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.pathname === '/shop' && !location.search ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <ShoppingBag size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{t('nav_shop', 'المتجر')}</span>
                </div>
                {location.pathname === '/shop' && !location.search && <span className="th-drawer-dot" />}
              </Link>

              {/* 3. Browse All Categories */}
              <Link
                to="/shop"
                onClick={() => setIsMobileMenuOpen(false)}
                className="th-drawer-item"
              >
                <div className="th-drawer-item-start">
                  <Layers size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{t('nav_categories', 'تصفح جميع الأقسام')}</span>
                </div>
              </Link>

              {/* 4. PC Builder */}
              <Link
                to="/pc-builder"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.pathname === '/pc-builder' ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <Cpu size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{t('nav_pc_builder', 'بناء جهازك')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="th-drawer-badge">🔥</span>
                  {location.pathname === '/pc-builder' && <span className="th-drawer-dot" />}
                </div>
              </Link>

              {/* 5. Compare */}
              <Link
                to="/compare"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.pathname === '/compare' ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <Scale size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{isRtl ? 'مقارنة العتاد' : 'Compare Hardware'}</span>
                </div>
                {location.pathname === '/compare' && <span className="th-drawer-dot" />}
              </Link>

              <div className="th-drawer-divider" />

              {/* Section 2: Shopping Features */}
              <div className="th-drawer-section-title">
                {isRtl ? 'خدمات وعروض المتجر' : 'SHOPPING & SERVICES'}
              </div>

              {/* Deals */}
              <Link
                to="/shop?featured=true"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.search.includes('featured=true') ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <Tag size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{t('nav_deals', 'العروض المميزة')}</span>
                </div>
                {location.search.includes('featured=true') && <span className="th-drawer-dot" />}
              </Link>

              {/* B2B */}
              <Link
                to="/b2b"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.pathname === '/b2b' ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <Briefcase size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{t('nav_b2b', 'قسم الشركات (B2B)')}</span>
                </div>
                {location.pathname === '/b2b' && <span className="th-drawer-dot" />}
              </Link>

              <div className="th-drawer-divider" />

              {/* Section 3: Personal & Account */}
              <div className="th-drawer-section-title">
                {isRtl ? 'حسابي والمفضلة' : 'PERSONAL & ACCOUNT'}
              </div>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`th-drawer-item ${location.pathname === '/wishlist' ? 'active' : ''}`}
              >
                <div className="th-drawer-item-start">
                  <Heart size={18} className="th-drawer-item-icon" />
                  <span className="th-drawer-item-label">{isRtl ? 'المفضلة وقائمة الرغبات' : 'Wishlist & Favorites'}</span>
                </div>
                {location.pathname === '/wishlist' && <span className="th-drawer-dot" />}
              </Link>

              {user ? (
                <>
                  {/* Profile */}
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`th-drawer-item ${location.pathname === '/profile' ? 'active' : ''}`}
                  >
                    <div className="th-drawer-item-start">
                      <User size={18} className="th-drawer-item-icon" />
                      <span className="th-drawer-item-label">
                        {isRtl ? `حسابي (${user.name ? user.name.split(' ')[0] : 'الملف الشخصي'})` : `My Account (${user.name ? user.name.split(' ')[0] : 'Profile'})`}
                      </span>
                    </div>
                    {location.pathname === '/profile' && <span className="th-drawer-dot" />}
                  </Link>

                  {/* Orders */}
                  <Link
                    to="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`th-drawer-item ${location.pathname === '/orders' ? 'active' : ''}`}
                  >
                    <div className="th-drawer-item-start">
                      <Clock size={18} className="th-drawer-item-icon" />
                      <span className="th-drawer-item-label">{isRtl ? 'طلباتي السابقة' : 'Order History'}</span>
                    </div>
                    {location.pathname === '/orders' && <span className="th-drawer-dot" />}
                  </Link>

                  {/* Admin */}
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`th-drawer-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                      style={{ color: 'var(--brand-orange, #FF5E14)' }}
                    >
                      <div className="th-drawer-item-start">
                        <Settings size={18} className="th-drawer-item-icon" style={{ color: 'var(--brand-orange, #FF5E14)' }} />
                        <span className="th-drawer-item-label">{isRtl ? 'لوحة التحكم (Admin)' : 'Admin Dashboard'}</span>
                      </div>
                    </Link>
                  )}

                  {/* Sign Out */}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="th-drawer-signout-btn"
                  >
                    <LogOut size={18} />
                    <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-th-orange btn-apple-tactile"
                  style={{ width: '100%', textAlign: 'center', marginTop: 8, padding: '10px 16px', borderRadius: 10 }}
                >
                  <span>{isRtl ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}</span>
                </Link>
              )}

              {/* Section 4: Support & Hotline */}
              <div className="th-drawer-footer">
                <a
                  href={`tel:${settings?.hotline || '19888'}`}
                  className="th-drawer-hotline"
                >
                  <Phone size={15} />
                  <span>
                    {isRtl ? `الخط الساخن: ${settings?.hotline || '19888'}` : `Hotline: ${settings?.hotline || '19888'}`}
                  </span>
                </a>
              </div>
      </SideDrawer>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
