import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  ShieldCheck,
  UserPlus,
  Trash2,
  Search,
  Check,
  AlertCircle,
  X,
  Crown,
  Lock,
  Phone,
  Mail,
  User,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'admin',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminUsers();
      const list = res?.data || res || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'تعذر جلب قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      await api.createAdminUser(formData);
      setFormSuccess(formData.role === 'admin' ? 'تم إضافة المسؤول الجديد بنجاح!' : 'تم إنشاء الحساب بنجاح!');
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role: 'admin',
      });
      fetchUsers();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err) {
      setFormError(err.message || 'فشل إنشاء الحساب، تأكد من صحة البيانات وعدم تكرار الإيميل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRole = async (user) => {
    if (user.email === 'abdelrahman959@gmail.com') {
      alert('لا يمكن تغيير صلاحيات المدير العام الرئيسي');
      return;
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin' 
      ? `هل أنت متأكد من ترقية "${user.full_name || user.email}" ليكون مسؤولاً (Admin)؟`
      : `هل أنت متأكد من إلغاء صلاحيات الإدارة عن "${user.full_name || user.email}"؟`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateAdminUser(user.id, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'فشل تحديث الدور');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.email === 'abdelrahman959@gmail.com') {
      alert('محظور: لا يمكن حذف حساب المدير العام الرئيسي (عبد الرحمن)');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف الحساب "${user.full_name || user.email}" نهائياً؟`)) return;

    try {
      await api.deleteAdminUser(user.id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'فشل حذف الحساب');
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const customerCount = totalUsers - adminCount;

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);
    return matchesRole && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>

      {/* ── Top Header & Stats ───────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px' }}>
            إدارة المستخدمين والمسؤولين (Admins)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            التحكم الكامل في حسابات فريق الإدارة والعملاء مع إمكانية إضافة وتعيين مسؤولين جدد بصلاحيات كاملة.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn btn-th-orange btn-apple-tactile"
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: 'var(--text-xs)', gap: 8 }}
        >
          <UserPlus size={16} />
          <span>➕ إضافة مسؤول جديد (Add Admin)</span>
        </button>
      </div>

      {/* ── Metrics Cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, marginBottom: 4 }}>
              إجمالي المسؤولين (Admins)
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-orange)' }}>
              {adminCount}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 94, 20, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-orange)',
            }}
          >
            <ShieldCheck size={22} />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, marginBottom: 4 }}>
              إجمالي العملاء
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981' }}>
              {customerCount}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <UsersIcon size={22} />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, marginBottom: 4 }}>
              كافة الحسابات المسجلة
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF' }}>
              {totalUsers}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Crown size={22} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', fontSize: 'var(--text-xs)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all', label: 'الكل' },
            { key: 'admin', label: 'المسؤولين (Admins)' },
            { key: 'user', label: 'العملاء' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key)}
              style={{
                background: roleFilter === tab.key ? 'var(--brand-orange)' : 'var(--bg-secondary)',
                color: roleFilter === tab.key ? '#FFFFFF' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 14px',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchUsers}
            className="btn btn-secondary btn-apple-tactile"
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={loading ? 'spin-slow' : ''} />
          </button>
        </div>
      </div>

      {/* ── Users Table Card ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  المستخدم
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  البريد الإلكتروني
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  الصلاحية (Role)
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  رقم الهاتف
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  تاريخ الإنشاء
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textAlign: 'center' }}>
                  إجراءات التحكم
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا يوجد مستخدمين مطابقين للبحث.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isSuper = u.email === 'abdelrahman959@gmail.com' || u.is_super_admin;
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr
                      key={u.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSuper ? 'rgba(255, 94, 20, 0.03)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isSuper ? 'rgba(255, 94, 20, 0.03)' : 'transparent')}
                    >
                      {/* Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 'var(--radius-full)',
                              background: isSuper ? 'var(--brand-orange)' : isAdmin ? 'rgba(255, 94, 20, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              color: isSuper ? '#FFFFFF' : isAdmin ? 'var(--brand-orange)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              flexShrink: 0,
                            }}
                          >
                            {isSuper ? <Crown size={16} /> : isAdmin ? <ShieldCheck size={16} /> : <User size={16} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 'var(--text-xs)' }}>
                              {u.full_name || 'مستخدم بدون اسم'}
                            </div>
                            {isSuper && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--brand-orange)', fontWeight: 800 }}>
                                مالك المتجر (Primary Super Admin)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                        {u.email}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        {isSuper ? (
                          <span
                            style={{
                              background: 'rgba(255, 94, 20, 0.15)',
                              color: 'var(--brand-orange)',
                              border: '1px solid rgba(255, 94, 20, 0.3)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: 'var(--text-2xs)',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Crown size={12} />
                            <span>مدير عام رئيسي</span>
                          </span>
                        ) : isAdmin ? (
                          <span
                            style={{
                              background: 'rgba(255, 94, 20, 0.1)',
                              color: 'var(--brand-orange)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: 'var(--text-2xs)',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <ShieldCheck size={12} />
                            <span>مسؤول (Admin)</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-muted)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: 'var(--text-2xs)',
                              fontWeight: 700,
                            }}
                          >
                            عميل
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                        {u.phone || '—'}
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '14px 18px', color: 'var(--text-dim)', fontSize: 'var(--text-2xs)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {isSuper ? (
                          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)' }}>
                            حساب المالك الرئيسي محمى 🔒
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              style={{
                                background: isAdmin ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 94, 20, 0.1)',
                                color: isAdmin ? '#EF4444' : 'var(--brand-orange)',
                                border: 'none',
                                borderRadius: 'var(--radius-xs)',
                                padding: '5px 10px',
                                fontSize: 'var(--text-2xs)',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title={isAdmin ? 'تخفيض لرتبة عميل' : 'ترقية لمسؤول'}
                            >
                              {isAdmin ? 'تنزيل لعميل' : 'ترقية لمسؤول 🛡️'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              style={{
                                background: 'transparent',
                                color: 'var(--text-dim)',
                                border: 'none',
                                padding: '6px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.15s ease',
                              }}
                              title="حذف المستخدم"
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Add New Admin or User ─────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="apple-scale-in"
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#14161F',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 94, 20, 0.12)',
                    color: 'var(--brand-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 800, color: '#FFFFFF' }}>
                    إضافة مسؤول جديد للوحة التحكم
                  </h3>
                  <small style={{ color: 'var(--text-muted)' }}>منح صلاحيات إدارة المتجر والمنتجات والطلبات</small>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: 'var(--text-xs)',
                  color: '#EF4444',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} flexShrink={0} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: 'var(--text-xs)',
                  color: '#10B981',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Check size={16} flexShrink={0} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  الاسم الكامل:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. كريم حسني"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  البريد الإلكتروني:
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin-name@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px', direction: 'ltr', textAlign: 'right' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  كلمة المرور:
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  رقم الهاتف (اختياري):
                </label>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  نوع الصلاحية:
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="select"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                >
                  <option value="admin">مسؤول بصلاحيات كاملة (Admin)</option>
                  <option value="user">عميل متجر عادي (Customer)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-th-orange btn-apple-tactile"
                  style={{ flex: 1, padding: 12, borderRadius: 'var(--radius-sm)', fontWeight: 800 }}
                >
                  {submitting ? 'جارِ الحفظ...' : 'تأكيد إضافة الحساب ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
