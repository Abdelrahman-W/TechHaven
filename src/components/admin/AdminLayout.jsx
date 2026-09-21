import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { ShieldAlert, Lock, ArrowRight, LogOut, AlertCircle, LogIn, Home } from 'lucide-react';
import '../../styles/admin.css';

const AdminLayout = () => {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle Admin Login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور للمتابعة');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await login(email, password);
      const loggedUser = res.data?.user || res.user;
      if (loggedUser && loggedUser.role !== 'admin') {
        setError('هذا الحساب غير مصرح له بالدخول كمسؤول نظام');
      }
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول كمسؤول، تأكد من صحة البريد وكلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Initial auth token verification state
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          direction: 'rtl',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            جارِ التحقق من الصلاحيات الإدارية...
          </p>
        </div>
      </div>
    );
  }

  // 2. Authenticated as Admin -> Render full Dashboard
  if (user && user.role === 'admin') {
    return (
      <div
        className="admin-layout"
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          direction: 'rtl',
          position: 'relative',
        }}
      >
        {sidebarOpen && (
          <div
            className="admin-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة الجانبية"
          />
        )}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div
          className="admin-main"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
        >
          <AdminHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main
            className="admin-page-content"
            style={{
              padding: '20px 16px',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // 3. Authenticated as a normal Customer (NOT an Admin) -> 403 Forbidden Screen
  if (user && user.role !== 'admin') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 20%, #1c1417 0%, #0A0B0E 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px 20px',
          color: '#FFFFFF',
          direction: 'rtl',
        }}
      >
        <div
          className="apple-scale-in"
          style={{
            width: '100%',
            maxWidth: '480px',
            background: 'rgba(24, 18, 22, 0.9)',
            backdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 32px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(239, 68, 68, 0.15)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-full)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              margin: '0 auto 20px',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.2)',
            }}
          >
            <ShieldAlert size={36} />
          </div>

          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#EF4444',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              marginBottom: 12,
            }}
          >
            خطأ 403: غير مصرح بالدخول (Access Denied)
          </span>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 12, color: '#FFFFFF' }}>
            منطقة مخصصة للإدارة فقط
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 20 }}>
            أهلاً <strong style={{ color: '#fff' }}>{user.name || user.email}</strong>، حسابك الحالي مسجل كـ
            <span style={{ color: '#38BDF8', fontWeight: 700 }}> عميل عادي</span>. هذه اللوحة مخصصة لمسؤولي ومطوري المتجر فقط ولا تملك الصلاحيات الإدارية لدخولها.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              to="/"
              className="btn btn-primary btn-apple-tactile"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <Home size={18} />
              <span>العودة للمتجر الرئيسي</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="btn btn-ghost btn-apple-tactile"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <LogOut size={16} />
              <span>تسجيل الخروج للتبديل لحساب مسؤول</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Guest / Unauthenticated Visitor -> Secure Credentials Login Form (No bypass buttons)
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #1A1D2B 0%, #0A0B0E 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        color: '#FFFFFF',
        direction: 'rtl',
      }}
    >
      <div
        className="apple-scale-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(20, 22, 31, 0.9)',
          backdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 28px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(255, 94, 20, 0.12)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 94, 20, 0.12)',
            border: '1px solid rgba(255, 94, 20, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-orange)',
            margin: '0 auto 20px',
            boxShadow: '0 0 20px rgba(255, 94, 20, 0.25)',
          }}
        >
          <Lock size={28} />
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 900, marginBottom: 8, color: '#FFFFFF' }}>
          بوابة دخول إدارة المتجر
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 24 }}>
          منطقة مشددة الحماية مخصصة لمسؤولي النظام وموظفي الدعم المعتمدين فقط.
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#EF4444',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textAlign: 'start',
            }}
          >
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'start' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              البريد الإلكتروني للمسؤول:
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              style={{ fontSize: '0.85rem', padding: '11px 14px', width: '100%' }}
              placeholder="admin@techhaven.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              كلمة المرور:
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              style={{ fontSize: '0.85rem', padding: '11px 14px', width: '100%' }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-th-orange btn-apple-tactile"
            style={{
              width: '100%',
              padding: '13px',
              marginTop: 6,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? (
              <span>جارِ التحقق من الهوية...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>تسجيل الدخول كمسؤول</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Link
            to="/"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowRight size={14} />
            <span>العودة للمتجر الرئيسي</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
