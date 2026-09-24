import React, { useState, useEffect } from 'react';
import {
  Building,
  Truck,
  CreditCard,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  Share2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Database,
  Send,
  BarChart3,
  ExternalLink,
  Lock,
  Key,
  Globe,
  Radio,
  Terminal,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';

export default function Settings() {
  const { settings: globalSettings, updateSettings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'shipping' | 'payments' | 'integrations' | 'security'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Security visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showHmac, setShowHmac] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showFacebookSecret, setShowFacebookSecret] = useState(false);

  // Paymob connection test state
  const [testingPaymob, setTestingPaymob] = useState(false);
  const [paymobTestResult, setPaymobTestResult] = useState(null);

  // Settings state initialized from global settings context
  const [settings, setSettings] = useState(() => ({
    store_name: 'TechHaven Egypt',
    store_name_en: 'TechHaven',
    slogan: 'SMARTER TECH. BETTER LIFE.',
    hotline: '19888',
    email: 'support@techhaven.com.eg',
    whatsapp_phone: '01274757241',
    address: 'السويس',
    commercial_reg: '409214',
    tax_card: '712-441-903',
    shipping_cairo: 55,
    shipping_governorates: 80,
    shipping_express: 120,
    free_shipping_threshold: 2500,
    estimated_days: '24-48 ساعة',
    estimated_days_gov: '2-4 أيام عمل',
    return_policy_days: 14,
    cod_extra_fee: 15,
    enable_visa: true,
    enable_meeza: true,
    enable_vodafone_cash: true,
    enable_instapay: true,
    enable_cod: true,
    vodafone_cash_phone: '01012345678',
    instapay_address: 'techhaven@instapay',
    maintenance_mode: false,
    announcement_active: true,
    announcement_text: '🔥 تخفيضات كبرى على كروت الشاشة وشاشات 240Hz لفترة محدودة | شحن مجاني للطلبات فوق 2500 ج.م',
    announcement_link: '/shop',
    // Paymob Credentials
    paymob_mode: 'sandbox',
    paymob_api_key: '',
    paymob_public_key: '',
    paymob_secret_key: '',
    paymob_card_integration_id: '',
    paymob_wallet_integration_id: '',
    paymob_hmac_secret: '',
    // Supabase Cloud
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
    supabase_bucket_name: 'products',
    // Courier & Shipping API
    courier_provider: 'bosta',
    bosta_api_key: '',
    bosta_business_id: '',
    auto_create_waybill: false,
    // Comms & Notifications
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    whatsapp_notify_orders: true,
    email_provider: 'smtp',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    resend_api_key: '',
    email_notify_orders: true,
    // Pixels & Tracking
    ga4_measurement_id: '',
    meta_pixel_id: '',
    gtm_id: '',
    tiktok_pixel_id: '',
    // Social Login OAuth Configuration (Future Ready - Inactive)
    google_oauth_enabled: false,
    google_client_id: '',
    google_client_secret: '',
    facebook_oauth_enabled: false,
    facebook_app_id: '',
    facebook_app_secret: '',
    ...(globalSettings || {}),
  }));

  useEffect(() => {
    if (globalSettings) {
      setSettings((prev) => ({ ...prev, ...globalSettings }));
    }
  }, [globalSettings]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleCopy = (text, key) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItem(key);
      setTimeout(() => setCopiedItem(null), 2500);
      showToast('تم نسخ الرابط بنجاح إلى الحافظة!');
    }
  };

  const handleTestPaymob = async () => {
    const keyToTest = settings.paymob_api_key;
    if (!keyToTest || !keyToTest.trim()) {
      setPaymobTestResult({
        success: false,
        message: 'يرجى إدخال مفتاح الـ API (Paymob API Key) أولاً قبل اختبار الاتصال.'
      });
      return;
    }

    setTestingPaymob(true);
    setPaymobTestResult(null);
    try {
      const res = await api.testPaymobConnection(keyToTest);
      if (res?.success) {
        setPaymobTestResult({
          success: true,
          message: res.message || 'تم التحقق من حساب Paymob بنجاح وهو متصل وجاهز للعمل!',
        });
        showToast('تم التحقق بنجاح! حساب Paymob نشط ومتصل.');
      } else {
        setPaymobTestResult({
          success: false,
          message: res?.error || 'فشل الاتصال بـ Paymob. تأكد من صحة المفتاح.',
        });
      }
    } catch (err) {
      setPaymobTestResult({
        success: false,
        message: err.message || 'حدث خطأ أثناء فحص اتصال خوادم Paymob.',
      });
    } finally {
      setTestingPaymob(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      await refreshSettings();
      showToast('تمت استعادة أحدث إعدادات من الخادم بنجاح');
    } catch {
      // Keep local
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      await updateSettings(settings);
      showToast('تم حفظ وتحديث إعدادات النظام والمتجر بنجاح!');
    } catch (err) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setCacheClearing(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      showToast('تم تفريغ الذاكرة المؤقتة (Cache) وتسريع استجابة الخادم بنجاح');
    } catch {
      setErrorMessage('تعذر تفريغ الكاش');
    } finally {
      setCacheClearing(false);
    }
  };

  const tabs = [
    { id: 'identity', label: 'هوية المتجر والبيانات', icon: Building },
    { id: 'shipping', label: 'الشحن والتوصيل', icon: Truck },
    { id: 'payments', label: 'بوابات وطرق الدفع', icon: CreditCard },
    { id: 'social', label: 'تسجيل الدخول الاجتماعي (OAuth)', icon: Globe },
    { id: 'integrations', label: 'الربط الخارجي والسحابة', icon: Share2 },
    { id: 'security', label: 'الأمان والتحكم بالنظام', icon: ShieldCheck },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* ── Top Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={28} color="var(--primary)" />
            مركز إعدادات النظام والمتجر
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            تخصيص الهوية التجارية، تكاليف الشحن بالمحافظات، حسابات المحافظ الذكية، وإشعارات النظام الحية
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading || saving}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '10px 18px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RotateCcw size={16} />
            استرجاع الإعدادات
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, var(--primary) 0%, #FF5E14 100%)',
              border: 'none',
              color: '#FFFFFF',
              padding: '10px 24px',
              borderRadius: 10,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(108, 99, 255, 0.35)',
            }}
          >
            {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ كل التغييرات'}
          </button>
        </div>
      </div>

      {/* ── Toast & Error Alerts ─────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#10B981',
            fontWeight: 700,
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#EF4444',
            fontWeight: 700,
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {settings.maintenance_mode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#F59E0B',
            fontWeight: 700,
          }}
        >
          <AlertCircle size={20} />
          <span>⚠️ تحذير: وضع الصيانة مفعل حالياً! الزوار العاديين سيشاهدون صفحة الصيانة فقط.</span>
        </div>
      )}

      {/* ── Tabs Navigation ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 4,
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 20px',
                background: isActive ? 'rgba(108, 99, 255, 0.12)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content Card ─────────────────────────────────────── */}
      <div
        className="card"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '28px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <RefreshCw size={36} className="spin" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--primary)' }} />
            <p>جارٍ تحميل إعدادات النظام...</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* ══════════════════════════════════════════════════
                TAB 1: STORE IDENTITY & BUSINESS
               ══════════════════════════════════════════════════ */}
            {activeTab === 'identity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>
                    بيانات المتجر الرسمية والترخيص
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    هذه البيانات تظهر في الفواتير الضريبية، تذييل الصفحات، ورسائل البريد التلقائية للعملاء
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      اسم المتجر (بالعربية)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.store_name || ''}
                      onChange={(e) => handleChange('store_name', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      اسم المتجر (English)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.store_name_en || ''}
                      onChange={(e) => handleChange('store_name_en', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      الشعار اللفظي (Slogan)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.slogan || ''}
                      onChange={(e) => handleChange('slogan', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <Phone size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: 'var(--primary)' }} />
                      الخط الساخن الموحد
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.hotline || ''}
                      onChange={(e) => handleChange('hotline', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <Phone size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#10B981' }} />
                      رقم الواتساب لخدمة العملاء
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.whatsapp_phone || ''}
                      onChange={(e) => handleChange('whatsapp_phone', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <Mail size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#38BDF8' }} />
                      البريد الإلكتروني الرسمي
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={settings.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <FileText size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#F59E0B' }} />
                      رقم السجل التجاري
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.commercial_reg || ''}
                      onChange={(e) => handleChange('commercial_reg', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <FileText size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#F59E0B' }} />
                      رقم البطاقة الضريبية
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.tax_card || ''}
                      onChange={(e) => handleChange('tax_card', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <MapPin size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#EF4444' }} />
                      العنوان الفعلي للمقر الرئيسي / المعرض
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 2: SHIPPING & LOGISTICS
               ══════════════════════════════════════════════════ */}
            {activeTab === 'shipping' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>
                    تعريفات الشحن ومواعيد التوصيل
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    تحديد تسعير شركات الشحن التلقائي للعميل عند الدفع وتعيين حد الشحن المجاني
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Truck size={18} color="var(--primary)" />
                      <span style={{ fontWeight: 700, color: '#FFF' }}>شحن القاهرة الكبرى والجيزة</span>
                    </div>
                    <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      التكلفة بالجنيه (EGP)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={settings.shipping_cairo || 0}
                      onChange={(e) => handleChange('shipping_cairo', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Truck size={18} color="#38BDF8" />
                      <span style={{ fontWeight: 700, color: '#FFF' }}>شحن باقي المحافظات والأقاليم</span>
                    </div>
                    <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      التكلفة بالجنيه (EGP)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={settings.shipping_governorates || 0}
                      onChange={(e) => handleChange('shipping_governorates', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Zap size={18} color="#FF5E14" />
                      <span style={{ fontWeight: 700, color: '#FFF' }}>الشحن السريع VIP (نفس اليوم)</span>
                    </div>
                    <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      التكلفة بالجنيه (EGP)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={settings.shipping_express || 0}
                      onChange={(e) => handleChange('shipping_express', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Sparkles size={18} color="#10B981" />
                      <span style={{ fontWeight: 700, color: '#FFF' }}>الحد الأدنى للشحن المجاني</span>
                    </div>
                    <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      قيمة الطلب المؤهلة (EGP)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={settings.free_shipping_threshold || 0}
                      onChange={(e) => handleChange('free_shipping_threshold', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <Clock size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                      مدة التوصيل داخل القاهرة
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.estimated_days || ''}
                      onChange={(e) => handleChange('estimated_days', e.target.value)}
                      placeholder="مثال: 24-48 ساعة"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <Clock size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                      مدة التوصيل للمحافظات
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={settings.estimated_days_gov || ''}
                      onChange={(e) => handleChange('estimated_days_gov', e.target.value)}
                      placeholder="مثال: 2-4 أيام عمل"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <ShieldCheck size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#10B981' }} />
                      فترة الاسترجاع والضمان (أيام)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={settings.return_policy_days || 14}
                      onChange={(e) => handleChange('return_policy_days', Number(e.target.value))}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 3: PAYMENT GATEWAYS & WALLETS
               ══════════════════════════════════════════════════ */}
            {activeTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>
                    بوابات الدفع الإلكتروني والمحافظ الذكية
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    تفعيل أو إيقاف قنوات الدفع التي يراها العميل بصفحة إتمام الطلب (Checkout)
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Cards & Meeza (Paymob Integration) */}
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 22px',
                        background: settings.enable_visa ? 'rgba(108, 99, 255, 0.05)' : 'transparent',
                        borderBottom: settings.enable_visa ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.2) 0%, rgba(255, 94, 20, 0.2) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            border: '1px solid rgba(108, 99, 255, 0.3)',
                          }}
                        >
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            بوابة الدفع الإلكتروني المباشر — Paymob Gateway
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 700,
                                background: settings.paymob_mode === 'live' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 165, 2, 0.15)',
                                color: settings.paymob_mode === 'live' ? 'var(--success)' : 'var(--warning)',
                                border: settings.paymob_mode === 'live' ? '1px solid rgba(46, 213, 115, 0.3)' : '1px solid rgba(255, 165, 2, 0.3)',
                              }}
                            >
                              {settings.paymob_mode === 'live' ? '● وضع الإنتاج الفعلي (Live)' : '● الوضع التجريبي (Sandbox)'}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: 2 }}>
                            قبول بطاقات Visa و MasterCard وبطاقات ميزة الوطنية وتقسيط البنوك المصرية بنظام 3D Secure
                          </div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.85rem', color: settings.enable_visa ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {settings.enable_visa ? 'مفعلة بالمتجر' : 'معطلة'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(settings.enable_visa)}
                          onChange={(e) => handleChange('enable_visa', e.target.checked)}
                          style={{ width: 22, height: 22, accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {/* Paymob Credentials & Configuration Form */}
                    {settings.enable_visa && (
                      <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Mode Switcher */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 12,
                            background: 'var(--bg-card)',
                            padding: '14px 18px',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.95rem' }}>
                              بيئة التشغيل (Environment Mode)
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                              اختر الوضع التجريبي لتجربة واختبار الدفع بأمان أو الوضع الفعلي لقبول الأموال الحقيقية
                            </div>
                          </div>
                          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                            <button
                              type="button"
                              onClick={() => handleChange('paymob_mode', 'sandbox')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                border: 'none',
                                background: settings.paymob_mode !== 'live' ? 'var(--primary)' : 'transparent',
                                color: settings.paymob_mode !== 'live' ? '#FFF' : 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              Sandbox (تجريبي)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChange('paymob_mode', 'live')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                border: 'none',
                                background: settings.paymob_mode === 'live' ? 'var(--success)' : 'transparent',
                                color: settings.paymob_mode === 'live' ? '#FFF' : 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              Live (فعلي)
                            </button>
                          </div>
                        </div>

                        {/* Credentials Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                          {/* API Key */}
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <label style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                                <Key size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: 'var(--primary)' }} />
                                مفتاح الواجهة البرمجية (Paymob API Key) *
                              </label>
                              <a
                                href="https://accept.paymob.com/portal2/en/settings"
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                              >
                                جلب المفتاح من لوحة Paymob <ExternalLink size={12} />
                              </a>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showApiKey ? 'text' : 'password'}
                                className="input"
                                value={settings.paymob_api_key || ''}
                                onChange={(e) => handleChange('paymob_api_key', e.target.value)}
                                placeholder="e.g. ZXlKaGJHY2lPaUpJVXpVeE1pd2..."
                                style={{
                                  width: '100%',
                                  padding: '12px 42px 12px 14px',
                                  borderRadius: 8,
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-card)',
                                  color: '#FFF',
                                  fontFamily: 'monospace',
                                  fontSize: '0.9rem',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                style={{
                                  position: 'absolute',
                                  left: 10,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: 4,
                                }}
                              >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Public Key */}
                          <div>
                            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                              المفتاح العام (Paymob Public Key)
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={settings.paymob_public_key || ''}
                              onChange={(e) => handleChange('paymob_public_key', e.target.value)}
                              placeholder="PKG_..."
                              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                            />
                          </div>

                          {/* Secret Key */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <label style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                                المفتاح السري (Paymob Secret Key)
                              </label>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showSecretKey ? 'text' : 'password'}
                                className="input"
                                value={settings.paymob_secret_key || ''}
                                onChange={(e) => handleChange('paymob_secret_key', e.target.value)}
                                placeholder="SK_..."
                                style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecretKey(!showSecretKey)}
                                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                              >
                                {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Card Integration ID */}
                          <div>
                            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                              معرف ربط بطاقات فيزا وميزة (Card Integration ID) *
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={settings.paymob_card_integration_id || ''}
                              onChange={(e) => handleChange('paymob_card_integration_id', e.target.value)}
                              placeholder="مثال: 458921"
                              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                            />
                          </div>

                          {/* Wallet Integration ID */}
                          <div>
                            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                              معرف ربط المحافظ الإلكترونية (Wallet Integration ID)
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={settings.paymob_wallet_integration_id || ''}
                              onChange={(e) => handleChange('paymob_wallet_integration_id', e.target.value)}
                              placeholder="مثال: 458922"
                              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                            />
                          </div>

                          {/* HMAC Secret */}
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                              <Lock size={14} style={{ marginLeft: 6, verticalAlign: 'middle', color: '#10B981' }} />
                              رمز التحقق الأمني الرقمي (HMAC Secret)
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showHmac ? 'text' : 'password'}
                                className="input"
                                value={settings.paymob_hmac_secret || ''}
                                onChange={(e) => handleChange('paymob_hmac_secret', e.target.value)}
                                placeholder="e.g. 5D8A39F7C2B14..."
                                style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowHmac(!showHmac)}
                                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                              >
                                {showHmac ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              يستخدم لتشفير ومطابقة صحة الـ Webhook الوارد لمنع أي تلاعب بحالة الفواتير.
                            </div>
                          </div>
                        </div>

                        {/* Webhook URL Box */}
                        <div
                          style={{
                            background: 'rgba(0, 212, 170, 0.05)',
                            border: '1px solid rgba(0, 212, 170, 0.25)',
                            borderRadius: 10,
                            padding: '14px 18px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Radio size={16} />
                              رابط إشعار المعاملات اللحظي (Paymob Webhook / Callback URL):
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'}/api/payments/paymob/webhook`, 'webhook')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'var(--secondary)',
                                color: '#0A0A0F',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedItem === 'webhook' ? <Check size={14} /> : <Copy size={14} />}
                              {copiedItem === 'webhook' ? 'تم النسخ!' : 'نسخ الرابط'}
                            </button>
                          </div>
                          <div
                            style={{
                              background: 'var(--bg-primary)',
                              padding: '10px 14px',
                              borderRadius: 6,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              color: '#A0AEC0',
                              border: '1px solid var(--border)',
                              wordBreak: 'break-all',
                            }}
                          >
                            {typeof window !== 'undefined' ? `${window.location.origin}/api/payments/paymob/webhook` : 'http://localhost:4000/api/payments/paymob/webhook'}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 6 }}>
                            💡 الصق هذا الرابط داخل حسابك في Paymob ➔ Dashboard ➔ Settings ➔ Callback URLs ➔ Transaction Processed Callback لتحديث الأوردرات تلقائياً عند نجاح الدفع.
                          </div>
                        </div>

                        {/* Test Connection Button & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 6 }}>
                          <button
                            type="button"
                            onClick={handleTestPaymob}
                            disabled={testingPaymob}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              background: 'rgba(108, 99, 255, 0.15)',
                              color: 'var(--primary)',
                              border: '1px solid rgba(108, 99, 255, 0.3)',
                              padding: '10px 20px',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Zap size={16} className={testingPaymob ? 'spin' : ''} />
                            {testingPaymob ? 'جارٍ فحص الاتصال...' : 'اختبار اتصال Paymob الآن'}
                          </button>

                          {paymobTestResult && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 14px',
                                borderRadius: 8,
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                background: paymobTestResult.success ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                                color: paymobTestResult.success ? 'var(--success)' : 'var(--danger)',
                                border: `1px solid ${paymobTestResult.success ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                              }}
                            >
                              {paymobTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                              <span>{paymobTestResult.message}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vodafone Cash & Wallets */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: '16px 20px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem', marginBottom: 4 }}>
                          📱 المحافظ الإلكترونية (فودافون كاش / اتصالات / أورنج / وي كاش)
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          الدفع عبر التحويل للمحفظة ورفع إشعار المعاملة للتحقق
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.enable_vodafone_cash)}
                        onChange={(e) => handleChange('enable_vodafone_cash', e.target.checked)}
                        style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                      />
                    </div>

                    {settings.enable_vodafone_cash && (
                      <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          رقم المحفظة لاستقبال التحويلات:
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.vodafone_cash_phone || ''}
                          onChange={(e) => handleChange('vodafone_cash_phone', e.target.value)}
                          placeholder="مثال: 01012345678"
                          style={{ maxWidth: 320, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* InstaPay */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: '16px 20px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem', marginBottom: 4 }}>
                          ⚡ شبكة المدفوعات اللحظية انستاباي (InstaPay)
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          دفع فوري عبر حساب البنك المركزي المصري بدون رسوم إضافية
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.enable_instapay)}
                        onChange={(e) => handleChange('enable_instapay', e.target.checked)}
                        style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                      />
                    </div>

                    {settings.enable_instapay && (
                      <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          عنوان الدفع اللحظي (IPA) أو رقم الحساب:
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.instapay_address || ''}
                          onChange={(e) => handleChange('instapay_address', e.target.value)}
                          placeholder="مثال: username@instapay"
                          style={{ maxWidth: 320, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Cash on Delivery */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: '16px 20px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem', marginBottom: 4 }}>
                          💵 الدفع عند الاستلام (Cash On Delivery)
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          سداد قيمة الأوردر نقداً لمندوب الشحن عند استلام وفحص الطرد
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.enable_cod)}
                        onChange={(e) => handleChange('enable_cod', e.target.checked)}
                        style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                      />
                    </div>

                    {settings.enable_cod && (
                      <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          رسوم خدمة تحصيل عند الاستلام إضافية (ج.م):
                        </label>
                        <input
                          type="number"
                          className="input"
                          value={settings.cod_extra_fee || 0}
                          onChange={(e) => handleChange('cod_extra_fee', Number(e.target.value))}
                          style={{ maxWidth: 160, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB: SOCIAL LOGIN OAUTH CONFIGURATION (Future Ready - Auth Inactive)
               ══════════════════════════════════════════════════ */}
            {activeTab === 'social' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Globe size={22} color="var(--primary)" />
                    إعداد وتجهيز موفري تسجيل الدخول الاجتماعي (Social Login / OAuth)
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    تجهيز وتخزين بيانات الاعتماد الرسمية لـ Google و Facebook لاستخدامها مستقبلاً.
                  </p>
                </div>

                {/* Status Notice Banner */}
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <AlertCircle size={22} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#F59E0B', fontSize: '0.95rem', marginBottom: 4 }}>
                      وضع الإعداد والتجهيز فقط (Configuration Only — Social Login is not active yet)
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                      تسجيل الدخول الاجتماعي عبر Google و Facebook غير مفعّل للمتسوقين في الواجهة الأمامية حالياً لضمان أعلى معايير الخصوصية وعزل الحسابات. يمكنك إدخال وتخزين بيانات الـ OAuth Client ID و Secret بشكل آمن لتكون المنصة جاهزة عند تفعيلها مستقبلاً.
                    </div>
                  </div>
                </div>

                {/* 1. Google OAuth Provider Card */}
                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                        🌐
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: '#FFF', fontSize: '1.05rem', fontWeight: 800 }}>Google OAuth 2.0</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>تسجيل الدخول باستخدام حساب Google (Gmail / Google Workspace)</span>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: settings.google_oauth_enabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {settings.google_oauth_enabled ? 'مُفعّل في الإعدادات' : 'معطّل'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.google_oauth_enabled)}
                        onChange={(e) => handleChange('google_oauth_enabled', e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Google Client ID:
                      </label>
                      <input
                        type="text"
                        value={settings.google_client_id || ''}
                        onChange={(e) => handleChange('google_client_id', e.target.value)}
                        placeholder="مثال: 1234567890-abc123xyz.apps.googleusercontent.com"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontSize: '0.88rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Google Client Secret:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showGoogleSecret ? 'text' : 'password'}
                          value={settings.google_client_secret || ''}
                          onChange={(e) => handleChange('google_client_secret', e.target.value)}
                          placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                          style={{ width: '100%', padding: '10px 14px', paddingInlineEnd: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontSize: '0.88rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [typeof document !== 'undefined' && document.dir === 'ltr' ? 'right' : 'left']: 10, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {showGoogleSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>رابط إعادة التوجيه المعتمد (Authorized Redirect URI): <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : 'https://techhaven.eg/api/auth/google/callback'}</code></span>
                    <button type="button" onClick={() => handleCopy(`${typeof window !== 'undefined' ? window.location.origin : 'https://techhaven.eg'}/api/auth/google/callback`, 'googleRedirect')} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.08)' }}>
                      {copiedItem === 'googleRedirect' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      <span>نسخ الرابط</span>
                    </button>
                  </div>
                </div>

                {/* 2. Facebook / Meta OAuth Provider Card */}
                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(24, 119, 242, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                        📘
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: '#FFF', fontSize: '1.05rem', fontWeight: 800 }}>Facebook / Meta Login</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>تسجيل الدخول باستخدام حساب Facebook / Meta Graph API</span>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: settings.facebook_oauth_enabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {settings.facebook_oauth_enabled ? 'مُفعّل في الإعدادات' : 'معطّل'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.facebook_oauth_enabled)}
                        onChange={(e) => handleChange('facebook_oauth_enabled', e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Meta App ID:
                      </label>
                      <input
                        type="text"
                        value={settings.facebook_app_id || ''}
                        onChange={(e) => handleChange('facebook_app_id', e.target.value)}
                        placeholder="مثال: 987654321012345"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontSize: '0.88rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Meta App Secret:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showFacebookSecret ? 'text' : 'password'}
                          value={settings.facebook_app_secret || ''}
                          onChange={(e) => handleChange('facebook_app_secret', e.target.value)}
                          placeholder="••••••••••••••••••••••••"
                          style={{ width: '100%', padding: '10px 14px', paddingInlineEnd: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontSize: '0.88rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowFacebookSecret(!showFacebookSecret)}
                          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [typeof document !== 'undefined' && document.dir === 'ltr' ? 'right' : 'left']: 10, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {showFacebookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>رابط إعادة التوجيه المعتمد (Authorized Redirect URI): <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/auth/facebook/callback` : 'https://techhaven.eg/api/auth/facebook/callback'}</code></span>
                    <button type="button" onClick={() => handleCopy(`${typeof window !== 'undefined' ? window.location.origin : 'https://techhaven.eg'}/api/auth/facebook/callback`, 'fbRedirect')} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.08)' }}>
                      {copiedItem === 'fbRedirect' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      <span>نسخ الرابط</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 4: INTEGRATIONS & EXTERNAL APIS (مركز الربط والتكاملات)
               ══════════════════════════════════════════════════ */}
            {activeTab === 'integrations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Share2 size={22} color="var(--primary)" />
                        مركز الربط والتكاملات الخارجية (APIs & Cloud Integrations)
                      </h3>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        إدارة الاتصال بالسحابة وقواعد البيانات، شركات الشحن اللوجستي، خدمات الإشعارات، وبكسلات التتبع الإعلاني
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('payments')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255, 94, 20, 0.1)',
                        color: '#FF5E14',
                        border: '1px solid rgba(255, 94, 20, 0.25)',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      <CreditCard size={16} />
                      إعدادات بوابة Paymob للدفع ➔
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* ── Section 1: Supabase & Database Cloud ── */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border)', padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(46, 213, 115, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                          <Database size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem' }}>
                            قاعدة البيانات والتخزين السحابي — Supabase Cloud
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            تخزين وحفظ بيانات المنتجات، الطلبات، وصور المعرض سحابياً
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontWeight: 700,
                          background: settings.supabase_url ? 'rgba(46, 213, 115, 0.15)' : 'rgba(108, 99, 255, 0.15)',
                          color: settings.supabase_url ? 'var(--success)' : 'var(--primary)',
                          border: settings.supabase_url ? '1px solid rgba(46, 213, 115, 0.3)' : '1px solid rgba(108, 99, 255, 0.3)',
                        }}
                      >
                        {settings.supabase_url ? '● متصل بسحابة Supabase' : '● متصل بالتخزين المحلي الآمن (In-Memory + Disk Persisted)'}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          رابط المشروع السحابي (Supabase Project URL)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.supabase_url || ''}
                          onChange={(e) => handleChange('supabase_url', e.target.value)}
                          placeholder="https://xyzproject.supabase.co"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          المفتاح العام المجهول (Anon Public Key)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.supabase_anon_key || ''}
                          onChange={(e) => handleChange('supabase_anon_key', e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                            مفتاح خدمة النظام السري (Service Role Secret)
                          </label>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showSupabaseKey ? 'text' : 'password'}
                            className="input"
                            value={settings.supabase_service_role_key || ''}
                            onChange={(e) => handleChange('supabase_service_role_key', e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIs..."
                            style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                          >
                            {showSupabaseKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          اسم مجلد التخزين (Storage Bucket)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.supabase_bucket_name || 'products'}
                          onChange={(e) => handleChange('supabase_bucket_name', e.target.value)}
                          placeholder="products"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Section 2: Shipping & Couriers API ── */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border)', padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                        <Truck size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem' }}>
                          شركات الشحن والربط اللوجستي الآلي (Bosta / Couriers API)
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          الربط مع شركات الشحن لتوليد بوالص الشحن وتتبع الطرود تلقائياً
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          مزود الشحن الرئيسي
                        </label>
                        <select
                          className="select"
                          value={settings.courier_provider || 'bosta'}
                          onChange={(e) => handleChange('courier_provider', e.target.value)}
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                        >
                          <option value="bosta">بوسطة مصر (Bosta Express)</option>
                          <option value="aramex">أرامكس مصر (Aramex)</option>
                          <option value="mylerz">مايلرز للشحن السريع (Mylerz)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          مفتاح الواجهة البرمجية لشركة الشحن (API Key)
                        </label>
                        <input
                          type="password"
                          className="input"
                          value={settings.bosta_api_key || ''}
                          onChange={(e) => handleChange('bosta_api_key', e.target.value)}
                          placeholder="e.g. bosta_live_api_key..."
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          معرّف حساب الأعمال (Business ID)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.bosta_business_id || ''}
                          onChange={(e) => handleChange('bosta_business_id', e.target.value)}
                          placeholder="مثال: biz_884210"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.92rem' }}>
                              إنشاء بوليصة الشحن تلقائياً (Auto Waybill Generation)
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>
                              توليد رقم تتبع وطباعة بوليصة الشحن فور تغيير حالة الطلب إلى "مؤكد" أو "جاري التجهيز"
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.auto_create_waybill)}
                            onChange={(e) => handleChange('auto_create_waybill', e.target.checked)}
                            style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </label>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            رابط Webhook استقبال تحديثات الشحن من المناديب:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'}/api/shipping/webhook`, 'shippingWebhook')}
                            style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                          >
                            {copiedItem === 'shippingWebhook' ? <Check size={14} /> : <Copy size={14} />}
                            {copiedItem === 'shippingWebhook' ? 'تم النسخ!' : 'نسخ الرابط'}
                          </button>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.85rem', color: '#94A3B8', border: '1px solid var(--border)' }}>
                          {typeof window !== 'undefined' ? `${window.location.origin}/api/shipping/webhook` : 'http://localhost:4000/api/shipping/webhook'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: WhatsApp & Automated Invoices ── */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border)', padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(37, 211, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366' }}>
                        <Send size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem' }}>
                          إشعارات WhatsApp وفواتير البريد الإلكتروني الآلية
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          إرسال رسائل الترحيب وتأكيد الأوردرات والفواتير الضريبية للعميل تلقائياً
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                      {/* WhatsApp Phone Number ID */}
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          معرّف هاتف واتساب للأعمال (Phone Number ID)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.whatsapp_phone_number_id || ''}
                          onChange={(e) => handleChange('whatsapp_phone_number_id', e.target.value)}
                          placeholder="مثال: 104829104829104"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                        />
                      </div>

                      {/* WhatsApp Cloud API Token */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                            مفتاح الوصول لواتساب كلاود (System Access Token)
                          </label>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showWhatsappToken ? 'text' : 'password'}
                            className="input"
                            value={settings.whatsapp_access_token || ''}
                            onChange={(e) => handleChange('whatsapp_access_token', e.target.value)}
                            placeholder="EAAG..."
                            style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                          >
                            {showWhatsappToken ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* WhatsApp Notify Toggle */}
                      <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.92rem' }}>
                              إرسال رسالة تأكيد عبر واتساب تلقائياً (WhatsApp Order Confirmation)
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>
                              إرسال رسالة شكر للعميل برقم الطلب وملخص الأصناف ورابط التتبع المباشر
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.whatsapp_notify_orders)}
                            onChange={(e) => handleChange('whatsapp_notify_orders', e.target.checked)}
                            style={{ width: 20, height: 20, accentColor: '#25D366', cursor: 'pointer' }}
                          />
                        </label>
                      </div>

                      {/* Email Server (SMTP / Resend) */}
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          مزود خدمة البريد الإلكتروني
                        </label>
                        <select
                          className="select"
                          value={settings.email_provider || 'smtp'}
                          onChange={(e) => handleChange('email_provider', e.target.value)}
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                        >
                          <option value="smtp">خادم SMTP مخصص (Gmail / Titan / Zoho)</option>
                          <option value="resend">خدمة Resend API (سحابية حديثة)</option>
                        </select>
                      </div>

                      {settings.email_provider === 'resend' ? (
                        <div>
                          <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                            مفتاح Resend API Key
                          </label>
                          <input
                            type="password"
                            className="input"
                            value={settings.resend_api_key || ''}
                            onChange={(e) => handleChange('resend_api_key', e.target.value)}
                            placeholder="re_..."
                            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                              خادم SMTP والميناء (Host & Port)
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                type="text"
                                className="input"
                                value={settings.smtp_host || 'smtp.gmail.com'}
                                onChange={(e) => handleChange('smtp_host', e.target.value)}
                                placeholder="smtp.gmail.com"
                                style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                              />
                              <input
                                type="number"
                                className="input"
                                value={settings.smtp_port || 587}
                                onChange={(e) => handleChange('smtp_port', Number(e.target.value))}
                                style={{ width: 80, padding: '12px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', textAlign: 'center' }}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                              اسم مستخدم SMTP / البريد المرسل
                            </label>
                            <input
                              type="email"
                              className="input"
                              value={settings.smtp_user || ''}
                              onChange={(e) => handleChange('smtp_user', e.target.value)}
                              placeholder="invoices@techhaven.com.eg"
                              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <label style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                                كلمة مرور SMTP أو App Password
                              </label>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showSmtpPass ? 'text' : 'password'}
                                className="input"
                                value={settings.smtp_pass || ''}
                                onChange={(e) => handleChange('smtp_pass', e.target.value)}
                                placeholder="••••••••••••"
                                style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSmtpPass(!showSmtpPass)}
                                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                              >
                                {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.92rem' }}>
                              إرسال الفواتير الضريبية PDF للبريد تلقائياً (Automated PDF Invoices)
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>
                              توليد فاتورة رسمية بصيغة PDF تتضمن السجل التجاري والبطاقة الضريبية وإرسالها لبريد العميل
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.email_notify_orders)}
                            onChange={(e) => handleChange('email_notify_orders', e.target.checked)}
                            style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 4: Tracking Pixels & Marketing Analytics ── */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border)', padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 107, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                        <BarChart3 size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem' }}>
                          التتبع والإعلانات وتحليلات الزوار (Analytics & Marketing Pixels)
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          ربط بيكسل فيسبوك، تحليلات جوجل، وتتبع الحملات الإعلانية ومعدل التحويل (ROAS)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          معرّف قياس تحليلات جوجل (Google Analytics 4 ID)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.ga4_measurement_id || ''}
                          onChange={(e) => handleChange('ga4_measurement_id', e.target.value)}
                          placeholder="مثال: G-XXXXXXXXXX"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          معرّف بيكسل فيسبوك / ميتا (Meta Pixel ID)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.meta_pixel_id || ''}
                          onChange={(e) => handleChange('meta_pixel_id', e.target.value)}
                          placeholder="مثال: 123456789012345"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          معرّف حاوية جوجل تاج مانجر (Google Tag Manager ID)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.gtm_id || ''}
                          onChange={(e) => handleChange('gtm_id', e.target.value)}
                          placeholder="مثال: GTM-XXXXXX"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                          معرّف بيكسل تيك توك للأعمال (TikTok Pixel ID)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={settings.tiktok_pixel_id || ''}
                          onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
                          placeholder="مثال: C6XXXXXXXXXXXXXXXX"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 5: SECURITY & SYSTEM CONTROLS
               ══════════════════════════════════════════════════ */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>
                    إعدادات الأمان وشريط الإعلانات الحي
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    إدارة شريط العروض العلوي بالموقع، وضع الصيانة، ومراقبة أداء الخادم
                  </p>
                </div>

                {/* Announcement Bar Settings */}
                <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={18} color="#FF5E14" />
                        شريط الإعلانات الترويجي أعلى الموقع (Announcement Bar)
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        يظهر في أعلى كل صفحات المتجر للفت انتباه الزوار لأقوى الصفقات
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.announcement_active)}
                      onChange={(e) => handleChange('announcement_active', e.target.checked)}
                      style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        نص الإعلان:
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={settings.announcement_text || ''}
                        onChange={(e) => handleChange('announcement_text', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        رابط التوجيه (URL):
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={settings.announcement_link || ''}
                        onChange={(e) => handleChange('announcement_link', e.target.value)}
                        placeholder="/shop"
                        style={{ maxWidth: 300, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#FFF' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#EF4444', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={18} />
                        تفعيل وضع الصيانة (Maintenance Mode)
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                        عند تفعيل هذا الخيار، سيتم منع العملاء من الشراء وتوجيههم لشاشة الصيانة مؤقتاً
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.maintenance_mode)}
                      onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
                      style={{ width: 22, height: 22, accentColor: '#EF4444' }}
                    />
                  </div>
                </div>

                {/* System Diagnostics & Cache Flushing */}
                <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.95rem', marginBottom: 4 }}>
                      تفريغ الذاكرة المؤقتة ومزامنة البيانات (Clear Cache)
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
                      يقوم بتحديث الـ In-Memory Cache للخادم وضمان ظهور أحدث المنتجات والأسعار فوراً
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={cacheClearing}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(255, 94, 20, 0.15)',
                      color: '#FF5E14',
                      border: '1px solid rgba(255, 94, 20, 0.3)',
                      padding: '10px 18px',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={16} className={cacheClearing ? 'spin' : ''} />
                    {cacheClearing ? 'جارٍ التفريغ...' : 'تفريغ الكاش الآن'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Submit Bar at bottom ─────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, var(--primary) 0%, #FF5E14 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '12px 32px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(108, 99, 255, 0.35)',
                }}
              >
                {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
