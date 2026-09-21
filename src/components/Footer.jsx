import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Send,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  ChevronDown,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Lock,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';

export default function Footer() {
  const { t, lang, isRtl } = useLanguage();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (sectionId) => {
    setOpenSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 3500);
    }
  };

  const valueProps = [
    {
      icon: <Truck size={22} />,
      title: t('footer_prop_fast_title'),
      sub: t('footer_prop_fast_sub'),
    },
    {
      icon: <ShieldCheck size={22} />,
      title: t('footer_prop_warranty_title'),
      sub: t('footer_prop_warranty_sub'),
    },
    {
      icon: <RotateCcw size={22} />,
      title: t('footer_prop_return_title'),
      sub: t('footer_prop_return_sub'),
    },
    {
      icon: <MessageSquare size={22} />,
      title: t('footer_prop_support_title'),
      sub: t('footer_prop_support_sub'),
    },
  ];

  return (
    <footer className="th-footer">
      <div className="container">
        {/* 1. Value Props Strip */}
        <div className="th-footer-props-strip">
          {valueProps.map((prop, idx) => (
            <div key={idx} className="th-footer-prop-item">
              <div className="th-footer-prop-icon">{prop.icon}</div>
              <div>
                <div className="th-footer-prop-title">{prop.title}</div>
                <div className="th-footer-prop-sub">{prop.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 2. Main 4-Column Grid */}
        <div className="th-footer-grid">
          {/* Col 1: Brand Info & Contact */}
          <div>
            <Link to="/" className="th-brand-logo" style={{ marginBottom: 14 }}>
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

            <p className="th-footer-brand-desc">
              {t('footer_tagline')}
            </p>

            <div className="th-footer-contact-grid">
              <a href={`tel:${settings?.hotline || '19888'}`} className="th-footer-contact-card">
                <Phone size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>
                  {isRtl ? `الخط الساخن: ${settings?.hotline || '19888'} (طوال الأسبوع)` : `Hotline: ${settings?.hotline || '19888'} (24/7)`}
                </span>
              </a>
              <a href={`mailto:${settings?.email || 'support@techhaven.com.eg'}`} className="th-footer-contact-card">
                <Mail size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>{settings?.email || 'support@techhaven.com.eg'}</span>
              </a>
              <div className="th-footer-contact-card">
                <MapPin size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>{settings?.address || t('footer_address')}</span>
              </div>
            </div>

            {(() => {
              const rawWa = settings?.whatsapp_phone || '01274757241';
              const cleanDigits = rawWa.replace(/\D/g, '');
              const waTarget = cleanDigits.startsWith('0')
                ? `20${cleanDigits.slice(1)}`
                : cleanDigits.startsWith('20')
                ? cleanDigits
                : `20${cleanDigits}`;
              const waUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(
                isRtl ? 'مرحباً، أود الاستفسار من فريق دعم TechHaven' : 'Hello, I have an inquiry for TechHaven support'
              )}`;

              return (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="th-footer-whatsapp-btn"
                >
                  <MessageSquare size={16} />
                  <span>{isRtl ? `تواصل مباشرة عبر واتساب (${settings?.whatsapp_phone || '01274757241'})` : `Chat on WhatsApp (${settings?.whatsapp_phone || '01274757241'})`}</span>
                </a>
              );
            })()}
          </div>

          {/* Col 2: Quick Links (Collapsible Accordion on Mobile) */}
          <div>
            <button
              type="button"
              className="th-footer-accordion-btn"
              onClick={() => toggleSection('quick')}
              aria-expanded={openSection === 'quick'}
            >
              <span>{t('footer_quick_links')}</span>
              <ChevronDown
                size={18}
                className={`th-footer-accordion-chevron ${
                  openSection === 'quick' ? 'open' : ''
                }`}
              />
            </button>
            <div
              className={`th-footer-links-wrap ${
                openSection === 'quick' ? 'open' : 'closed'
              }`}
            >
              <div className="th-footer-links">
                <Link to="/" className="th-footer-link">
                  {t('nav_home')}
                </Link>
                <Link to="/shop" className="th-footer-link">
                  {t('nav_shop')}
                </Link>
                <Link to="/pc-builder" className="th-footer-link">
                  {t('nav_pc_builder')}
                </Link>
                <Link to="/b2b" className="th-footer-link">
                  {t('nav_b2b')}
                </Link>
                <Link to="/wishlist" className="th-footer-link">
                  {t('nav_wishlist')}
                </Link>
              </div>
            </div>
          </div>

          {/* Col 3: Customer Care & Warranty (Collapsible Accordion on Mobile) */}
          <div>
            <button
              type="button"
              className="th-footer-accordion-btn"
              onClick={() => toggleSection('support')}
              aria-expanded={openSection === 'support'}
            >
              <span>{t('footer_support')}</span>
              <ChevronDown
                size={18}
                className={`th-footer-accordion-chevron ${
                  openSection === 'support' ? 'open' : ''
                }`}
              />
            </button>
            <div
              className={`th-footer-links-wrap ${
                openSection === 'support' ? 'open' : 'closed'
              }`}
            >
              <div className="th-footer-links">
                <Link to="/orders" className="th-footer-link">
                  {t('footer_track_order')}
                </Link>
                <Link to="/profile" className="th-footer-link">
                  {t('footer_manage_account')}
                </Link>
                <Link to="/shop" className="th-footer-link">
                  {t('footer_return_policy')}
                </Link>
                <Link to="/shop" className="th-footer-link">
                  {t('footer_warranty_terms')}
                </Link>
                <Link to="/shop" className="th-footer-link">
                  {t('footer_payment_methods')}
                </Link>
                <Link to="/shop" className="th-footer-link">
                  {t('footer_maintenance_centers')}
                </Link>
              </div>
            </div>
          </div>

          {/* Col 4: Newsletter & Payment Badges */}
          <div>
            <div className="th-newsletter-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={16} style={{ color: 'var(--brand-orange)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                  {t('footer_newsletter_title')}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                {t('footer_newsletter_sub')}
              </p>

              <form onSubmit={handleSubscribe} className="th-newsletter-form">
                <input
                  type="email"
                  placeholder={t('footer_newsletter_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="th-newsletter-input"
                />
                <button type="submit" className="th-newsletter-btn" title="Subscribe">
                  {subscribed ? <CheckCircle size={16} /> : <Send size={16} />}
                </button>
              </form>

              {subscribed && (
                <div
                  style={{
                    color: '#10B981',
                    fontSize: '0.78rem',
                    marginTop: 8,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle size={14} />
                  <span>{t('footer_subscribed')}</span>
                </div>
              )}

              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  {t('footer_payments_title')}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="th-payment-badge">
                    <CreditCard size={13} style={{ color: '#60A5FA' }} />
                    <span>Visa / Master</span>
                  </span>
                  <span className="th-payment-badge">
                    <CreditCard size={13} style={{ color: '#F59E0B' }} />
                    <span>Meeza ميزة</span>
                  </span>
                  <span className="th-payment-badge">
                    <span style={{ color: '#EC4899', fontWeight: 900 }}>⚡</span>
                    <span>InstaPay</span>
                  </span>
                  <span className="th-payment-badge">
                    <span style={{ color: '#EF4444', fontWeight: 900 }}>📱</span>
                    <span>Vodafone Cash</span>
                  </span>
                  <span className="th-payment-badge">
                    <span>{isRtl ? '💵 كاش عند الاستلام' : '💵 Cash on Delivery'}</span>
                  </span>
                </div>

                <div className="th-ssl-badge">
                  <Lock size={13} />
                  <span>{t('footer_ssl')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            fontSize: '0.78rem',
            color: '#6B7280',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            © {new Date().getFullYear()} {isRtl ? (settings?.store_name || 'TechHaven Egypt') : (settings?.store_name_en || 'TechHaven')}. {lang === 'ar' ? 'جميع الحقوق محفوظة لشركة تك هافن للتجارة الإلكترونية.' : 'All rights reserved. TechHaven E-Commerce Co.'}
          </div>
          <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: '0.76rem', flexWrap: 'wrap' }}>
            <span>{isRtl ? `سجل تجاري: ${settings?.commercial_reg || '409214'}` : `CR: ${settings?.commercial_reg || '409214'}`}</span>
            <span>{isRtl ? `بطاقة ضريبية: ${settings?.tax_card || '712-441-903'}` : `Tax ID: ${settings?.tax_card || '712-441-903'}`}</span>
            <span style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>
              ⚡ {t('footer_authorized')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}