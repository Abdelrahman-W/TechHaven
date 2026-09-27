import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sliders,
  Package,
  ShoppingCart,
  Layers,
  Edit2,
  HelpCircle,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminReorderIntelligence() {
  const navigate = useNavigate();

  // State
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canViewCost, setCanViewCost] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sort, setSort] = useState('stock_asc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    reorder_point: 0,
    target_stock: 0,
    reorder_enabled: false,
  });
  const [settingsErrors, setSettingsErrors] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Quick PO Creation Modal
  const [showPoModal, setShowPoModal] = useState(false);
  const [poProduct, setPoProduct] = useState(null);
  const [poFormData, setPoFormData] = useState({
    supplier_id: '',
    quantity: 1,
    unit_price: 0,
    notes: '',
  });
  const [poErrors, setPoErrors] = useState({});
  const [creatingPo, setCreatingPo] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Categories & Suppliers
  useEffect(() => {
    const loadSupportData = async () => {
      try {
        const [catRes, supRes] = await Promise.all([
          api.getCategories ? api.getCategories() : Promise.resolve([]),
          api.getSuppliers ? api.getSuppliers({ isActive: true, limit: 100 }) : Promise.resolve([]),
        ]);
        if (catRes && catRes.data) setCategories(catRes.data);
        else if (Array.isArray(catRes)) setCategories(catRes);

        if (supRes && supRes.data) setSuppliers(supRes.data);
        else if (Array.isArray(supRes)) setSuppliers(supRes);
      } catch (err) {
        console.error('Failed to load support data:', err);
      }
    };
    loadSupportData();
  }, []);

  // Fetch Reorder Intelligence List & Summary
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        sort,
        page,
        limit: 20,
      };

      const [listRes, summaryRes] = await Promise.all([
        api.getReorderList(params),
        api.getReorderSummary(),
      ]);

      if (listRes && listRes.success) {
        setItems(listRes.data || []);
        if (listRes.pagination) setPagination(listRes.pagination);
        if (listRes.can_view_cost !== undefined) setCanViewCost(listRes.can_view_cost);
      }

      if (summaryRes && summaryRes.success) {
        setSummary(summaryRes.data);
        if (summaryRes.data?.can_view_cost !== undefined) {
          setCanViewCost(summaryRes.data.can_view_cost);
        }
      }
    } catch (err) {
      showToast(err.message || 'فشل تحميل بيانات ذكاء إعادة الطلب', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, sort, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Edit Settings Modal
  const openSettingsModal = (product) => {
    setSelectedProduct(product);
    setSettingsForm({
      reorder_point: product.reorder_point || 0,
      target_stock: product.target_stock || 0,
      reorder_enabled: Boolean(product.reorder_enabled),
    });
    setSettingsErrors({});
    setShowSettingsModal(true);
  };

  // Handle Save Reorder Settings
  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedProduct) return;

    const point = parseInt(settingsForm.reorder_point, 10);
    const target = parseInt(settingsForm.target_stock, 10);
    const errors = {};

    if (isNaN(point) || point < 0) {
      errors.reorder_point = 'نقطة إعادة الطلب يجب أن تكون رقماً موجباً أو صفراً';
    }
    if (isNaN(target) || target < 0) {
      errors.target_stock = 'الكمية المستهدفة يجب أن تكون رقماً موجباً أو صفراً';
    }
    if (settingsForm.reorder_enabled && target < point) {
      errors.target_stock = 'الكمية المستهدفة يجب أن تكون أكبر من أو تساوي نقطة إعادة الطلب';
    }

    if (Object.keys(errors).length > 0) {
      setSettingsErrors(errors);
      return;
    }

    try {
      setSavingSettings(true);
      await api.updateProductReorderSettings(selectedProduct.id, {
        reorder_point: point,
        target_stock: target,
        reorder_enabled: settingsForm.reorder_enabled,
      });
      showToast('تم تحديث إعدادات إعادة الطلب بنجاح');
      setShowSettingsModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Quick PO Creation Modal
  const openPoModal = (product) => {
    setPoProduct(product);
    const suggestedQty = product.reorder_quantity > 0 ? product.reorder_quantity : 1;
    setPoFormData({
      supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
      quantity: suggestedQty,
      unit_price: product.cost_price || product.price || 0,
      notes: `أمر شراء تم إنشاؤه بناءً على اقتراح إعادة طلب ذكي للمنتج: ${product.name}`,
    });
    setPoErrors({});
    setShowPoModal(true);
  };

  // Handle Create PO Submit
  const handleCreatePoSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!poProduct) return;

    const errors = {};
    if (!poFormData.supplier_id) {
      errors.supplier_id = 'يرجى اختيار المورد';
    }
    const qty = parseInt(poFormData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = 'الكمية يجب أن تكون 1 على الأقل';
    }

    if (Object.keys(errors).length > 0) {
      setPoErrors(errors);
      return;
    }

    try {
      setCreatingPo(true);
      const res = await api.createPurchaseOrder({
        supplier_id: poFormData.supplier_id,
        notes: poFormData.notes,
        items: [
          {
            product_id: poProduct.id,
            quantity: qty,
            unit_price: Number(poFormData.unit_price) || 0,
          },
        ],
      });

      showToast('تم إنشاء مسودة أمر الشراء بنجاح');
      setShowPoModal(false);
      if (res && res.data && res.data.id) {
        navigate('/admin/purchasing');
      }
    } catch (err) {
      showToast(err.message || 'فشل إنشاء أمر الشراء', 'error');
    } finally {
      setCreatingPo(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.3)', icon: XCircle, label: 'نفد من المخزون (Out of Stock)' };
      case 'LOW_STOCK':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)', icon: AlertTriangle, label: 'مخزون منخفض (Low Stock)' };
      case 'HEALTHY':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)', icon: CheckCircle2, label: 'مخزون صحي (Healthy)' };
      case 'NO_REORDER_RULE':
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94A3B8', border: 'rgba(148, 163, 184, 0.25)', icon: Layers, label: 'غير مفعّل (No Rule)' };
    }
  };

  return (
    <div style={{ padding: '24px', color: '#F8FAFC', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '10px', borderRadius: '12px' }}>
              <TrendingUp size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                ذكاء إعادة الطلب (Reorder Intelligence)
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.88rem' }}>
                لوحة استشارية ذكية لمتابعة مستويات المخزون، كشف النواقص، واقتراح كميات إعادة التوريد
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            style={{
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.88rem',
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Advisory Banner */}
      <div
        style={{
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.85rem',
          color: '#CBD5E1',
        }}
      >
        <HelpCircle size={20} color="#38BDF8" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#38BDF8' }}>نظام استشاري: </strong>
          اقتراحات إعادة الطلب تهدف لمساعدة الإدارة في اتخاذ قرارات الشراء والتوريد ولا تقوم بإنشاء أوامر شراء أو تعديل المخزون تلقائياً.
        </div>
      </div>

      {/* KPI Cards Grid */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Tracked Products */}
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.82rem', marginBottom: '8px' }}>
              <span>المنتجات المتابعة</span>
              <Sliders size={18} color="#38BDF8" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC' }}>
              {summary.total_tracked_products}
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#94A3B8', marginRight: '6px' }}>/ {summary.total_products} منتج</span>
            </div>
          </div>

          {/* Healthy Stock */}
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.82rem', marginBottom: '8px' }}>
              <span>مخزون صحي ومستقر</span>
              <CheckCircle2 size={18} color="#10B981" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981' }}>
              {summary.healthy_count}
            </div>
          </div>

          {/* Low Stock */}
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.82rem', marginBottom: '8px' }}>
              <span>مخزون منخفض (نواقص)</span>
              <AlertTriangle size={18} color="#F59E0B" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B' }}>
              {summary.low_stock_count}
            </div>
          </div>

          {/* Out of Stock */}
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.82rem', marginBottom: '8px' }}>
              <span>نفد من المخزون</span>
              <XCircle size={18} color="#EF4444" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>
              {summary.out_of_stock_count}
            </div>
          </div>

          {/* Total Reorder Suggestions */}
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '0.82rem', marginBottom: '8px' }}>
              <span>اقتراحات إعادة التوريد</span>
              <ShoppingCart size={18} color="#38BDF8" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38BDF8' }}>
              {summary.total_suggested_units.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#94A3B8', marginRight: '6px' }}>وحدة مطلوبة</span>
            </div>
            {canViewCost && summary.total_estimated_replenishment_value !== null && (
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
                قيمة تقديرية: <strong style={{ color: '#F59E0B' }}>{Number(summary.total_estimated_replenishment_value).toLocaleString()} ج.م</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar / Filters */}
      <div
        style={{
          backgroundColor: '#1E293B',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #334155',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1' }}>
            <Search
              size={16}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالاسم، كود الصنف SKU، أو الماركة..."
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                padding: '9px 36px 9px 12px',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              color: '#F8FAFC',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">جميع حالات المخزون</option>
            <option value="REORDER_SUGGESTION">اقتراحات إعادة التوريد (مطلوب طلبها)</option>
            <option value="LOW_STOCK">مخزون منخفض (Low Stock)</option>
            <option value="OUT_OF_STOCK">نفد من المخزون (Out of Stock)</option>
            <option value="HEALTHY">مخزون صحي (Healthy)</option>
            <option value="NO_REORDER_RULE">غير مفعل إعادة الطلب</option>
          </select>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                color: '#F8FAFC',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">جميع الأقسام</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              color: '#F8FAFC',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="stock_asc">الأقل مخزوناً أولاً</option>
            <option value="stock_desc">الأعلى مخزوناً أولاً</option>
            <option value="suggested_desc">الأعلى كمية مطلوبة أولاً</option>
            {canViewCost && <option value="value_desc">الأعلى قيمة تقديرية</option>}
            <option value="name_asc">الاسم (أبجدياً)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          backgroundColor: '#1E293B',
          borderRadius: '12px',
          border: '1px solid #334155',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px' }}>المنتج</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>الرصيد الحالي</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>نقطة إعادة الطلب</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>المخزون المستهدف</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>الكمية المقترحة</th>
                {canViewCost && <th style={{ padding: '14px 16px', textAlign: 'left' }}>القيمة التقديرية</th>}
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>حالة المخزون</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canViewCost ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <span>جاري تحليل بيانات المخزون وإعادة الطلب...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={canViewCost ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <Package size={32} style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.5 }} />
                    <span>لا توجد منتجات مطابقة لخيارات التصفية المحددة</span>
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const badge = getStatusBadge(it.stock_status);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr
                      key={it.id}
                      style={{
                        borderBottom: '1px solid #334155',
                        transition: 'background-color 0.15s',
                        backgroundColor: it.needs_reorder ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                      }}
                    >
                      {/* Product */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {it.thumbnail ? (
                            <img
                              src={it.thumbnail}
                              alt={it.name}
                              style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', backgroundColor: '#0F172A' }}
                            />
                          ) : (
                            <div style={{ width: '38px', height: '38px', borderRadius: '6px', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{it.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                              SKU: {it.sku} {it.brand && `• ${it.brand}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            backgroundColor: it.current_stock <= 0 ? 'rgba(239, 68, 68, 0.15)' : it.current_stock <= it.reorder_point ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: it.current_stock <= 0 ? '#EF4444' : it.current_stock <= it.reorder_point ? '#F59E0B' : '#10B981',
                          }}
                        >
                          {it.current_stock}
                        </span>
                      </td>

                      {/* Reorder Point */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#CBD5E1', fontWeight: 600 }}>
                        {it.reorder_enabled ? it.reorder_point : <span style={{ color: '#64748B' }}>-</span>}
                      </td>

                      {/* Target Stock */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#CBD5E1', fontWeight: 600 }}>
                        {it.reorder_enabled ? it.target_stock : <span style={{ color: '#64748B' }}>-</span>}
                      </td>

                      {/* Suggested Reorder Qty */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {it.reorder_quantity > 0 ? (
                          <span style={{ color: '#38BDF8', fontWeight: 800, fontSize: '0.95rem' }}>
                            +{it.reorder_quantity}
                          </span>
                        ) : (
                          <span style={{ color: '#64748B' }}>0</span>
                        )}
                      </td>

                      {/* Estimated Value (Cost Auth only) */}
                      {canViewCost && (
                        <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                          {it.estimated_reorder_value > 0 ? (
                            <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                              {Number(it.estimated_reorder_value).toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span style={{ color: '#64748B' }}>-</span>
                          )}
                        </td>
                      )}

                      {/* Status Badge */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <BadgeIcon size={13} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openSettingsModal(it)}
                            title="تعديل قواعد إعادة الطلب"
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
                            <Edit2 size={13} />
                            <span>ضبط</span>
                          </button>

                          {it.needs_reorder && (
                            <button
                              type="button"
                              onClick={() => openPoModal(it)}
                              title="إنشاء مسودة أمر شراء"
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
                              <ShoppingCart size={13} />
                              <span>طلب توريد</span>
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

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '14px 16px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0F172A',
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              إجمالي النتائج: {pagination.total} (صفحة {pagination.page} من {pagination.totalPages})
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                  fontSize: '0.82rem',
                }}
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                style={{
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= pagination.totalPages ? 0.5 : 1,
                  fontSize: '0.82rem',
                }}
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Reorder Settings Modal */}
      {showSettingsModal && selectedProduct && (
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
              maxWidth: '520px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0', color: '#F8FAFC' }}>
              ضبط قواعد إعادة الطلب
            </h3>
            <div style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '18px' }}>
              {selectedProduct.name} <span style={{ color: '#38BDF8' }}>({selectedProduct.sku})</span>
            </div>

            <form onSubmit={handleSaveSettings}>
              {/* Enable Switch */}
              <div style={{ marginBottom: '18px', backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={settingsForm.reorder_enabled}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, reorder_enabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#38BDF8', cursor: 'pointer' }}
                  />
                  <span>تفعيل تتبع ذكاء إعادة الطلب لهذا المنتج</span>
                </label>
              </div>

              {/* Reorder Point */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  نقطة إعادة الطلب (Reorder Point)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.reorder_point}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, reorder_point: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: settingsErrors.reorder_point ? '1px solid #EF4444' : '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
                  عند وصول المخزون لهذه الكمية أو أقل، يظهر تنبيه لإعادة التوريد.
                </div>
                {settingsErrors.reorder_point && (
                  <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                    {settingsErrors.reorder_point}
                  </span>
                )}
              </div>

              {/* Target Stock */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  المخزون المستهدف (Target Stock)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.target_stock}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, target_stock: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: settingsErrors.target_stock ? '1px solid #EF4444' : '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
                  الكمية المرغوب الوصول إليها عند إعادة الطلب (يجب أن تكون ≥ نقطة إعادة الطلب).
                </div>
                {settingsErrors.target_stock && (
                  <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                    {settingsErrors.target_stock}
                  </span>
                )}
              </div>

              {/* Live Preview Calculation */}
              {settingsForm.reorder_enabled && (
                <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px', fontSize: '0.85rem' }}>
                  <div style={{ color: '#94A3B8', marginBottom: '4px' }}>معاينة الاقتراح الحالي:</div>
                  <div style={{ color: '#F8FAFC' }}>
                    الرصيد الحالي: <strong>{selectedProduct.current_stock}</strong> • الكمية المقترحة للطلب:{' '}
                    <strong style={{ color: '#38BDF8' }}>
                      {selectedProduct.current_stock <= parseInt(settingsForm.reorder_point || 0, 10)
                        ? Math.max(0, parseInt(settingsForm.target_stock || 0, 10) - selectedProduct.current_stock)
                        : 0}{' '}
                      وحدة
                    </strong>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#F8FAFC',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  style={{
                    backgroundColor: '#38BDF8',
                    color: '#0F172A',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: savingSettings ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick PO Modal */}
      {showPoModal && poProduct && (
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
              maxWidth: '540px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0', color: '#F8FAFC' }}>
              إنشاء مسودة أمر شراء (Purchase Order)
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '18px' }}>
              سيتم إنشاء أمر شراء كمسودة (DRAFT) للمنتج: <strong style={{ color: '#F8FAFC' }}>{poProduct.name}</strong>
            </p>

            <form onSubmit={handleCreatePoSubmit}>
              {/* Supplier Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  المورد المعتمد *
                </label>
                <select
                  value={poFormData.supplier_id}
                  onChange={(e) => setPoFormData((prev) => ({ ...prev, supplier_id: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: poErrors.supplier_id ? '1px solid #EF4444' : '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">-- اختر المورد --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.contact_name && `(${s.contact_name})`}
                    </option>
                  ))}
                </select>
                {poErrors.supplier_id && (
                  <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                    {poErrors.supplier_id}
                  </span>
                )}
              </div>

              {/* Quantity & Unit Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    الكمية المطلوبة *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={poFormData.quantity}
                    onChange={(e) => setPoFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: poErrors.quantity ? '1px solid #EF4444' : '1px solid #334155',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  {poErrors.quantity && (
                    <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                      {poErrors.quantity}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    سعر الوحدة التقديري (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={poFormData.unit_price}
                    onChange={(e) => setPoFormData((prev) => ({ ...prev, unit_price: e.target.value }))}
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
              </div>

              {/* Total Summary */}
              <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>إجمالي أمر الشراء المتوقع:</span>
                <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '1.05rem' }}>
                  {(
                    (parseInt(poFormData.quantity, 10) || 0) * (Number(poFormData.unit_price) || 0)
                  ).toLocaleString()}{' '}
                  ج.م
                </span>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                  ملاحظات
                </label>
                <textarea
                  rows={2}
                  value={poFormData.notes}
                  onChange={(e) => setPoFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#F8FAFC',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingPo}
                  style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: creatingPo ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creatingPo ? 'جاري الإنشاء...' : 'إنشاء أمر الشراء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
