import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { isRtl, t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(isRtl ? 'كلمات المرور غير متطابقة، يرجى إعادة التأكيد' : 'Passwords do not match, please confirm');
      return;
    }
    if (password.length < 6) {
      setError(isRtl ? 'يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register({ full_name: name, name, email, password });
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message || (isRtl ? 'حدث خطأ أثناء إنشاء الحساب، قد يكون البريد مسجلاً مسبقاً' : 'Error creating account, email might already be registered'));
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
        {/* Left Side: Benefits */}
        <div className="th-auth-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.8rem' }}>⚡</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                Tech<span style={{ color: 'var(--brand-orange)' }}>Haven</span>
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: '12px' }}>
              {t('auth_register_title')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--secondary)', fontSize: '1.1rem', fontWeight: 900 }}>✓</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {isRtl ? 'حفظ وتخصيص تجميعات الحواسيب ومشاركتها بسهولة' : 'Save and customize your custom PC rigs and share with friends'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--secondary)', fontSize: '1.1rem', fontWeight: 900 }}>✓</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {isRtl ? 'عروض الجملة والشركات وبرامج استبدال العتاد المعتمدة' : 'Access enterprise wholesale deals & certified hardware trade-in'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--secondary)', fontSize: '1.1rem', fontWeight: 900 }}>✓</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {isRtl ? 'تتبع مباشر ومؤمن لخط سير الشحنة حتى باب منزلك' : 'Live and insured shipment tracking directly to your door'}
                </span>
              </div>
            </div>
          </div>

          <small style={{ color: 'var(--text-muted)', marginTop: '20px', display: 'block' }}>
            🔒 {isRtl ? 'بياناتك مشفرة ومحمية بأعلى معايير الأمان العالمية.' : 'Your data is 100% encrypted & protected by global security standards.'}
          </small>
        </div>

        {/* Right Side: Form */}
        <div className="th-auth-form-wrap">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
            {t('auth_create_account')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {t('auth_register_subtitle')}
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
                marginBottom: '16px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                {t('auth_name_label')}
              </label>
              <input
                type="text"
                required
                className="search-input-field"
                placeholder={t('auth_name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
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
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('auth_password_label')}
                </label>
                <input
                  type="password"
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
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('auth_confirm_password_label')}
                </label>
                <input
                  type="password"
                  required
                  className="search-input-field"
                  placeholder={t('auth_password_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginBottom: '14px' }}
            >
              {loading ? (isRtl ? 'جاري التسجيل...' : 'Creating Account...') : t('auth_register_btn')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('auth_have_account')}{' '}
              <Link to="/login" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                {t('nav_login')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
