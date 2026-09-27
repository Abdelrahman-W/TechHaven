import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Trash2,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminPurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Status transition state
  const [transitioningOrder, setTransitioningOrder] = useState(null);
  const [transitionTargetStatus, setTransitionTargetStatus] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);

  // New PO Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
    items: [
      { product_id: '', quantity: 1, unit_price: 0, line_total: 0 }
    ],
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load initial support data (suppliers and products)
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          api.getSuppliers({ isActive: true, limit: 100 }),
          api.getProducts ? api.getProducts() : Promise.resolve([]),
        ]);
        if (supRes.data) {
          setSuppliers(supRes.data);
        } else if (Array.isArray(supRes)) {
          setSuppliers(supRes);
        }

        if (prodRes && prodRes.products) {
          setProducts(prodRes.products);
        } else if (Array.isArray(prodRes)) {
          setProducts(prodRes);
        }
      } catch (err) {
        console.error('Failed to load prerequisites:', err);
      }
    };
    loadPrerequisites();
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        supplier_id: supplierFilter || undefined,
        page,
        limit: 20,
      };
      const res = await api.getPurchaseOrders(params);
      if (res.success && res.data) {
        setOrders(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else if (Array.isArray(res)) {
        setOrders(res);
      }
    } catch (err) {
      showToast(err.message || 'فشل تحميل أوامر الشراء', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, supplierFilter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openCreateModal = () => {
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: '',
      items: [
        { product_id: products[0]?.id || '', quantity: 1, unit_price: products[0]?.cost_price || products[0]?.price || 0, line_total: products[0]?.cost_price || products[0]?.price || 0 }
      ],
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleProductChange = (index, productId) => {
    const selectedProd = products.find(p => p.id === productId);
    const unitPrice = selectedProd ? (selectedProd.cost_price || selectedProd.price || 0) : 0;
    const newItems = [...formData.items];
    const qty = newItems[index].quantity || 1;
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      unit_price: unitPrice,
      line_total: Number((qty * unitPrice).toFixed(2)),
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleQuantityChange = (index, qtyVal) => {
    const qty = Math.max(1, parseInt(qtyVal, 10) || 1);
    const newItems = [...formData.items];
    const unitPrice = newItems[index].unit_price || 0;
    newItems[index] = {
      ...newItems[index],
      quantity: qty,
      line_total: Number((qty * unitPrice).toFixed(2)),
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleUnitPriceChange = (index, priceVal) => {
    const price = Math.max(0, parseFloat(priceVal) || 0);
    const newItems = [...formData.items];
    const qty = newItems[index].quantity || 1;
    newItems[index] = {
      ...newItems[index],
      unit_price: price,
      line_total: Number((qty * price).toFixed(2)),
    };
    setFormData({ ...formData, items: newItems });
  };

  const addItemRow = () => {
    const defaultProd = products[0];
    const unitPrice = defaultProd ? (defaultProd.cost_price || defaultProd.price || 0) : 0;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: defaultProd?.id || '',
          quantity: 1,
          unit_price: unitPrice,
          line_total: unitPrice,
        }
      ],
    });
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) {
      showToast('يجب أن يحتوي أمر الشراء على منتج واحد على الأقل', 'error');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  // Live Subtotal & Total
  const calculatedSubtotal = formData.items.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.supplier_id) {
      errors.supplier_id = 'يرجى اختيار المورد';
    }

    if (!formData.items || formData.items.length === 0) {
      errors.items = 'يجب إضافة منتج واحد على الأقل';
    }

    formData.items.forEach((it, idx) => {
      if (!it.product_id) {
        errors[`item_${idx}`] = 'يرجى اختيار المنتج';
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      await api.createPurchaseOrder(formData);
      showToast('تم إنشاء أمر الشراء بنجاح كمسودة');
      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'فشل إنشاء أمر الشراء', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailsModal = async (po) => {
    setSelectedOrder(po);
    setDetailsLoading(true);
    try {
      const res = await api.getPurchaseOrder(po.id);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to load PO details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openStatusTransitionModal = (order, targetStatus) => {
    setTransitioningOrder(order);
    setTransitionTargetStatus(targetStatus);
    setTransitionReason('');
  };

  const handleStatusTransitionSubmit = async () => {
    if (!transitioningOrder || !transitionTargetStatus) return;

    try {
      setTransitionSubmitting(true);
      if (transitionTargetStatus === 'CONFIRMED') {
        await api.confirmPurchaseOrder(transitioningOrder.id, transitionReason);
        showToast('تم تأكيد أمر الشراء بنجاح');
      } else if (transitionTargetStatus === 'CANCELLED') {
        await api.cancelPurchaseOrder(transitioningOrder.id, transitionReason);
        showToast('تم إلغاء أمر الشراء');
      } else if (transitionTargetStatus === 'CLOSED') {
        await api.closePurchaseOrder(transitioningOrder.id, transitionReason);
        showToast('تم إغلاق أمر الشراء');
      }
      setTransitioningOrder(null);
      if (selectedOrder && selectedOrder.id === transitioningOrder.id) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'فشل تغيير حالة أمر الشراء', 'error');
    } finally {
      setTransitionSubmitting(false);
    }
  };

  // Metrics
  const totalCount = pagination.total || orders.length;
  const draftCount = orders.filter(o => o.status === 'DRAFT').length;
  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length;
  const totalPurchasingValue = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + Number(o.total || 0) : sum, 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', icon: Clock, label: 'مسودة (DRAFT)' };
      case 'CONFIRMED':
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', icon: CheckCircle2, label: 'مؤكد (CONFIRMED)' };
      case 'CLOSED':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', icon: CheckCheck, label: 'مغلق (CLOSED)' };
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', icon: XCircle, label: 'ملغي (CANCELLED)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', icon: Clock, label: status };
    }
  };

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
            <ShoppingBag size={28} color="#38BDF8" />
            <span>أوامر الشراء والتوريد (Purchase Orders)</span>
          </h1>
          <p style={{ color: '#94A3B8', margin: '6px 0 0 0', fontSize: '0.9rem' }}>
            إصدار ومتابعة أوامر الشراء، أسعار التوريد، واعتماد دورة التوريد
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            backgroundColor: '#38BDF8',
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
          }}
        >
          <Plus size={18} />
          <span>إنشاء أمر شراء جديد</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>إجمالي أوامر الشراء</span>
            <ShoppingBag size={18} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>{totalCount}</div>
        </div>

        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>المسودات (DRAFT)</span>
            <Clock size={18} color="#94A3B8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94A3B8' }}>{draftCount}</div>
        </div>

        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>أوامر مؤكدة ومغلقة</span>
            <CheckCircle2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{confirmedCount}</div>
        </div>

        <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <span>إجمالي المشتريات التقديري</span>
            <DollarSign size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F59E0B' }}>
            {totalPurchasingValue.toLocaleString()} ج.م
          </div>
        </div>
      </div>

      {/* Filter Bar */}
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
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} color="#64748B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="بحث برقم الأمر (PO-2026-...) أو المورد..."
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
            <option value="ALL">جميع الحالات</option>
            <option value="DRAFT">مسودة (DRAFT)</option>
            <option value="CONFIRMED">مؤكد (CONFIRMED)</option>
            <option value="CLOSED">مغلق (CLOSED)</option>
            <option value="CANCELLED">ملغي (CANCELLED)</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
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
            <option value="">جميع الموردين</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          title="تحديث القائمة"
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

      {/* Purchase Orders Table */}
      <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>رقم أمر الشراء</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>المورد</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>تاريخ الأمر</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>المنتجات</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>إجمالي القيمة</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>الحالة</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <div>جاري تحميل أوامر الشراء...</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <ShoppingBag size={36} color="#64748B" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#E2E8F0' }}>لا توجد أوامر شراء مطابقة</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>قم بإنشاء أمر شراء جديد لبدء التوريد</div>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const badge = getStatusBadge(po.status);
                  const Icon = badge.icon;
                  const itemCount = po.items ? po.items.length : 1;

                  return (
                    <tr
                      key={po.id}
                      style={{
                        borderBottom: '1px solid #334155',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* PO Number */}
                      <td style={{ padding: '14px 16px' }}>
                        <div
                          onClick={() => openDetailsModal(po)}
                          style={{ fontWeight: 700, color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <ShoppingBag size={16} />
                          <span>{po.po_number}</span>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td style={{ padding: '14px 16px', color: '#E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="#94A3B8" />
                          <span>{po.supplier_name || po.supplier?.name || 'مورد'}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="#64748B" />
                          <span>{new Date(po.order_date || po.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td style={{ padding: '14px 16px', color: '#CBD5E1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Package size={14} color="#94A3B8" />
                          <span>{itemCount} صنف</span>
                        </div>
                      </td>

                      {/* Total */}
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#F59E0B' }}>
                        {Number(po.total || 0).toLocaleString()} ج.م
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          <Icon size={13} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openDetailsModal(po)}
                            title="عرض تفاصيل أمر الشراء"
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              color: '#38BDF8',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            <Eye size={14} />
                            <span>عرض</span>
                          </button>

                          {po.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => openStatusTransitionModal(po, 'CONFIRMED')}
                              title="تأكيد أمر الشراء"
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>تأكيد</span>
                            </button>
                          )}

                          {po.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => openStatusTransitionModal(po, 'CLOSED')}
                              title="إغلاق أمر الشراء"
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCheck size={14} />
                              <span>إغلاق</span>
                            </button>
                          )}

                          {(po.status === 'DRAFT' || po.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              onClick={() => openStatusTransitionModal(po, 'CANCELLED')}
                              title="إلغاء أمر الشراء"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                color: '#EF4444',
                                border: 'none',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {showCreateModal && (
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
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="#38BDF8" />
                <span>إنشاء أمر شراء وتوريد جديد</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Supplier & Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    المورد <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: formErrors.supplier_id ? '1px solid #EF4444' : '1px solid #334155',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">اختر المورد المعتمد...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {formErrors.supplier_id && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.supplier_id}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    تاريخ الأمر
                  </label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
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
                    تاريخ الاستلام المتوقع
                  </label>
                  <input
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
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

              {/* Line Items Table Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#E2E8F0' }}>
                    بنود الأصناف والكميات المطلوبة <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38BDF8',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', border: '1px solid #334155', padding: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '8px', width: '45%' }}>المنتج</th>
                        <th style={{ padding: '8px', width: '15%' }}>الكمية</th>
                        <th style={{ padding: '8px', width: '20%' }}>سعر التوريد للوحدة (ج.م)</th>
                        <th style={{ padding: '8px', width: '15%' }}>الإجمالي (ج.م)</th>
                        <th style={{ padding: '8px', width: '5%', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                              style={{
                                width: '100%',
                                backgroundColor: '#1E293B',
                                border: '1px solid #334155',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            >
                              <option value="">اختر المنتج...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku || p.id})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              style={{
                                width: '100%',
                                backgroundColor: '#1E293B',
                                border: '1px solid #334155',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                outline: 'none',
                              }}
                            />
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                              style={{
                                width: '100%',
                                backgroundColor: '#1E293B',
                                border: '1px solid #334155',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                outline: 'none',
                              }}
                            />
                          </td>

                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#38BDF8' }}>
                            {item.line_total.toLocaleString()}
                          </td>

                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 8px 4px 8px', borderTop: '1px solid #334155', marginTop: '6px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                      <span style={{ color: '#94A3B8', marginLeft: '8px' }}>إجمالي أمر الشراء:</span>
                      <span style={{ color: '#F59E0B' }}>{calculatedSubtotal.toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  ملاحظات وتعليمات التوريد
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات الشحن، موعد التسليم في المخزن، الدفعة المقدمة..."
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                    backgroundColor: '#38BDF8',
                    color: '#0F172A',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ كمسودة (Save Draft)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {selectedOrder && (
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
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={22} color="#38BDF8" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                  أمر الشراء: {selectedOrder.po_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                <RefreshCw size={24} className="spin" />
                <div style={{ marginTop: '8px' }}>جاري تحميل البيانات...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
                {/* Header Information */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#0F172A', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>المورد:</span>
                    <div style={{ fontWeight: 700, color: '#E2E8F0' }}>{selectedOrder.supplier_name || selectedOrder.supplier?.name || 'مورد'}</div>
                  </div>

                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>الحالة:</span>
                    <div>
                      {(() => {
                        const b = getStatusBadge(selectedOrder.status);
                        return <span style={{ color: b.color, fontWeight: 700 }}>{b.label}</span>;
                      })()}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>تاريخ الأمر:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }}>
                      {new Date(selectedOrder.order_date || selectedOrder.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>تاريخ التسليم المتوقع:</span>
                    <div style={{ fontWeight: 600, color: '#E2E8F0' }}>
                      {selectedOrder.expected_date ? new Date(selectedOrder.expected_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                    </div>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '8px' }}>
                    جدول الأصناف والكميات:
                  </div>
                  <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#1E293B', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                          <th style={{ padding: '8px 12px' }}>كود / اسم الصنف</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>الكمية</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>سعر الوحدة</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedOrder.items || []).map((it, idx) => (
                          <tr key={it.id || idx} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{it.product_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>SKU: {it.product_sku || it.product_id}</div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{it.quantity}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'left', color: '#CBD5E1' }}>
                              {Number(it.unit_price).toLocaleString()} ج.م
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#38BDF8' }}>
                              {Number(it.line_total || it.quantity * it.unit_price).toLocaleString()} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Financial Totals */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <div style={{ backgroundColor: '#0F172A', padding: '10px 20px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'left' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        <span style={{ color: '#94A3B8', marginLeft: '12px' }}>إجمالي القيمة:</span>
                        <span style={{ color: '#F59E0B' }}>{Number(selectedOrder.total || selectedOrder.subtotal || 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <span style={{ color: '#94A3B8', fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>ملاحظات:</span>
                    <div style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>{selectedOrder.notes}</div>
                  </div>
                )}

                {/* Actions Bar based on Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedOrder.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => openStatusTransitionModal(selectedOrder, 'CONFIRMED')}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>تأكيد أمر الشراء</span>
                      </button>
                    )}

                    {selectedOrder.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => openStatusTransitionModal(selectedOrder, 'CLOSED')}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCheck size={16} />
                        <span>إغلاق أمر الشراء</span>
                      </button>
                    )}

                    {(selectedOrder.status === 'DRAFT' || selectedOrder.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        onClick={() => openStatusTransitionModal(selectedOrder, 'CANCELLED')}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#EF4444',
                          border: '1px solid #EF4444',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <XCircle size={16} />
                        <span>إلغاء الأمر</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
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
            )}
          </div>
        </div>
      )}

      {/* Status Transition Confirmation Modal */}
      {transitioningOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: '16px',
              border: '1px solid #334155',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px 0', color: '#F8FAFC' }}>
              تأكيد تغيير حالة أمر الشراء ({transitioningOrder.po_number})
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '16px' }}>
              أنت على وشك تغيير حالة أمر الشراء إلى <strong style={{ color: '#38BDF8' }}>{transitionTargetStatus}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                سبب التغيير / ملاحظات الاعتماد (اختياري)
              </label>
              <input
                type="text"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="مثال: تم الاتفاق مع المورد وتثبيت الأسعار..."
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTransitioningOrder(null)}
                style={{
                  backgroundColor: '#334155',
                  color: '#F8FAFC',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleStatusTransitionSubmit}
                disabled={transitionSubmitting}
                style={{
                  backgroundColor: transitionTargetStatus === 'CANCELLED' ? '#EF4444' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: transitionSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {transitionSubmitting ? 'جاري التنفيذ...' : 'تأكيد التغيير'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
