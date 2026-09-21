import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Plus,
  ArrowLeft,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sliders,
  BarChart3,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatEGP } from '../../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    users: 0,
    products: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, prodsRes] = await Promise.all([
        api.getAdminStats().catch(() => ({})),
        api.getAdminOrders().catch(() => ({ data: [] })),
        api.getProducts({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      const d = statsRes?.data || statsRes || {};
      const ordList = ordersRes?.data || ordersRes || [];
      const prodList = prodsRes?.data || prodsRes?.products || [];

      // Calculate low stock items (stock <= 5)
      const lowStock = Array.isArray(prodList)
        ? prodList.filter((p) => Number(p.stock_qty) <= 5).sort((a, b) => (a.stock_qty || 0) - (b.stock_qty || 0))
        : [];
      setLowStockProducts(lowStock);

      setStats({
        revenue: Number(d.revenue || d.totalRevenue || 0),
        orders: Number(d.orders || d.totalOrders || (Array.isArray(ordList) ? ordList.length : 0)),
        users: Number(d.users || d.totalUsers || 0),
        products: Number(d.products || d.totalProducts || (Array.isArray(prodList) ? prodList.length : 0)),
      });

      setRecentOrders(Array.isArray(ordList) ? ordList.slice(0, 6) : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const pendingFulfillmentOrders = recentOrders.filter(
    (o) => o.status === 'pending' || o.status === 'confirmed'
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* ── Welcome Header & Top Bar ─────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>لوحة الإدارة التنفيذية</span>
            <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 20, fontWeight: 700 }}>
              Live Connected
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            نظرة شاملة ومباشرة على مؤشرات الأداء، الشحنات المعلقة، وتنبيهات المخزون الحرجة
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/admin/products"
            className="btn btn-primary"
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: '0.85rem',
              textDecoration: 'none',
              gap: 6,
              background: 'linear-gradient(135deg, var(--brand-orange) 0%, #FF2E00 100%)',
              color: '#FFF',
              border: 'none',
              boxShadow: '0 4px 15px rgba(255, 94, 20, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>إضافة منتج جديد</span>
          </Link>

          <Link
            to="/admin/analytics"
            className="btn"
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: '#FFF',
            }}
          >
            <BarChart3 size={16} color="var(--primary)" />
            <span>التقارير المالية</span>
          </Link>

          <button
            type="button"
            onClick={fetchDashboardData}
            className="btn"
            style={{
              padding: '9px 14px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Pending Operational Alerts Banner ─────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        <Link
          to="/admin/orders"
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0.03) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textDecoration: 'none',
            color: '#FFF',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>طلبات قيد التجهيز والشحن</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>بانتظار الإسناد لشركات الشحن</div>
            </div>
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace' }}>
            {pendingFulfillmentOrders > 0 ? pendingFulfillmentOrders : recentOrders.length}
          </span>
        </Link>

        <Link
          to="/b2b"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 94, 20, 0.1) 0%, rgba(255, 94, 20, 0.03) 100%)',
            border: '1px solid rgba(255, 94, 20, 0.25)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textDecoration: 'none',
            color: '#FFF',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 94, 20, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-orange)' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>طلبات وعروض الشركات B2B</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>متابعة طلبات التوريد وعروض الأسعار</div>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand-orange)', background: 'rgba(255, 94, 20, 0.15)', padding: '4px 10px', borderRadius: 6 }}>
            عرض القسم ←
          </span>
        </Link>
      </div>

      {/* ── 4 Key Performance Metrics Cards ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              إجمالي المبيعات المحققة
            </span>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255, 94, 20, 0.12)', color: 'var(--brand-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF' }}>
            {formatEGP(stats.revenue)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 6, fontWeight: 700 }}>
            ↑ مبيعات معتمدة ومسجلة في النظام
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              إجمالي الطلبات
            </span>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={22} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace' }}>
            {stats.orders} <small style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>طلب</small>
          </div>
          <Link to="/admin/orders" style={{ fontSize: '0.75rem', color: '#38BDF8', marginTop: 6, display: 'block', fontWeight: 700, textDecoration: 'none' }}>
            معاينة وتحديث حالات الطلبات ←
          </Link>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              المنتجات النشطة
            </span>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace' }}>
            {stats.products} <small style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>منتج</small>
          </div>
          <Link to="/admin/products" style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 6, display: 'block', fontWeight: 700, textDecoration: 'none' }}>
            إدارة المخزون والتسعير ←
          </Link>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              المستخدمين والمسؤولين
            </span>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace' }}>
            {stats.users} <small style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>حساب</small>
          </div>
          <Link to="/admin/users" style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: 6, display: 'block', fontWeight: 700, textDecoration: 'none' }}>
            إضافة وتعيين أدوار المسؤولين ←
          </Link>
        </div>
      </div>

      {/* ── Low Stock Alert Section ──────────────────────────── */}
      {lowStockProducts.length > 0 && (
        <div
          className="card"
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 16,
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={22} color="#EF4444" />
              <div>
                <h3 style={{ margin: 0, color: '#FFF', fontSize: '1.1rem', fontWeight: 800 }}>
                  تنبيه المخزون الحرج (أقل من 5 قطع)
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  يوجد {lowStockProducts.length} منتجات قاربت على النفاد، يُرجى إعادة توريدها لتجنب نفاد المخزون.
                </p>
              </div>
            </div>

            <Link
              to="/admin/products"
              className="btn"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              تعديل كميات المخزون ←
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {lowStockProducts.slice(0, 4).map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <img
                  src={item.image || '/images/prod-laptop.jpg'}
                  alt={item.name}
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: '#000' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#FFF', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                    {formatEGP(item.price)}
                  </div>
                </div>
                <div
                  style={{
                    background: item.stock <= 1 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: item.stock <= 1 ? '#EF4444' : '#F59E0B',
                    border: item.stock <= 1 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.stock} قطع متبقية
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Orders Section ───────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 22, background: 'var(--brand-orange)', borderRadius: 2 }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
              أحدث طلبات الشراء الواردة للمتجر
            </h3>
          </div>
          <Link
            to="/admin/orders"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--brand-orange)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
            }}
          >
            <span>عرض كل الطلبات</span>
            <ArrowLeft size={16} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            لا توجد طلبات جديدة حالياً. ستظهر أي عملية شراء جديدة هنا فورياً.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>رقم المرجع</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>العميل</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>المحافظة</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>الإجمالي</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>الحالة</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--brand-orange)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {o.reference || o.id}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem' }}>
                      {o.customer_name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {o.customer_city}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {formatEGP(o.total || 0)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background:
                            o.status === 'delivered'
                              ? 'rgba(16,185,129,0.15)'
                              : o.status === 'shipped'
                              ? 'rgba(56,189,248,0.15)'
                              : 'rgba(255,94,20,0.15)',
                          color:
                            o.status === 'delivered'
                              ? '#10B981'
                              : o.status === 'shipped'
                              ? '#38BDF8'
                              : 'var(--brand-orange)',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 800,
                        }}
                      >
                        {o.status === 'delivered' ? 'تم التوصيل' : o.status === 'shipped' ? 'تم الشحن' : 'مؤكد'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(o.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

