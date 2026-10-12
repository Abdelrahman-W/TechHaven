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
  Shield,
} from 'lucide-react';
import { api } from '../../lib/api';

const ROLES_CONFIG = {
  owner: { label: 'المدير العام (Owner)', color: '#FF5E14', bg: 'rgba(255, 94, 20, 0.15)' },
  admin: { label: 'مسؤول نظام (Admin)', color: '#FF5E14', bg: 'rgba(255, 94, 20, 0.15)' },
  store_manager: { label: 'مدير المتجر (Store Manager)', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' },
  inventory_officer: { label: 'مسؤول المخازن (Inventory Officer)', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' },
  fulfillment_agent: { label: 'مسؤول الشحن (Fulfillment Agent)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  user: { label: 'عميل (Customer)', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)' },
};

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
      setFormSuccess(formData.role !== 'user' ? 'تم إضافة عضو الفريق بنجاح!' : 'تم إنشاء الحساب بنجاح!');
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

  const getNextRole = (currentRole) => {
    const roles = ['user', 'store_manager', 'inventory_officer', 'fulfillment_agent', 'admin'];
    const currentIndex = roles.indexOf(currentRole);
    if (currentIndex === -1) return roles[0]; // default to user
    const nextIndex = (currentIndex + 1) % roles.length;
    return roles[nextIndex];
  };

  const handleChangeUserRole = async (user, newRole) => {
    if (user.email === 'abdelrahman959@gmail.com' || user.id === 'admin-abdelrahman') {
      alert('لا يمكن تغيير صلاحيات المدير العام الرئيسي');
      return;
    }
    if (user.role === newRole) return;

    const roleLabel = ROLES_CONFIG[newRole]?.label || newRole;
    const confirmMsg = `هل أنت متأكد من تغيير دور "${user.full_name || user.email}" إلى: ${roleLabel}؟`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateAdminUser(user.id, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'فشل تحديث الدور');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await api.deleteAdminUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'فشل حذف المستخدم');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);

    const matchesRole =
      roleFilter === 'all' || u.role === roleFilter;

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
          <span>إضافة مسؤول جديد (Add Admin)</span>
        </button>
      </div>

      {/* ── Metrics Cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>إجمالي المستخدمين</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', marginTop: 8 }}>
            {users.length}
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>مسؤولين actifs</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', marginTop: 8 }}>
            {users.filter((u) => u.role !== 'user').length}
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>عملاء actifs</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', marginTop: 8 }}>
            {users.filter((u) => u.role === 'user').length}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>بحث</label>
          <input
            type="text"
            placeholder="ابحث بالاسم أو البريد أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ fontSize: 'var(--text-xs)', padding: '10px 12px', width: 280 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>تصفية حسب الدور</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="select"
            style={{
              fontSize: 'var(--text-xs)',
              padding: '10px 12px',
              width: 220,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <option value="all">الكل</option>
            <option value="owner">المدير العام</option>
            <option value="admin">مسؤول نظام</option>
            <option value="store_manager">مدير المتجر</option>
            <option value="inventory_officer">مسؤول المخازن</option>
            <option value="fulfillment_agent">مسؤول الشحن</option>
            <option value="user">عملاء</option>
          </select>
        </div>
      </div>

      {/* ── Users Table ───────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                الصورة
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                الاسم الكامل
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                البريد الإلكتروني
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                الدور
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                الهاتف
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                تاريخ الإنشاء
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  textAlign: 'center',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}
              >
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  لا يوجد مستخدمين يطابقون البحث
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isSuper = u.role === 'owner' || u.is_super_admin;
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Avatar */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          background: 'var(--bg-input)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {u.full_name ? (
                          u.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                    </td>

                    {/* Full Name */}
                    <td style={{ padding: '14px 18px', color: '#FFFFFF', fontSize: 'var(--text-xs)' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 'var(--text-xs)' }}>
                          {u.full_name || 'مستخدم بدون اسم'}
                        </div>
                        {isSuper && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: 'var(--brand-orange)',
                              fontWeight: 800,
                            }}
                          >
                            مالك المتجر (Primary Super Admin)
                          </span>
                        )}
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
                            background: ROLES_CONFIG.owner.bg,
                            color: ROLES_CONFIG.owner.color,
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
                          <span>{ROLES_CONFIG.owner.label}</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            background: ROLES_CONFIG[u.role]?.bg,
                            color: ROLES_CONFIG[u.role]?.color,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: 'var(--text-2xs)',
                            fontWeight: u.role === 'admin' ? 800 : 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {u.role === 'admin' && <ShieldCheck size={12} />}
                          <span>{ROLES_CONFIG[u.role]?.label}</span>
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
                          حساب المالك الرئيسي محمي
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              const nextRole = getNextRole(u.role);
                              handleChangeUserRole(u, nextRole);
                            }}
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
                            {isAdmin ? 'تنزيل لعميل' : 'ترقية لمسؤول'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-dim)',
                              border: 'none',
                              padding: '5px 10px',
                              fontSize: 'var(--text-2xs)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Trash2 size={16} />
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

      {/* ── Create User Modal ─────────────────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '90%',
              maxWidth: 400,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                {formData.role !== 'user' ? 'إضافة عضو فريق جديد' : 'إنشاء حساب عميل جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  الاسم الكامل:*
                </label>
                <input
                  type="text"
                  required
                  placeholder="أحمد علي محمد"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  البريد الإلكتروني:*
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
                  كلمة المرور:*
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
                  placeholder="+20 1XXXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px', direction: 'ltr' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  الدور:
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="select"
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '10px 12px',
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <option value="owner">المدير العام (Owner)</option>
                  <option value="admin">مسؤول نظام (Admin)</option>
                  <option value="store_manager">مدير المتجر (Store Manager)</option>
                  <option value="inventory_officer">مسؤول المخازن (Inventory Officer)</option>
                  <option value="fulfillment_agent">مسؤول الشحن (Fulfillment Agent)</option>
                  <option value="user">عميل (Customer)</option>
                </select>
              </div>

              {formError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#EF4444',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    marginTop: 12,
                  }}
                >
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: '#10B981',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    marginTop: 12,
                  }}
                >
                  {formSuccess}
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormSuccess(null);
                    setFormData({
                      full_name: '',
                      email: '',
                      password: '',
                      phone: '',
                      role: 'admin',
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'var(--brand-orange)',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'جاري الإضافة...' : 'تأكيد الإضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}