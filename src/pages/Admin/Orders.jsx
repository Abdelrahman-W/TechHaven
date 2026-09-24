import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  X,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Download,
  Printer,
} from 'lucide-react';
import { api } from '../../lib/api';

const STATUS_CONFIG = {
  confirmed: { label: 'تم التأكيد', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' },
  processing: { label: 'قيد التجهيز', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  shipped: { label: 'تم الشحن', color: 'var(--brand-orange)', bg: 'rgba(255, 94, 20, 0.12)' },
  delivered: { label: 'تم التوصيل', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  cancelled: { label: 'ملغي', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOrders();
      const list = res?.data || res || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus(orderId, newStatus, `تغيير الحالة بواسطة الإدارة إلى ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchOrders();
    } catch (err) {
      alert(err.message || 'فشل تحديث حالة الطلب');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      !search ||
      o.reference?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search);
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) {
      alert('لا توجد طلبات لتصديرها حالياً.');
      return;
    }

    const headers = [
      'رقم الطلب (Reference)',
      'تاريخ الطلب',
      'اسم العميل',
      'رقم الهاتف',
      'المحافظة',
      'عنوان التوصيل',
      'طريقة الدفع',
      'حالة الطلب',
      'المجموع الفرعي (ج.م)',
      'تكلفة الشحن (ج.م)',
      'الإجمالي (ج.م)',
      'المنتجات والكميات',
      'ملاحظات العميل'
    ];

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((o) => {
      const itemsStr = (o.items || o.order_items || [])
        .map((it) => `${it.product_name || 'منتج'} (الكمية: ${it.quantity || 1})`)
        .join(' | ');

      return [
        escapeCsv(o.reference || o.id),
        escapeCsv(o.created_at ? new Date(o.created_at).toLocaleDateString('ar-EG') : ''),
        escapeCsv(o.customer_name || ''),
        escapeCsv(o.customer_phone || ''),
        escapeCsv(o.customer_city || ''),
        escapeCsv(o.customer_address || ''),
        escapeCsv(o.payment_method === 'cod' ? 'الدفع عند الاستلام' : o.payment_method || 'أونلاين'),
        escapeCsv(STATUS_CONFIG[o.status]?.label || o.status || 'تم التأكيد'),
        escapeCsv(o.subtotal || 0),
        escapeCsv(o.shipping_cost || 0),
        escapeCsv(o.total || 0),
        escapeCsv(itemsStr),
        escapeCsv(o.customer_notes || o.notes || '')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `techhaven_courier_manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px' }}>
            إدارة طلبات العملاء والشحنات
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            متابعة الطلبات المباشرة، تحديث حالة الشحن والتوصيل، ومعاينة فواتير المبيعات.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-primary btn-apple-tactile"
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', gap: 6 }}
          >
            <Download size={14} />
            <span>تصدير كشف الشحن (CSV)</span>
          </button>
          <button
            type="button"
            onClick={fetchOrders}
            className="btn btn-secondary btn-apple-tactile"
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin-slow' : ''} />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search ─────────────────────────────────── */}
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
            placeholder="بحث برقم الطلب (Reference) أو اسم العميل أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', fontSize: 'var(--text-xs)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'الكل' },
            { key: 'confirmed', label: 'مؤكدة' },
            { key: 'processing', label: 'قيد التجهيز' },
            { key: 'shipped', label: 'تم الشحن' },
            { key: 'delivered', label: 'مكتملة' },
            { key: 'cancelled', label: 'ملغية' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                background: statusFilter === tab.key ? 'var(--brand-orange)' : 'var(--bg-secondary)',
                color: statusFilter === tab.key ? '#FFFFFF' : 'var(--text-muted)',
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
        </div>
      </div>

      {/* ── Orders Table ─────────────────────────────────────── */}
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
                  رقم المرجع (Ref)
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  العميل
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  المحافظة
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  الإجمالي
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  طريقة الدفع
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  حالة الطلب
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textAlign: 'center' }}>
                  معاينة
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center' }}>
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد طلبات مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.confirmed;
                  return (
                    <tr
                      key={o.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Ref */}
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                        {o.reference || o.id}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 'var(--text-xs)' }}>
                          {o.customer_name || 'عميل'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {o.customer_phone}
                        </div>
                      </td>

                      {/* City */}
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {o.customer_city || '—'}
                      </td>

                      {/* Total */}
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                        {Number(o.total || 0).toLocaleString('ar-EG')} ج.م
                      </td>

                      {/* Payment */}
                      <td style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {o.payment_method === 'cod' ? 'الدفع عند الاستلام' : o.payment_method === 'card' ? 'بطاقة بنكية' : 'محفظة إلكترونية'}
                      </td>

                      {/* Status Dropdown */}
                      <td style={{ padding: '14px 18px' }}>
                        <select
                          value={o.status || 'confirmed'}
                          disabled={updatingId === o.id}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}`,
                            borderRadius: 'var(--radius-xs)',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="confirmed" style={{ background: '#14161F', color: '#fff' }}>تم التأكيد</option>
                          <option value="processing" style={{ background: '#14161F', color: '#fff' }}>قيد التجهيز</option>
                          <option value="shipped" style={{ background: '#14161F', color: '#fff' }}>تم الشحن</option>
                          <option value="delivered" style={{ background: '#14161F', color: '#fff' }}>تم التوصيل</option>
                          <option value="cancelled" style={{ background: '#14161F', color: '#fff' }}>ملغي</option>
                        </select>
                      </td>

                      {/* Details View Button */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--border)',
                            color: '#FFFFFF',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-xs)',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Eye size={13} />
                          <span>تفاصيل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Order Details Modal ──────────────────────────────── */}
      {selectedOrder && (
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
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="apple-scale-in"
            style={{
              width: '100%',
              maxWidth: 580,
              background: '#14161F',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
              boxShadow: 'var(--shadow-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 900, color: '#FFFFFF' }}>
                  تفاصيل الطلب: {selectedOrder.reference || selectedOrder.id}
                </h3>
                <small style={{ color: 'var(--text-muted)' }}>
                  تاريخ الطلب: {new Date(selectedOrder.created_at).toLocaleString('ar-EG')}
                </small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-sm btn-secondary btn-apple-tactile"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.78rem' }}
                  title="طباعة الفاتورة وبوليصة الشحن"
                >
                  <Printer size={15} />
                  <span>طباعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Customer Information */}
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 'var(--text-xs)', color: 'var(--brand-orange)', fontWeight: 800 }}>
                بيانات العميل والشحن:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 'var(--text-xs)' }}>
                <div><strong>الاسم:</strong> {selectedOrder.customer_name}</div>
                <div><strong>الهاتف:</strong> {selectedOrder.customer_phone}</div>
                <div><strong>المحافظة:</strong> {selectedOrder.customer_city}</div>
                <div><strong>العنوان:</strong> {selectedOrder.customer_address}</div>
              </div>
              {selectedOrder.customer_notes && (
                <div style={{ marginTop: 10, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <strong>ملاحظات العميل:</strong> {selectedOrder.customer_notes}
                </div>
              )}
            </div>

            {/* Items Ordered List */}
            <h4 style={{ margin: '0 0 10px', fontSize: 'var(--text-xs)', color: '#FFFFFF', fontWeight: 800 }}>
              المنتجات المطلوبة:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(selectedOrder.items || selectedOrder.order_items || []).map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Package size={16} style={{ color: 'var(--brand-orange)' }} />
                    <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{it.product_name || 'منتج'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>× {it.quantity}</span>
                  </div>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>
                    {Number(it.total_price || (it.unit_price * it.quantity) || 0).toLocaleString('ar-EG')} ج.م
                  </strong>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>المجموع الفرعي:</span>
                <span>{Number(selectedOrder.subtotal || 0).toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>تكلفة الشحن:</span>
                <span>{Number(selectedOrder.shipping_cost || 0).toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
                <span>الإجمالي النهائي:</span>
                <span style={{ color: 'var(--brand-orange)' }}>{Number(selectedOrder.total || 0).toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
