import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import StatsCard from '../../components/admin/StatsCard';
import DataTable from '../../components/admin/DataTable';

const REPORTS = [
  ['executive', 'الملخص التنفيذي'], ['sales', 'المبيعات'], ['profitability', 'الربحية والتكلفة'],
  ['products', 'أداء المنتجات'], ['categories', 'أداء الفئات'], ['inventory', 'المخزون'],
  ['purchasing', 'المشتريات والموردون'], ['b2b', 'أرصدة B2B'], ['alerts', 'التنبيهات التشغيلية'],
];
const PERIODS = [
  ['last_7_days', 'آخر 7 أيام'], ['last_30_days', 'آخر 30 يومًا'], ['last_90_days', 'آخر 90 يومًا'],
  ['this_month', 'هذا الشهر'], ['this_year', 'هذا العام'], ['all_time', 'كل الفترات'],
];
const formatMoney = (value) => value == null ? '—' : `${Number(value).toLocaleString('ar-EG')} ج.م`;
const formatValue = (value) => value == null ? '—' : typeof value === 'number' ? value.toLocaleString('ar-EG') : String(value);

function rowsFor(type, result) {
  if (type === 'products' || type === 'categories') return result?.data || [];
  if (type === 'purchasing') return result?.suppliers_breakdown || [];
  if (type === 'alerts') return result?.alerts || result?.data || [];
  if (type === 'sales') return result?.trend?.data || [];
  return [];
}

export default function Reports() {
  const [reportType, setReportType] = useState('executive');
  const [period, setPeriod] = useState('last_30_days');
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState('revenue');
  const [direction, setDirection] = useState('desc');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const params = useMemo(() => ({ period, page, limit, sort, direction, search }), [period, page, limit, sort, direction, search]);

  const loadReport = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const loaders = {
        executive: api.getExecutiveSummary, sales: api.getSalesSummary,
        profitability: api.getProfitabilitySummary, products: api.getProductPerformance,
        categories: api.getCategoryPerformance, inventory: api.getInventoryReport,
        purchasing: api.getPurchasingReport, b2b: api.getB2BReport,
        alerts: api.getOperationalAlertsReport,
      };
      setResult(await loaders[reportType](params));
    } catch (err) { setResult(null); setError(err.message || 'تعذر تحميل التقرير'); }
    finally { setLoading(false); }
  }, [params, reportType]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const rows = rowsFor(reportType, result);
  const columns = rows.length ? Object.keys(rows[0]).map((key) => ({ key, label: key })) : [];
  const pagination = result?.pagination || { page, limit, total: rows.length, totalPages: 1 };

  const download = async () => {
    const exportType = reportType === 'executive' || reportType === 'sales' ? 'sales' : reportType;
    if (!['sales', 'products', 'inventory', 'purchasing'].includes(exportType)) return;
    try {
      const csv = await api.exportReportCSV(exportType, { period });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `techhaven-${exportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message || 'تعذر تصدير التقرير'); }
  };

  const executive = reportType === 'executive' ? result : null;
  const kpis = executive ? [
    ['الإيرادات الإجمالية', formatMoney(executive.sales?.gross_revenue), 'var(--brand-orange)'],
    ['عدد الطلبات', formatValue(executive.sales?.total_orders), '#38BDF8'],
    ['الوحدات المباعة', formatValue(executive.sales?.units_sold), '#10B981'],
    ['الربح الإجمالي', formatMoney(executive.profitability?.gross_profit), '#A855F7'],
  ] : [];

  return (
    <section className="admin-page" dir="rtl" style={{ padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <div><h1 style={{ marginBottom: 6 }}>التقارير والتحليلات التنفيذية</h1><p style={{ color: 'var(--text-secondary)', margin: 0 }}>تقارير تشغيلية server-authoritative وليست قوائم مالية رسمية.</p></div>
        <div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn btn-outline" onClick={loadReport} disabled={loading}><RefreshCw size={16} /> تحديث</button><button type="button" className="btn btn-primary" onClick={download} disabled={!['sales', 'products', 'inventory', 'purchasing'].includes(reportType)}><Download size={16} /> CSV</button></div>
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{REPORTS.map(([key, label]) => <button key={key} type="button" className={`btn ${key === reportType ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setReportType(key); setPage(1); }}>{label}</button>)}</div>
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>الفترة <select value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}>{PERIODS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {(reportType === 'products' || reportType === 'categories') && <label>بحث <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="اسم المنتج أو SKU" /></label>}
        {(reportType === 'products' || reportType === 'categories') && <label>صفوف <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>}
        {reportType === 'products' && <><label>فرز <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="revenue">الإيرادات</option><option value="quantity_sold">الكمية</option><option value="gross_profit">الربح</option><option value="current_stock">المخزون</option><option value="name">الاسم</option></select></label><button type="button" className="btn btn-outline" onClick={() => setDirection((value) => value === 'asc' ? 'desc' : 'asc')}>الاتجاه: {direction === 'asc' ? 'تصاعدي' : 'تنازلي'}</button></>}
      </div>
      {error && <div role="alert" className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {loading && <div style={{ padding: 48, textAlign: 'center' }}>جاري تحميل التقرير...</div>}
      {!loading && executive && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>{kpis.map(([title, value, color]) => <StatsCard key={title} title={title} value={value} change="من التقرير الحالي" color={color} icon={<TrendingUp size={20} />} />)}</div>}
      {!loading && !executive && <DataTable columns={columns} data={rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, formatValue(value)])))} loading={false} emptyMessage="لا توجد بيانات ضمن الفترة المحددة" />}
      {!loading && executive && <div className="card" style={{ padding: 20 }}><h2>ملخص تنفيذي</h2><pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(executive, null, 2)}</pre></div>}
      {!loading && rows.length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}><span>الصفحة {pagination.page || page} من {pagination.totalPages || 1} — إجمالي {pagination.total || rows.length}</span><div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</button><button type="button" className="btn btn-outline" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>التالي</button></div></div>}
    </section>
  );
}