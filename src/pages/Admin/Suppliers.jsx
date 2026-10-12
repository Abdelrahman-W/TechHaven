import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  PowerOff,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    notes: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        page,
        limit: 20,
      };
      const res = await api.getSuppliers(params);
      if (res.success && res.data) {
        setSuppliers(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else if (Array.isArray(res)) {
        setSuppliers(res);
      }
    } catch (err) {
      showToast(err.message || 'فشل تحميل قائمة الموردين', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      tax_number: '',
      notes: '',
      is_active: true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      tax_number: supplier.tax_number || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active !== undefined ? supplier.is_active : true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openDetailsModal = async (supplier) => {
    setSelectedSupplierDetails(supplier);
    setDetailsLoading(true);
    try {
      const res = await api.getSupplier(supplier.id);
      if (res.success && res.data) {
        setSelectedSupplierDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load supplier details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'اسم المورد مطلوب';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'اسم المورد يجب ألا يقل عن حرفين';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, formData);
        showToast('تم تحديث بيانات المورد بنجاح');
      } else {
        await api.createSupplier(formData);
        showToast('تم إضافة المورد بنجاح');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      showToast(err.message || 'فشلت العملية، يرجى التحقق من البيانات', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (supplier) => {
    try {
      if (supplier.is_active) {
        await api.deactivateSupplier(supplier.id);
        showToast('تم تعطيل حساب المورد');
      } else {
        await api.updateSupplier(supplier.id, { is_active: true });
        showToast('تم تفعيل حساب المورد');
      }
      fetchSuppliers();
    } catch (err) {
      showToast(err.message || 'فشل تحديث حالة المورد', 'error');
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`هل أنت متأكد من حذف المورد (${supplier.name}) نهائياً؟`)) {
      return;
    }

    try {
      await api.deleteSupplier(supplier.id);
      showToast('تم حذف المورد بنجاح');
      fetchSuppliers();
    } catch (err) {
      showToast(err.message || 'لا يمكن حذف المورد', 'error');
    }
  };

  // Stats calculation
  const totalCount = pagination.total || suppliers.length;
  const activeCount = suppliers.filter(s => s.is_active).length;

  return (
    <div style={{ padding: '24px', color: '#F8FAFC', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: notification.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Truck size={28} color="#F59E0B" />
            <span>إدارة الموردين</span>
          </h1>
          <p style={{ color: '#94A3B8', margin: '6px 0 0 0', fontSize: '0.9rem' }}>
            سجل الموردين المعتمدين، بيانات الاتصال، وإدارة العقود وأوامر التوريد
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            backgroundColor: '#F59E0B',
            color: '#0F172A',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
        >
          <Plus size={18} />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>إجمالي الموردين</span>
            <Building2 size={18} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>{totalCount}</div>
        </div>

        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>الموردين النشطين</span>
            <CheckCircle2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{activeCount}</div>
        </div>

        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>المعطلين / الموقوفين</span>
            <XCircle size={18} color="#94A3B8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94A3B8' }}>{totalCount - activeCount}</div>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div
        style={{
          backgroundColor: '#1E293B',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #334155',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={18} color="#64748B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="بحث باسم المورد، جهة الاتصال، الهاتف، البريد..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                padding: '10px 40px 10px 12px',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              padding: '10px 14px',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">جميع الحالات</option>
            <option value="active">النشطين فقط</option>
            <option value="inactive">المعطلين فقط</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchSuppliers}
          title="تحديث البيانات"
          style={{
            backgroundColor: '#334155',
            color: '#F8FAFC',
            border: 'none',
            padding: '10px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>المورد</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>جهة الاتصال</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>الهاتف / البريد</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>العنوان</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>الحالة</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <div>جاري تحميل بيانات الموردين...</div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <Truck size={36} color="#64748B" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#E2E8F0' }}>لا يوجد موردين مسجلين</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>قم بإضافة أول مورد لبدء تسجيل أوامر الشراء والتوريد</div>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* Supplier Name */}
                    <td style={{ padding: '14px 16px' }}>
                      <div
                        onClick={() => openDetailsModal(s)}
                        style={{ fontWeight: 700, color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Building2 size={16} />
                        <span>{s.name}</span>
                      </div>
                      {s.tax_number && (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                          س.ض: {s.tax_number}
                        </div>
                      )}
                    </td>

                    {/* Contact Person */}
                    <td style={{ padding: '14px 16px', color: '#E2E8F0' }}>
                      {s.contact_name || '—'}
                    </td>

                    {/* Phone & Email */}
                    <td style={{ padding: '14px 16px' }}>
                      {s.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1', fontSize: '0.82rem' }}>
                          <Phone size={13} color="#94A3B8" />
                          <span dir="ltr">{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.8rem', marginTop: '2px' }}>
                          <Mail size={13} color="#64748B" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {!s.phone && !s.email && <span style={{ color: '#64748B' }}>—</span>}
                    </td>

                    {/* Address */}
                    <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: '0.82rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#64748B" />
                          <span>{s.address}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: s.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: s.is_active ? '#10B981' : '#94A3B8',
                        }}
                      >
                        {s.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {s.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          title="تعديل المورد"
                          style={{
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38BDF8',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(s)}
                          title={s.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          style={{
                            backgroundColor: s.is_active ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: s.is_active ? '#EF4444' : '#10B981',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <PowerOff size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          title="حذف نهائي"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#EF4444',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Supplier Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: '16px',
              border: '1px solid #334155',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color="#F59E0B" />
                <span>{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Supplier Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  اسم الشركة / المورد <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: Cairo Tech Distribution أو التقنية لتوزيع الهاردوير"
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: formErrors.name ? '1px solid #EF4444' : '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                {formErrors.name && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.name}</div>}
              </div>

              {/* Contact Person */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  الشخص المسؤول / جهة الاتصال
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="اسم المهندس أو مسؤول المبيعات"
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@supplier.com"
                    dir="ltr"
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: formErrors.email ? '1px solid #EF4444' : '1px solid #334155',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  {formErrors.email && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.email}</div>}
                </div>
              </div>

              {/* Tax Number & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    السجل التجاري / البطاقة الضريبية
                  </label>
                  <input
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    placeholder="100-200-300"
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    العنوان / المقر
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="مول البستان، وسط البلد، القاهرة"
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  ملاحظات وتفاصيل التوريد
                </label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="المنتجات والماركات المعتمدة، شروط الدفع، فترات الضمان..."
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Active Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="supplierActiveCheck"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#F59E0B' }}
                />
                <label htmlFor="supplierActiveCheck" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#E2E8F0', cursor: 'pointer' }}>
                  حساب المورد نشط ومعتمد لأوامر الشراء
                </label>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#F8FAFC',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#0F172A',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'جاري الحفظ...' : editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {selectedSupplierDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: '16px',
              border: '1px solid #334155',
              width: '100%',
              maxWidth: '600px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={22} color="#38BDF8" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                  {selectedSupplierDetails.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupplierDetails(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {detailsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                <RefreshCw size={24} className="spin" />
                <div style={{ marginTop: '8px' }}>جاري تحميل البيانات...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
                {/* Operational Summary */}
                {selectedSupplierDetails.operational_summary && (
                  <div style={{ backgroundColor: '#0F172A', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '8px', fontWeight: 700 }}>الملخص التشغيلي لأوامر الشراء:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>إجمالي الأوامر</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38BDF8' }}>
                          {selectedSupplierDetails.operational_summary.total_orders_count}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>المؤكدة / المكتملة</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981' }}>
                          {selectedSupplierDetails.operational_summary.confirmed_orders_count}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>حجم التوريد</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F59E0B' }}>
                          {selectedSupplierDetails.operational_summary.total_purchasing_volume.toLocaleString()} ج.م
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>المسؤول:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }}>{selectedSupplierDetails.contact_name || 'غير محدد'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>الحالة:</span>
                    <div>
                      <span style={{ color: selectedSupplierDetails.is_active ? '#10B981' : '#94A3B8', fontWeight: 700 }}>
                        {selectedSupplierDetails.is_active ? 'نشط ومعتمد' : 'معطل مؤقتاً'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>الهاتف:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }} dir="ltr">{selectedSupplierDetails.phone || 'غير مسجل'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>البريد:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }} dir="ltr">{selectedSupplierDetails.email || 'غير مسجل'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>الرقم الضريبي:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }}>{selectedSupplierDetails.tax_number || 'غير مسجل'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>العنوان:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }}>{selectedSupplierDetails.address || 'غير مسجل'}</div>
                  </div>
                </div>

                {selectedSupplierDetails.notes && (
                  <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <span style={{ color: '#94A3B8', fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>ملاحظات:</span>
                    <div style={{ color: '#CBD5E1', fontSize: '0.85rem', lineHeight: '1.5' }}>{selectedSupplierDetails.notes}</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedSupplierDetails(null)}
                style={{
                  backgroundColor: '#334155',
                  color: '#F8FAFC',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
