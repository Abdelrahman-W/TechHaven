import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Play,
  ArrowRight,
  Clock,
  Package,
  ShoppingCart,
  Building2,
  Truck,
  Layers,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api';

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'حرج (Critical)',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: AlertTriangle,
  },
  WARNING: {
    label: 'تحذير (Warning)',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: AlertCircle,
  },
  INFO: {
    label: 'معلومة (Info)',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    icon: Info,
  },
};

const STATUS_CONFIG = {
  OPEN: {
    label: 'مفتوح (Open)',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
  },
  ACKNOWLEDGED: {
    label: 'تم الاطلاع (Acknowledged)',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
  },
  RESOLVED: {
    label: 'تم الحل (Resolved)',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
  },
};

const ENTITY_CONFIG = {
  PRODUCT: {
    label: 'منتج / مخزون',
    icon: Package,
    link: '/admin/reorder',
    linkText: 'عرض في النواقص',
  },
  PURCHASE_ORDER: {
    label: 'أمر شراء',
    icon: ShoppingCart,
    link: '/admin/purchasing',
    linkText: 'عرض أوامر الشراء',
  },
  B2B_CUSTOMER: {
    label: 'حساب شركة B2B',
    icon: Building2,
    link: '/admin/b2b',
    linkText: 'عرض حسابات B2B',
  },
  ORDER: {
    label: 'طلب متجر',
    icon: Truck,
    link: '/admin/orders',
    linkText: 'عرض الطلبات',
  },
  SYSTEM: {
    label: 'أتمتة النظام',
    icon: ShieldAlert,
    link: null,
    linkText: '',
  },
};

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.getAlertsSummary();
      if (res?.success && res?.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts summary:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (entityFilter !== 'ALL') params.entity_type = entityFilter;
      if (search) params.search = search;

      const res = await api.getAlerts(params);
      if (res?.success) {
        setAlerts(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter, entityFilter, search]);

  useEffect(() => {
    fetchSummary();
    fetchAlerts();
  }, [fetchSummary, fetchAlerts]);

  const handleTriggerEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await api.triggerAutomationEvaluation();
      if (res?.success) {
        const d = res.data || {};
        showToast(`اكتمل الفحص: إنشاء ${d.alerts_created || 0} تنبيه، تحديث ${d.alerts_updated || 0}، وحل ${d.alerts_resolved || 0}`);
        fetchSummary();
        fetchAlerts();
      }
    } catch (err) {
      alert(err.message || 'فشل تشغيل التقييم الأوتوماتيكي');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeAlert(id);
      showToast('تم تأكيد الاطلاع على التنبيه بنجاح');
      fetchSummary();
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'فشل تأكيد استلام التنبيه');
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.resolveAlert(id);
      showToast('تم حل وإغلاق التنبيه بنجاح');
      fetchSummary();
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'فشل حل التنبيه');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* ── Top Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={26} color="var(--primary)" />
            مركز التنبيهات والأتمتة التشغيلية (Operational Alerts)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            رصد أوتوماتيكي فوري لعمليات المخزون، إعادة الطلب، أوامر الشراء، حسابات B2B، وتجهيز الطلبات.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTriggerEvaluation}
            disabled={evaluating}
            className="btn btn-primary btn-apple-tactile"
            style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', gap: 8, fontWeight: 800 }}
          >
            <Play size={16} className={evaluating ? 'spin-slow' : ''} />
            <span>{evaluating ? 'جارٍ الفحص التشغيلي...' : 'فحص وتقييم أوتوماتيكي الآن'}</span>
          </button>

          <button
            type="button"
            onClick={() => { fetchSummary(); fetchAlerts(); }}
            className="btn btn-secondary btn-apple-tactile"
            style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin-slow' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 10,
            padding: '12px 18px',
            color: '#10B981',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── KPI Summary Cards ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Critical Alerts */}
        <div
          className="card"
          onClick={() => { setSeverityFilter('CRITICAL'); setStatusFilter('OPEN'); setPage(1); }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>تنبيهات حرجة</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#EF4444' }}>
            {summary?.critical_count || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            نفاد مخزون أو تجاوز حدود ائتمان
          </div>
        </div>

        {/* Warnings */}
        <div
          className="card"
          onClick={() => { setSeverityFilter('WARNING'); setStatusFilter('OPEN'); setPage(1); }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>تحذيرات تشغيلية</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B' }}>
            {summary?.warning_count || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            نواقص مخزون أو استلام جزئي
          </div>
        </div>

        {/* Info Alerts */}
        <div
          className="card"
          onClick={() => { setSeverityFilter('INFO'); setStatusFilter('OPEN'); setPage(1); }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>إشعارات معلوماتية</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
              <Info size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38BDF8' }}>
            {summary?.info_count || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            أوامر شراء معلقة وطلبات للتجهيز
          </div>
        </div>

        {/* Total Active Alerts */}
        <div
          className="card"
          onClick={() => { setSeverityFilter('ALL'); setStatusFilter('OPEN'); setPage(1); }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>إجمالي التنبيهات المفتوحة</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(255, 255, 255, 0.08)', color: '#FFF' }}>
              <Bell size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFF' }}>
            {summary?.total_active_alerts || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            تم الاطلاع على {summary?.acknowledged_count || 0} منها
          </div>
        </div>
      </div>

      {/* ── Filters & Search Header ───────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'OPEN', label: 'المفتوحة (Open)' },
              { id: 'ACKNOWLEDGED', label: 'تم الاطلاع (Acknowledged)' },
              { id: 'RESOLVED', label: 'المغلقة / المحلولة (Resolved)' },
              { id: 'ALL', label: 'كافة الحالات' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setStatusFilter(t.id); setPage(1); }}
                className="btn btn-sm btn-apple-tactile"
                style={{
                  background: statusFilter === t.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: statusFilter === t.id ? '#FFF' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  fontWeight: statusFilter === t.id ? 800 : 600,
                  borderRadius: 8,
                  padding: '6px 14px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                right: 12,
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="ابحث في التنبيهات، المنتجات، أو المعرفات..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                paddingRight: 36,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: '#FFF',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* Sub-Filters: Severity & Entity Type */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>مستوى الخطورة:</span>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: '#FFF',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <option value="ALL">جميع المستويات</option>
              <option value="CRITICAL">حرج (Critical)</option>
              <option value="WARNING">تحذير (Warning)</option>
              <option value="INFO">معلومة (Info)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>مجال التنبيه:</span>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: '#FFF',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <option value="ALL">كافة المجالات</option>
              <option value="PRODUCT">مخزون ومنتجات (Product)</option>
              <option value="PURCHASE_ORDER">أوامر شراء ومشتريات (Purchase Order)</option>
              <option value="B2B_CUSTOMER">حسابات شركات B2B (Customer)</option>
              <option value="ORDER">طلبات التجهيز والشحن (Order)</option>
              <option value="SYSTEM">أتمتة النظام (System)</option>
            </select>
          </div>

          <div style={{ marginRight: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            إجمالي التنبيهات المطابقة: <strong>{pagination.total}</strong>
          </div>
        </div>
      </div>

      {/* ── Alerts Table & List ──────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spin-slow" style={{ margin: '0 auto 12px' }} />
            <div>جارٍ تحميل سجل التنبيهات التشغيلية...</div>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>لا توجد تنبيهات تشغيلية مطابقة</div>
            <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
              كافة العمليات التشغيلية للمخزون والمشتريات وحسابات الشركات ضمن الحدود الطبيعية.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 700 }}>مستوى الخطورة</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 700 }}>عنوان التنبيه والبيان</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 700 }}>المجال / الكيان</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 700 }}>آخر رصد</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 700 }}>الحالة</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
                  const st = STATUS_CONFIG[alert.status] || STATUS_CONFIG.OPEN;
                  const ent = ENTITY_CONFIG[alert.entity_type] || ENTITY_CONFIG.SYSTEM;
                  const SevIcon = sev.icon;
                  const EntIcon = ent.icon;

                  return (
                    <tr
                      key={alert.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: alert.status === 'OPEN' && alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Severity */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: sev.color,
                            background: sev.bg,
                            border: `1px solid ${sev.border}`,
                          }}
                        >
                          <SevIcon size={14} />
                          <span>{sev.label}</span>
                        </span>
                      </td>

                      {/* Title & Message */}
                      <td style={{ padding: '14px 18px', maxWidth: 420 }}>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.92rem', marginBottom: 4 }}>
                          {alert.title}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.4 }}>
                          {alert.message}
                        </div>
                      </td>

                      {/* Entity & Link */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
                          <EntIcon size={14} color="var(--primary)" />
                          <span>{ent.label}</span>
                        </div>
                        {ent.link && (
                          <Link
                            to={ent.link}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: 'var(--primary)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              marginTop: 4,
                              textDecoration: 'none',
                            }}
                          >
                            <span>{ent.linkText}</span>
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </td>

                      {/* Last Detected Timestamp */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} color="var(--text-muted)" />
                          <span>{formatDateTime(alert.last_detected_at)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: st.color,
                            background: st.bg,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          {alert.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(alert.id)}
                              className="btn btn-sm btn-secondary btn-apple-tactile"
                              style={{ padding: '5px 10px', fontSize: '0.78rem', gap: 4 }}
                              title="تأكيد الاطلاع"
                            >
                              <Check size={13} />
                              <span>اطلاع</span>
                            </button>
                          )}

                          {alert.status !== 'RESOLVED' && (
                            <button
                              type="button"
                              onClick={() => handleResolve(alert.id)}
                              className="btn btn-sm btn-ghost btn-apple-tactile"
                              style={{ padding: '5px 10px', fontSize: '0.78rem', gap: 4, color: '#10B981' }}
                              title="حل وإغلاق التنبيه"
                            >
                              <CheckCircle2 size={13} />
                              <span>حل</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>صفحة {pagination.page} من {pagination.totalPages}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-sm btn-secondary btn-apple-tactile"
                style={{ padding: '4px 12px' }}
              >
                السابق
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="btn btn-sm btn-secondary btn-apple-tactile"
                style={{ padding: '4px 12px' }}
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
