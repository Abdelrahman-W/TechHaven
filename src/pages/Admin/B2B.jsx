import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  X,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatEGP } from '../../lib/utils';

const B2B_STATUS_CONFIG = {
  new: { label: 'طلب جديد', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' },
  pending: { label: 'قيد الدراسة', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  quoted: { label: 'تم إرسال العرض', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)' },
  contracted: { label: 'تم التعاقد', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  closed: { label: 'مكتمل', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.12)' },
  cancelled: { label: 'ملغي', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export default function AdminB2B() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReq, setSelectedReq] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminB2BRequests();
      const list = res?.data || res || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusChange = async (reqId, newStatus) => {
    setUpdatingId(reqId);
    try {
      await api.updateAdminB2BStatus(reqId, newStatus, adminNoteInput || selectedReq?.admin_notes || '');
      showToast('تم تحديث حالة طلب الشركة بنجاح!');
      fetchRequests();
      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq((prev) => ({ ...prev, status: newStatus, admin_notes: adminNoteInput || prev.admin_notes }));
      }
    } catch (err) {
      alert(err.message || 'فشل تحديث حالة الطلب');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter || (statusFilter === 'new' && !r.status);
    const matchesSearch =
      !search ||
      r.quote_ref?.toLowerCase().includes(search.toLowerCase()) ||
      r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) ||
      r.tax_id?.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* ── Top Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={26} color="var(--primary)" />
            طلبات عروض أسعار الشركات (B2B Quotations)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            متابعة طلبات التوريد المباشر، عروض أسعار الشركات، البطاقات الضريبية، والتواصل مع مسؤولي المشتريات.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          className="btn btn-secondary btn-apple-tactile"
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'spin-slow' : ''} />
          <span>تحديث الطلبات</span>
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

      {/* ── Search & Filter Bar ──────────────────────────────── */}
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
            placeholder="ابحث برقم المرجع، اسم الشركة، اسم المسؤول، أو رقم الهاتف..."
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
          {['all', 'new', 'pending', 'quoted', 'contracted', 'closed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className="btn btn-sm btn-apple-tactile"
              style={{
                background: statusFilter === st ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === st ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontWeight: statusFilter === st ? 800 : 600,
                borderRadius: 8,
                padding: '6px 14px',
              }}
            >
              {st === 'all' ? 'جميع الطلبات' : B2B_STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table of Inquiries ───────────────────────────────── */}
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
            <div>جارٍ تحميل طلبات الشركات...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#FFF', marginBottom: 4 }}>لا توجد طلبات عروض أسعار مطابقة</div>
            <div style={{ fontSize: '0.85rem' }}>ستظهر طلبات عروض أسعار المؤسسات والشركات هنا فور تقديمها.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>رقم المرجع</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>الشركة / المؤسسة</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>المسؤول والتواصل</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>عدد الأجهزة</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>الميزانية التقديرية</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>الحالة</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>تاريخ الطلب</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reqItem) => {
                  const st = B2B_STATUS_CONFIG[reqItem.status] || B2B_STATUS_CONFIG.new;
                  return (
                    <tr key={reqItem.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--primary)' }}>
                        {reqItem.quote_ref || reqItem.id}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <strong style={{ display: 'block', color: '#FFF' }}>{reqItem.company_name}</strong>
                        {reqItem.tax_id && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>بطاقة ضريبية: {reqItem.tax_id}</span>}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: '#FFF' }}>{reqItem.contact_person}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right' }}>{reqItem.phone}</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#FFF' }}>
                        {reqItem.device_count || 1} جهاز
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--brand-orange)' }}>
                        {Number(reqItem.estimated_budget) > 0 ? formatEGP(Number(reqItem.estimated_budget)) : 'غير محدد'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: st.color,
                            background: st.bg,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {reqItem.created_at ? new Date(reqItem.created_at).toLocaleDateString('ar-EG') : 'حديثاً'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReq(reqItem);
                            setAdminNoteInput(reqItem.admin_notes || '');
                          }}
                          className="btn btn-sm btn-primary btn-apple-tactile"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          معاينة وتحديث
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

      {/* ── Detail Modal ─────────────────────────────────────── */}
      {selectedReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedReq(null)}
        >
          <div
            className="card"
            style={{
              background: '#14161F',
              border: '1px solid var(--border)',
              borderRadius: 16,
              maxWidth: 620,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#FFF', fontSize: '1.2rem', fontWeight: 800 }}>
                تفاصيل طلب عرض السعر: {selectedReq.quote_ref || selectedReq.id}
              </h3>
              <button type="button" onClick={() => setSelectedReq(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>اسم الشركة:</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.95rem' }}>{selectedReq.company_name}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>المسؤول:</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.95rem' }}>{selectedReq.contact_person}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>رقم التواصل:</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.95rem', direction: 'ltr', textAlign: 'right' }}>{selectedReq.phone}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>البريد الإلكتروني:</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.95rem' }}>{selectedReq.email || 'غير متوفر'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>الرقم الضريبي / السجل:</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.95rem' }}>{selectedReq.tax_id || 'غير محدد'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>المحافظة / المدينة:</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.95rem' }}>{selectedReq.city || 'القاهرة'}</strong>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10, marginBottom: 18, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: 6 }}>
                المواصفات والمتطلبات الفنية المطلوبة:
              </span>
              <p style={{ margin: 0, color: '#FFF', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedReq.spec_requirements || 'لم يتم إدخال ملاحظات فنية إضافية.'}
              </p>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                ملاحظات الإدارة الداخلية (Internal Notes):
              </label>
              <textarea
                rows={3}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="أضف ملاحظات متابعة عرض السعر، تفاصيل الخصم المتفق عليه..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: '#FFF',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>تحديث الحالة:</span>
                <select
                  value={selectedReq.status || 'new'}
                  onChange={(e) => handleStatusChange(selectedReq.id, e.target.value)}
                  disabled={updatingId === selectedReq.id}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: '#FFF',
                    fontWeight: 700,
                  }}
                >
                  <option value="new">طلب جديد</option>
                  <option value="pending">قيد الدراسة</option>
                  <option value="quoted">تم إرسال العرض</option>
                  <option value="contracted">تم التعاقد</option>
                  <option value="closed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>

              <a
                href={`https://wa.me/${selectedReq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً أستاذ ${selectedReq.contact_person}، بخصوص طلب عرض السعر لشركة ${selectedReq.company_name} برقم مرجعي: ${selectedReq.quote_ref}...`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-apple-tactile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: '#25D366',
                  color: '#FFF',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <MessageSquare size={16} />
                <span>مراسلة عبر WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
