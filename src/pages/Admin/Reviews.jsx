import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Filter,
  User,
  Package,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [revsRes, prodsRes] = await Promise.all([
        api.getAdminReviews().catch(() => ({ data: [] })),
        api.getProducts({ limit: 200 }).catch(() => ({ data: [] })),
      ]);
      const rList = revsRes?.data || revsRes || [];
      const pList = prodsRes?.data || prodsRes?.products || [];
      setReviews(Array.isArray(rList) ? rList : []);
      setProducts(Array.isArray(pList) ? pList : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getProductName = (prodId) => {
    const p = products.find((prod) => prod.id === prodId);
    return p ? p.name : prodId;
  };

  const handleDeleteReview = async (reviewId, reviewerName) => {
    if (!window.confirm(`هل أنت متأكد من حذف تقييم العميل "${reviewerName || 'المستخدم'}" نهائياً من المتجر؟`)) {
      return;
    }

    setDeletingId(reviewId);
    try {
      await api.deleteReview(reviewId);
      showToast('تم حذف التقييم وتحديث كاش المنتجات بنجاح!');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert(err.message || 'فشل حذف التقييم');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = reviews.filter((r) => {
    const matchesRating = ratingFilter === 'all' || Number(r.rating) === Number(ratingFilter);
    const prodName = getProductName(r.product_id);
    const matchesSearch =
      !search ||
      r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.product_id?.toLowerCase().includes(search.toLowerCase()) ||
      prodName?.toLowerCase().includes(search.toLowerCase());
    return matchesRating && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* ── Top Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={26} color="var(--primary)" fill="var(--primary)" />
            إدارة وتقييمات المنتجات (Customer Reviews Moderation)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            متابعة آراء وتقييمات العملاء الحقيقية، حذف الملاحظات العشوائية أو غير اللائقة، والتحكم في تقييمات المتجر.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="btn btn-secondary btn-apple-tactile"
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'spin-slow' : ''} />
          <span>تحديث التقييمات</span>
        </button>
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

      {/* ── Filter & Search Bar ──────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
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
            placeholder="ابحث باسم المنتج، اسم العميل، أو نص التعليق..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingRight: 36,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: '#FFF',
              fontSize: '0.88rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'كافة النجوم' },
            { id: '5', label: '★★★★★ 5 نجوم' },
            { id: '4', label: '★★★★ 4 نجوم' },
            { id: '3', label: '★★★ 3 نجوم' },
            { id: '2', label: '★★ 2 نجوم' },
            { id: '1', label: '★ نجمة واحدة' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRatingFilter(item.id)}
              className="btn btn-sm btn-apple-tactile"
              style={{
                background: ratingFilter === item.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: ratingFilter === item.id ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontWeight: ratingFilter === item.id ? 800 : 600,
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reviews Table ────────────────────────────────────── */}
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
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 12px' }} />
            <div>جارٍ تحميل تقييمات العملاء...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#FFF', marginBottom: 4 }}>لا توجد تقييمات مطابقة</div>
            <div style={{ fontSize: '0.85rem' }}>ستظهر تقييمات وتقارير العملاء هنا فور نشرها على المنتجات.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>المنتج</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>التقييم</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>ملاحظات وتعليق العميل</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>العميل</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>التاريخ</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rev) => {
                  const prodName = getProductName(rev.product_id);
                  return (
                    <tr key={rev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px', maxWidth: 220 }}>
                        <a
                          href={`/product/${rev.product_id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#FFF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prodName}</span>
                          <ExternalLink size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                        </a>
                      </td>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < (rev.rating || 5) ? '#FF5E14' : 'none'}
                              stroke={i < (rev.rating || 5) ? '#FF5E14' : '#4B5563'}
                            />
                          ))}
                          <strong style={{ marginInlineStart: 6, color: '#FF5E14' }}>{rev.rating}/5</strong>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: 320 }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.84rem' }}>
                          {rev.comment || 'بدون تعليق نصي مكتوب.'}
                        </p>
                      </td>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <strong style={{ display: 'block', color: '#FFF' }}>{rev.user_name || 'عميل TechHaven'}</strong>
                        {rev.user_id && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {rev.user_id.slice(0, 8)}</span>}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString('ar-EG') : 'حديثاً'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id, rev.user_name)}
                          disabled={deletingId === rev.id}
                          className="btn btn-sm btn-apple-tactile"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#EF4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                          }}
                          title="حذف التقييم من المتجر"
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
