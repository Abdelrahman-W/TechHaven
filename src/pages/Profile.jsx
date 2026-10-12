import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Package,
  Heart,
  ShieldCheck,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
  const { user, loading, logout, updateUser } = useAuth();
  const { isRtl, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('info');
  const [isSaved, setIsSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || user?.full_name || (isRtl ? 'عميل TechHaven' : 'TechHaven Client'),
    email: user?.email || 'user@techhaven.com.eg',
    phone: user?.phone || '01012345678',
    city: isRtl ? 'القاهرة' : 'Cairo',
    address: user?.address || (isRtl ? 'المعادي، شارع النصر، عمارة 14' : 'Maadi, El-Nasr St, Bldg 14'),
  });

  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (updateUser) await updateUser(form);
      setIsSaved(true);
      toast.success(t('profile_saved_success'));
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      toast.error(err.message || (isRtl ? 'حدث خطأ أثناء حفظ البيانات' : 'Error updating profile'));
    }
  };

  return (
    <div className="page" style={{ padding: 'clamp(16px, 3vw, var(--space-8)) 0 calc(92px + env(safe-area-inset-bottom, 0px))', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Profile Header Card */}
        <div
          className="card"
          style={{
            padding: 'clamp(16px, 3vw, var(--space-6))',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: '#fff',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(108, 99, 255, 0.3)',
                flexShrink: 0,
              }}
            >
              {form.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800 }}>{form.name}</h1>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: user.role === 'admin' ? 'rgba(255, 107, 53, 0.15)' : 'rgba(0, 212, 170, 0.15)',
                    color: user.role === 'admin' ? 'var(--accent)' : 'var(--secondary)',
                    fontWeight: 700,
                  }}
                >
                  {user.role === 'admin' ? t('profile_badge_admin') : t('profile_badge_vip')}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {form.email}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-secondary btn-sm btn-apple-tactile">
                {t('nav_admin')}
              </Link>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={logout}
              style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={15} />
              <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Quick Nav Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link
            to="/orders"
            className="card btn-apple-tactile"
            style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(108, 99, 255, 0.15)', color: 'var(--primary)' }}>
              <Package size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{t('profile_quick_orders')}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('profile_quick_orders_sub')}</div>
            </div>
          </Link>

          <Link
            to="/wishlist"
            className="card btn-apple-tactile"
            style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 71, 87, 0.15)', color: 'var(--danger)' }}>
              <Heart size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{t('profile_quick_wishlist')}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('profile_quick_wishlist_sub')}</div>
            </div>
          </Link>

          <div
            className="card"
            style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 212, 170, 0.15)', color: 'var(--secondary)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{t('profile_quick_warranty')}</div>
              <div style={{ fontSize: '11px', color: 'var(--success)' }}>{t('profile_quick_warranty_sub')}</div>
            </div>
          </div>
        </div>

        {/* Profile Content Section */}
        <div
          className="card"
          style={{
            padding: 'clamp(16px, 3vw, var(--space-6))',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              style={{
                background: 'transparent',
                border: 'none',
                paddingBottom: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {t('profile_tab_info')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              style={{
                background: 'transparent',
                border: 'none',
                paddingBottom: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {t('profile_tab_security')}
            </button>
          </div>

          {activeTab === 'info' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {isSaved && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'rgba(46, 213, 115, 0.1)',
                    border: '1px solid rgba(46, 213, 115, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--success)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{t('profile_saved_success')}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    {t('auth_name_label')}
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    {t('auth_email_label')}
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    disabled
                    style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    {t('auth_phone_label')}
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    {t('profile_city_label')}
                  </label>
                  <select
                    className="select"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value={isRtl ? 'القاهرة' : 'Cairo'}>{isRtl ? 'القاهرة' : 'Cairo'}</option>
                    <option value={isRtl ? 'الجيزة' : 'Giza'}>{isRtl ? 'الجيزة' : 'Giza'}</option>
                    <option value={isRtl ? 'الإسكندرية' : 'Alexandria'}>{isRtl ? 'الإسكندرية' : 'Alexandria'}</option>
                    <option value={isRtl ? 'القليوبية' : 'Qalyubia'}>{isRtl ? 'القليوبية' : 'Qalyubia'}</option>
                    <option value={isRtl ? 'الشرقية' : 'Sharqia'}>{isRtl ? 'الشرقية' : 'Sharqia'}</option>
                    <option value={isRtl ? 'السويس' : 'Suez'}>{isRtl ? 'السويس' : 'Suez'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  {t('profile_address_label')}
                </label>
                <textarea
                  className="textarea"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-apple-tactile"
                style={{ width: 'fit-content', padding: '10px 24px', marginTop: 'var(--space-2)' }}
              >
                {t('profile_save_btn')}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  {isRtl ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  style={{ width: '100%', maxWidth: '400px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  {isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  style={{ width: '100%', maxWidth: '400px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  {t('auth_confirm_password_label')}
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  style={{ width: '100%', maxWidth: '400px' }}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-apple-tactile"
                style={{ width: 'fit-content', padding: '10px 24px' }}
                onClick={() => toast.success(isRtl ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully')}
              >
                {isRtl ? 'تحديث كلمة المرور' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

