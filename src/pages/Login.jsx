import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { isRtl, t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message || (isRtl ? 'فشل تسجيل الدخول، تأكد من صحة البريد الإلكتروني وكلمة المرور' : 'Login failed, please verify your email and password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        background: 'var(--bg-body)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 4vw, 40px) 16px',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <div className="th-auth-card">
        {/* Left Side: Brand & Visuals */}
        <div className="th-auth-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.8rem' }}>⚡</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                Tech<span style={{ color: 'var(--brand-orange)' }}>Haven</span>
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: '12px' }}>
              {t('auth_login_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {t('auth_login_subtitle')}
            </p>
          </div>

          {/* Enterprise Features & Security */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span>
              <span>{t('auth_security_1')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--brand-orange)', fontWeight: 900 }}>✓</span>
              <span>{t('auth_security_2')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#38BDF8', fontWeight: 900 }}>✓</span>
              <span>{t('auth_security_3')}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="th-auth-form-wrap">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
            {t('nav_login')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            {isRtl ? 'أدخل بريدك الإلكتروني وكلمة المرور للمتابعة' : 'Enter your email address and password to continue'}
          </p>

          {error && (
            <div
              style={{
                background: 'rgba(255, 107, 107, 0.15)',
                border: '1px solid var(--danger)',
                color: '#FF6B6B',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '18px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {t('auth_email_label')}
              </label>
              <input
                type="email"
                required
                className="search-input-field"
                placeholder={t('auth_email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {t('auth_password_label')}
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', cursor: 'pointer' }}>
                  {t('auth_forgot_password')}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="search-input-field"
                  placeholder={t('auth_password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    paddingInlineEnd: '42px',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    [isRtl ? 'left' : 'right']: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                  aria-label={showPassword ? t('auth_hide_pass') : t('auth_show_pass')}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginBottom: '16px' }}
            >
              {loading ? (isRtl ? 'جاري التحقق...' : 'Verifying...') : t('auth_login_btn')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('auth_no_account')}{' '}
              <Link to="/register" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                {t('auth_create_account')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
