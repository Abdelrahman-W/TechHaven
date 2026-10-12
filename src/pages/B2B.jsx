import React, { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Calculator,
  Printer,
  Send,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  PhoneCall,
  MessageSquare,
  Award,
  RefreshCw,
  Sparkles,
  FileText,
  Check,
  Laptop,
  Video,
  Cpu,
  Gamepad2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

export default function B2B() {
  const { lang, isRtl, t } = useLanguage();
  const formRef = useRef(null);

  // Bundles for Calculator
  const BUNDLES = [
    {
      id: 'startup',
      Icon: Laptop,
      nameAr: 'أسطول المكاتب والشركات الناشئة',
      nameEn: 'Startup & Office Fleet',
      specsAr: 'معالجات Intel Core i5 / AMD Ryzen 5، رامات 16GB DDR5، قرص 1TB NVMe Gen4، شاشة 27" IPS مريحة للعين',
      specsEn: 'Intel Core i5 / Ryzen 5, 16GB DDR5, 1TB NVMe Gen4, 27" Eye-Care IPS Display',
      unitPrice: 38500,
      sector: 'office',
    },
    {
      id: 'creative',
      Icon: Video,
      nameAr: 'محطات المونتاج والتصميم 3D',
      nameEn: 'Creative Studio & 3D VFX',
      specsAr: 'معالجات Core i7-14700K / Ryzen 7، كارت RTX 4070 Super 12GB، رامات 32GB DDR5، تخزين 2TB Gen4، شاشة 27" 2K 100% sRGB',
      specsEn: 'Core i7-14700K / Ryzen 7, RTX 4070 Super 12GB, 32GB DDR5, 2TB Gen4, 27" 2K 100% sRGB Display',
      unitPrice: 68000,
      sector: 'creative',
    },
    {
      id: 'ai_compute',
      Icon: Cpu,
      nameAr: 'سيرفرات الذكاء الاصطناعي والبيانات',
      nameEn: 'AI Compute & Data Servers',
      specsAr: 'كروت Dual RTX 4090 / RTX Ada، معالجات Threadripper / Xeon، رامات 128GB ECC، مصفوفة 8TB NVMe RAID، بطاقة شبكة 10GbE',
      specsEn: 'Dual RTX 4090 / RTX Ada, Threadripper / Xeon, 128GB ECC RAM, 8TB NVMe RAID, 10GbE Network Fabric',
      unitPrice: 145000,
      sector: 'ai_data',
    },
    {
      id: 'esports',
      Icon: Gamepad2,
      nameAr: 'صالات وأكاديميات Esports',
      nameEn: 'Esports Arena Gaming Fleet',
      specsAr: 'معالجات AMD Ryzen 7 7800X3D، كارت RTX 4070، رامات 32GB 6000MHz، شاشات 240Hz Fast-IPS، ملحقات احترافية كاملة',
      specsEn: 'AMD Ryzen 7 7800X3D, RTX 4070 12GB, 32GB 6000MHz, 240Hz Fast-IPS Monitor, Competitive Peripherals',
      unitPrice: 48000,
      sector: 'esports',
    },
  ];

  const [selectedBundleId, setSelectedBundleId] = useState('startup');
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quoteRefCode, setQuoteRefCode] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    contactName: '',
    email: '',
    phone: '',
    sector: 'office',
    timeline: 'immediate',
    deviceCount: '10',
    budget: '',
    notes: '',
  });

  const selectedBundle = useMemo(() => {
    return BUNDLES.find((b) => b.id === selectedBundleId) || BUNDLES[0];
  }, [selectedBundleId]);

  // Tiered Volume Discount logic
  const { discountRate, discountTierLabel } = useMemo(() => {
    if (quantity >= 31) {
      return {
        discountRate: 0.25,
        discountTierLabel: lang === 'ar' ? 'خصم الكميات الكبرى الاستراتيجي (25%)' : 'Strategic Volume Tier (25%)',
      };
    }
    if (quantity >= 16) {
      return {
        discountRate: 0.18,
        discountTierLabel: lang === 'ar' ? 'خصم المؤسسات المتقدم (18%)' : 'Enterprise Tier (18%)',
      };
    }
    if (quantity >= 5) {
      return {
        discountRate: 0.12,
        discountTierLabel: lang === 'ar' ? 'خصم الشركات والكميات (12%)' : 'Corporate Tier (12%)',
      };
    }
    return {
      discountRate: 0.05,
      discountTierLabel: lang === 'ar' ? 'خصم تجاري أساسي (5%)' : 'Standard Commercial Tier (5%)',
    };
  }, [quantity, lang]);

  const unitPrice = selectedBundle.unitPrice;
  const subtotalBeforeDiscount = unitPrice * quantity;
  const savingsAmount = Math.round(subtotalBeforeDiscount * discountRate);
  const estimatedTotal = subtotalBeforeDiscount - savingsAmount;
  const effectiveUnitPrice = Math.round(estimatedTotal / quantity);
  const currency = t('currency');

  // Insert calculator values into RFP Form
  const handleInsertIntoForm = () => {
    const bundleName = lang === 'ar' ? selectedBundle.nameAr : selectedBundle.nameEn;
    const bundleSpecs = lang === 'ar' ? selectedBundle.specsAr : selectedBundle.specsEn;
    const autoNote = lang === 'ar'
      ? `[طلب تسعير من الحاسبة التفاعلية]
الحزمة المختارة: ${bundleName}
المواصفات: ${bundleSpecs}
الكمية: ${quantity} أجهزة
نسبة الخصم المحسوبة: ${Math.round(discountRate * 100)}%
التكلفة التقديرية بعد الخصم: ${estimatedTotal.toLocaleString()} ${currency} (سعر الجهاز الصافي: ${effectiveUnitPrice.toLocaleString()} ${currency})`
      : `[Quotation from Interactive Calculator]
Selected Bundle: ${bundleName}
Specifications: ${bundleSpecs}
Fleet Quantity: ${quantity} units
Calculated Discount: ${Math.round(discountRate * 100)}%
Estimated Net Total: ${estimatedTotal.toLocaleString()} ${currency} (Net Unit Price: ${effectiveUnitPrice.toLocaleString()} ${currency})`;

    setFormData((prev) => ({
      ...prev,
      sector: selectedBundle.sector,
      deviceCount: String(quantity),
      budget: String(estimatedTotal),
      notes: autoNote,
    }));

    toast.success(
      lang === 'ar'
        ? 'تم نقل تفاصيل التجهيز بنجاح إلى نموذج عرض السعر أدناه'
        : 'Configuration transferred successfully to the RFP form below'
    );

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrintQuote = () => {
    window.print();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const generatedCode = `TH-B2B-${Math.floor(100000 + Math.random() * 900000)}`;
      setQuoteRefCode(generatedCode);

      await api.submitB2BRequest({
        ...formData,
        quoteRefCode: generatedCode,
        selectedBundle: selectedBundle.id,
        unitPrice,
        estimatedTotal,
      });

      setSubmitted(true);
      toast.success(
        lang === 'ar'
          ? 'تم إرسال طلبكم بنجاح! سيتم التواصل معكم خلال ساعتي عمل بعرض السعر الرسمي.'
          : 'Request submitted successfully! A Key Account Manager will contact you within 2 hours.'
      );
    } catch (error) {
      toast.error(error.message || (lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Failed to submit request'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({
      companyName: '',
      taxId: '',
      contactName: '',
      email: '',
      phone: '',
      sector: 'office',
      timeline: 'immediate',
      deviceCount: '10',
      budget: '',
      notes: '',
    });
  };

  const whatsappMessage = encodeURIComponent(
    lang === 'ar'
      ? `مرحباً فريق مبيعات الشركات TechHaven! أرغب في الاستفسار عن توريد أجهزة لشركتنا (حزمة: ${selectedBundle.nameAr}، كمية: ${quantity} أجهزة).`
      : `Hello TechHaven B2B Team! I would like to inquire about corporate hardware procurement (${selectedBundle.nameEn}, quantity: ${quantity} units).`
  );

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh', padding: '24px 0 80px' }}>
      <div className="container">
        {/* 1. Hero Banner */}
        <div
          style={{
            background: 'radial-gradient(circle at 50% 0%, #1a1e36 0%, #0d101d 100%)',
            border: '1px solid rgba(255, 94, 20, 0.25)',
            borderRadius: 'var(--radius-2xl)',
            padding: '50px 24px',
            textAlign: 'center',
            marginBottom: '40px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 94, 20, 0.12)',
              border: '1px solid rgba(255, 94, 20, 0.3)',
              color: 'var(--brand-orange)',
              fontSize: '0.82rem',
              fontWeight: 800,
              padding: '6px 16px',
              borderRadius: '99px',
              marginBottom: '16px',
            }}
          >
            <Building2 size={16} />
            <span>{t('b2b_tag')}</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '14px', lineHeight: 1.25 }}>
            {t('b2b_hero_title')}
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.02rem',
              maxWidth: '750px',
              margin: '0 auto 28px',
              lineHeight: 1.7,
            }}
          >
            {t('b2b_hero_sub')}
          </p>

          {/* 4 Trust Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              maxWidth: '960px',
              margin: '0 auto',
            }}
          >
            {[
              { icon: <Award size={20} style={{ color: 'var(--brand-orange)' }} />, text: t('b2b_stat_clients'), value: '+450' },
              { icon: <ShieldCheck size={20} style={{ color: '#10B981' }} />, text: t('b2b_stat_invoice'), value: 'ETA' },
              { icon: <RefreshCw size={20} style={{ color: '#60A5FA' }} />, text: t('b2b_stat_sla'), value: '24h Hot-Swap' },
              { icon: <Sparkles size={20} style={{ color: '#F59E0B' }} />, text: t('b2b_stat_dispatch'), value: lang === 'ar' ? '27 المحافظات' : '27 Governorates' },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'start',
                }}
              >
                <div style={{ flexShrink: 0 }}>{stat.icon}</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>{stat.value}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.3 }}>{stat.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Interactive Quotation Calculator */}
        <div className="th-b2b-calc-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 94, 20, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-orange)',
              }}
            >
              <Calculator size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                {t('calc_title')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: 0, marginTop: '2px' }}>
                {t('calc_sub')}
              </p>
            </div>
          </div>

          <div className="th-b2b-calc-grid">
            {/* Left Column: Bundle Selection & Quantity Slider */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '10px' }}>
                {t('calc_select_bundle')}
              </label>

              <div className="th-b2b-bundles-grid">
                {BUNDLES.map((bundle) => {
                  const isActive = bundle.id === selectedBundleId;
                  return (
                    <button
                      key={bundle.id}
                      type="button"
                      className={`th-b2b-bundle-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedBundleId(bundle.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <bundle.Icon size={18} style={{ color: isActive ? 'var(--brand-orange)' : '#9CA3AF' }} />
                        <strong style={{ color: '#fff', fontSize: '0.92rem' }}>
                          {lang === 'ar' ? bundle.nameAr : bundle.nameEn}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '8px' }}>
                        {lang === 'ar' ? bundle.specsAr : bundle.specsEn}
                      </div>
                      <div style={{ color: 'var(--brand-orange)', fontWeight: 900, fontSize: '0.88rem' }}>
                        {bundle.unitPrice.toLocaleString()} {currency} <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{lang === 'ar' ? 'جهاز' : 'unit'}</small>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity Selector */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>
                    {t('calc_quantity')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '74px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '1rem',
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{t('calc_units')}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: 'var(--brand-orange)',
                    height: '6px',
                  }}
                />

                {/* Discount Tier Steps Pill */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ color: quantity < 5 ? 'var(--brand-orange)' : undefined, fontWeight: quantity < 5 ? 800 : 400 }}>
                    1-4 ({lang === 'ar' ? 'خصم 5%' : '5% Off'})
                  </span>
                  <span style={{ color: quantity >= 5 && quantity <= 15 ? 'var(--brand-orange)' : undefined, fontWeight: quantity >= 5 && quantity <= 15 ? 800 : 400 }}>
                    5-15 ({lang === 'ar' ? 'خصم 12%' : '12% Off'})
                  </span>
                  <span style={{ color: quantity >= 16 && quantity <= 30 ? 'var(--brand-orange)' : undefined, fontWeight: quantity >= 16 && quantity <= 30 ? 800 : 400 }}>
                    16-30 ({lang === 'ar' ? 'خصم 18%' : '18% Off'})
                  </span>
                  <span style={{ color: quantity >= 31 ? 'var(--brand-orange)' : undefined, fontWeight: quantity >= 31 ? 800 : 400 }}>
                    +31 ({lang === 'ar' ? 'خصم 25%' : '25% Off'})
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Instant Cost Breakdown Card */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(255, 94, 20, 0.08) 0%, rgba(17, 19, 28, 0.95) 100%)',
                border: '1px solid rgba(255, 94, 20, 0.35)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  {t('calc_discount_applied')}
                </span>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10B981',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}
                >
                  {discountTierLabel}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('calc_unit_price')}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{unitPrice.toLocaleString()} {currency}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('calc_total_before')}</span>
                  <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    {subtotalBeforeDiscount.toLocaleString()} {currency}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{t('calc_savings')}</span>
                  <span style={{ color: '#10B981', fontWeight: 900 }}>- {savingsAmount.toLocaleString()} {currency}</span>
                </div>

                <div
                  style={{
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    margin: '6px 0',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', display: 'block' }}>
                      {t('calc_estimated_total')}
                    </span>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      {lang === 'ar' ? `(صافي الوحدة: ${effectiveUnitPrice.toLocaleString()} ${currency})` : `(Net unit: ${effectiveUnitPrice.toLocaleString()} ${currency})`}
                    </small>
                  </div>
                  <div style={{ color: 'var(--brand-orange)', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1 }}>
                    {estimatedTotal.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>{currency}</span>
                  </div>
                </div>
              </div>

              {/* Calculator Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleInsertIntoForm}
                >
                  <Send size={16} />
                  <span>{t('calc_use_in_quote')}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handlePrintQuote}
                >
                  <Printer size={16} />
                  <span>{t('calc_print_quote')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Turnkey Industry Packages Cards */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
              {t('pkg_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              {lang === 'ar'
                ? 'تجهيزات متكاملة جاهزة للتشغيل الفوري معدة خصيصاً لتناسب احتياجات كل بيئة عمل تقنية.'
                : 'Turnkey ready-to-deploy hardware configurations optimized for specialized industry workflows.'}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              {
                Icon: Laptop,
                title: t('pkg_startup_title'),
                desc: t('pkg_startup_desc'),
                tag: lang === 'ar' ? 'الشركات الناشئة' : 'Startups',
                bundleKey: 'startup',
              },
              {
                Icon: Video,
                title: t('pkg_creative_title'),
                desc: t('pkg_creative_desc'),
                tag: lang === 'ar' ? 'استوديوهات 3D' : 'Creative & VFX',
                bundleKey: 'creative',
              },
              {
                Icon: Cpu,
                title: t('pkg_ai_title'),
                desc: t('pkg_ai_desc'),
                tag: lang === 'ar' ? 'سيرفرات الذكاء الاصطناعي' : 'AI Compute',
                bundleKey: 'ai_compute',
              },
              {
                Icon: Gamepad2,
                title: t('pkg_esports_title'),
                desc: t('pkg_esports_desc'),
                tag: lang === 'ar' ? 'صالات الألعاب' : 'Esports Arenas',
                bundleKey: 'esports',
              },
            ].map((pkg, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.25s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <pkg.Icon size={26} style={{ color: 'var(--brand-orange)' }} />
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--brand-orange)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '6px',
                      }}
                    >
                      {pkg.tag}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                    {pkg.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {pkg.desc}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '18px', width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setSelectedBundleId(pkg.bundleKey);
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                >
                  <span>{lang === 'ar' ? 'احتساب هذا التجهيز بالحاسبة ↑' : 'Calculate this bundle ↑'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Enterprise SLA & Maintenance Contracts Matrix */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
              {t('sla_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              {t('sla_sub')}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Silver Plan */}
            <div className="th-sla-card">
              <div style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                STANDARD
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px' }}>
                {t('sla_silver')}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '18px' }}>
                {t('sla_silver_desc')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#10B981' }} />
                  <span>{lang === 'ar' ? 'دعم فني عن بعد خلال ساعات العمل' : 'Remote tech support in working hours'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#10B981' }} />
                  <span>{lang === 'ar' ? 'فحص وقائي نصف سنوي للأجهزة' : 'Bi-annual preventive maintenance'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#10B981' }} />
                  <span>{lang === 'ar' ? 'ضمان قطع الغيار الأصلية لمدة سنتين' : '2-Year genuine parts replacement'}</span>
                </div>
              </div>
            </div>

            {/* Gold Plan (Highlighted) */}
            <div className="th-sla-card highlight">
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  insetInlineEnd: '16px',
                  background: 'var(--brand-orange)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: '99px',
                }}
              >
                {lang === 'ar' ? 'الأكثر طلباً' : 'MOST POPULAR'}
              </div>

              <div style={{ color: 'var(--brand-orange)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                ENTERPRISE
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px' }}>
                {t('sla_gold')}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '18px' }}>
                {t('sla_gold_desc')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: 'var(--brand-orange)' }} />
                  <span><strong>{lang === 'ar' ? 'استبدال فوري للجهاز المعطل خلال 24 ساعة' : '24-hour on-site hot-swap replacement'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: 'var(--brand-orange)' }} />
                  <span>{lang === 'ar' ? 'مدير حسابات ومهندس دعم مخصص لشركتك' : 'Dedicated Account Manager & IT Engineer'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: 'var(--brand-orange)' }} />
                  <span>{lang === 'ar' ? 'فحص دوري ربع سنوي شامل وتحديث BIOS' : 'Quarterly health audits & BIOS tuning'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: 'var(--brand-orange)' }} />
                  <span>{lang === 'ar' ? 'أولوية شحن وحجز العتاد التقني النادر' : 'Priority hardware allocation from reserve stock'}</span>
                </div>
              </div>
            </div>

            {/* Platinum Plan */}
            <div className="th-sla-card">
              <div style={{ color: '#60A5FA', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                CRITICAL
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px' }}>
                {t('sla_platinum')}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '18px' }}>
                {t('sla_platinum_desc')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#60A5FA' }} />
                  <span><strong>{lang === 'ar' ? 'تدخل ميداني بمقر الشركة خلال 4 ساعات' : '4-Hour on-site field intervention SLA'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#60A5FA' }} />
                  <span>{lang === 'ar' ? 'أجهزة احتياطية Standby مخزنة بمقر العميل' : 'On-premise standby backup loaner nodes'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#60A5FA' }} />
                  <span>{lang === 'ar' ? 'تسهيلات سداد بنكية وشيكات آجلة Net-60' : 'Net-60 institutional credit terms'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Check size={14} style={{ color: '#60A5FA' }} />
                  <span>{lang === 'ar' ? 'خط ساخن هندسي مباشر 24/7 طوال العام' : '24/7/365 direct engineering hotline'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Official ETA Quotation / RFP Form */}
        <div
          ref={formRef}
          className="th-b2b-rfp-layout"
        >
          {/* RFP Form */}
          <div className="th-b2b-card">
            {!submitted ? (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(255, 94, 20, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-orange)',
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                      {t('form_title')}
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '22px', lineHeight: 1.5 }}>
                  {t('form_sub')}
                </p>

                {/* Company Name & Tax ID */}
                <div className="th-b2b-form-row">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_company_name')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'ar' ? 'مثال: شركة النيل للبرمجيات' : 'e.g. Nile Software LLC'}
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_tax_number')}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'رقم التسجيل الضريبي أو السجل التجاري' : 'ETA Tax ID or CR Number'}
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Contact Person & Corporate Email */}
                <div className="th-b2b-form-row">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_contact_name')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'ar' ? 'الاسم والمسمى الوظيفي' : 'Full Name & Title'}
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_email')} *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="procurement@company.com"
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Phone & Sector */}
                <div className="th-b2b-form-row">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_phone')} *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="010XXXXXXXX"
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_sector')}
                    </label>
                    <select
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    >
                      <option value="office">{lang === 'ar' ? 'تكنولوجيا وشركات برمجيات' : 'Software & Tech Companies'}</option>
                      <option value="creative">{lang === 'ar' ? 'استوديوهات دعاية ومونتاج و 3D' : 'Media, VFX & Creative Studios'}</option>
                      <option value="ai_data">{lang === 'ar' ? 'مراكز بيانات وأبحاث ذكاء اصطناعي' : 'Data Centers & AI Research'}</option>
                      <option value="esports">{lang === 'ar' ? 'أكاديميات وصالات Esports' : 'Esports & Gaming Lounges'}</option>
                      <option value="education">{lang === 'ar' ? 'جامعات ومؤسسات تعليمية' : 'Education & Universities'}</option>
                      <option value="other">{lang === 'ar' ? 'قطاع آخر' : 'Other Sector'}</option>
                    </select>
                  </div>
                </div>

                {/* Timeline & Device Count */}
                <div className="th-b2b-form-row">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {t('form_timeline')}
                    </label>
                    <select
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    >
                      <option value="immediate">{lang === 'ar' ? 'توريد فوري (خلال 48 ساعة)' : 'Immediate (Within 48 Hours)'}</option>
                      <option value="1_2_weeks">{lang === 'ar' ? 'خلال أسبوع إلى أسبوعين' : 'Within 1-2 Weeks'}</option>
                      <option value="1_month">{lang === 'ar' ? 'خلال شهر' : 'Within 1 Month'}</option>
                      <option value="planning">{lang === 'ar' ? 'مرحلة التخطيط ودراسة التكاليف' : 'Planning & Budgeting Phase'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                      {lang === 'ar' ? 'عدد الأجهزة المطلوب تسعيرها:' : 'Number of devices:'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="10"
                      className="search-input-field"
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#fff',
                      }}
                      value={formData.deviceCount}
                      onChange={(e) => setFormData({ ...formData, deviceCount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Specs / Notes textarea */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                    {t('form_notes')}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={t('form_notes_placeholder')}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? (
                    <span>{lang === 'ar' ? 'جاري إرسال الطلب...' : 'Submitting Request...'}</span>
                  ) : (
                    <>
                      <span>{t('form_submit')}</span>
                      <ChevronRight size={18} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>

                <h3 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, marginBottom: '8px' }}>
                  {t('form_success_title')}
                </h3>

                <div
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255, 94, 20, 0.1)',
                    border: '1px solid rgba(255, 94, 20, 0.3)',
                    color: 'var(--brand-orange)',
                    fontWeight: 900,
                    padding: '4px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    marginBottom: '16px',
                  }}
                >
                  {lang === 'ar' ? `كود مرجع الطلب: ${quoteRefCode}` : `Reference Code: ${quoteRefCode}`}
                </div>

                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '460px', margin: '0 auto 24px', fontSize: '0.9rem' }}>
                  {t('form_success_desc')}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={resetForm}>
                    {t('form_another')}
                  </button>
                  <a
                    href={`https://wa.me/201008887766?text=${encodeURIComponent(`مرحباً TechHaven، أود متابعة طلبي برقم مرجعي: ${quoteRefCode}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MessageSquare size={16} />
                    <span>{lang === 'ar' ? 'متابعة عبر واتساب' : 'Track on WhatsApp'}</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Institutional Guarantees & Why TechHaven */}
          <div className="th-b2b-card">
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px' }}>
              {lang === 'ar' ? 'مزايا التعاقد المؤسسي مع TechHaven:' : 'Corporate Procurement Advantages:'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                {
                  title: lang === 'ar' ? 'فواتير ضريبية إلكترونية معتمدة' : 'Certified E-Invoicing (ETA)',
                  text: lang === 'ar'
                    ? 'متوافقة بنسبة 100% مع منظومة الفاتورة الإلكترونية المصرية لمصلحة الضرائب لخصم الضريبة بسهولة.'
                    : '100% fully compliant with the Egyptian Tax Authority e-invoicing portal for seamless VAT deduction.',
                },
                {
                  title: lang === 'ar' ? 'أسعار الجملة المباشرة وهوامش المؤسسات' : 'Direct Wholesale Commercial Pricing',
                  text: lang === 'ar'
                    ? 'تخفيضات تصاعدية تبدأ من 5% وتصل إلى 25% مع قوائم أسعار خاصة للشركات والمؤسسات الكبرى.'
                    : 'Tiered volume discounts starting from 5% up to 25% with specialized wholesale price sheets.',
                },
                {
                  title: lang === 'ar' ? 'مدير حسابات ومهندس أنظمة مخصص' : 'Dedicated Account & Systems Engineer',
                  text: lang === 'ar'
                    ? 'نقطة اتصال واحدة للإشراف الكامل على طلبات التوريد، التخصيص، ومتابعة عقود الضمان والصيانة.'
                    : 'Single point of contact overseeing procurement, customized builds, and ongoing SLA maintenance.',
                },
                {
                  title: lang === 'ar' ? 'استبدال فوري عند الأعطال (Hot-Swap)' : '24-Hour Hot-Swap Loaner Units',
                  text: lang === 'ar'
                    ? 'توفير أجهزة وسيرفرات بديلة في غضون 24 ساعة لضمان استمرارية أعمال فريقك دون أي توقف أو خسارة إنتاجية.'
                    : 'Temporary replacement units dispatched within 24 hours to prevent team downtime.',
                },
                {
                  title: lang === 'ar' ? 'تسهيلات بنكية وشيكات آجلة Net-60' : 'Flexible Banking Credit & Net-60 Terms',
                  text: lang === 'ar'
                    ? 'إمكانية السداد بتحويلات بنكية رسمية أو شيكات دفع آجلة للشركات والمؤسسات المستوفية للشروط.'
                    : 'Direct corporate wire transfers and flexible Net-60 institutional payment terms for verified accounts.',
                },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255, 94, 20, 0.15)',
                      color: 'var(--brand-orange)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Check size={14} />
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '3px' }}>
                      {b.title}
                    </strong>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5, display: 'block' }}>
                      {b.text}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Direct Instant Consultation Channels */}
        <div
          style={{
            background: 'radial-gradient(circle at 50% 0%, #171E36 0%, #10121A 100%)',
            border: '1px solid rgba(255, 94, 20, 0.3)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
              {t('direct_title')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: 0 }}>
              {t('direct_sub')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/201008887766?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <MessageSquare size={18} />
              <span>{t('direct_whatsapp')}</span>
            </a>

            <a
              href="tel:19888"
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <PhoneCall size={18} />
              <span>{t('direct_call')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* 7. Hidden Print RFQ Slip (Activated only during window.print()) */}
      <div className="th-printable-quote" style={{ display: 'none' }}>
        <div style={{ borderBottom: '2px solid #222', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#000' }}>TechHaven Egypt</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
              قسم مبيعات وحلول الشركات والمؤسسات (Enterprise B2B Division)
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#777' }}>
              سجل تجاري: 409214 | بطاقة ضريبية: 712-441-903 | منظومة الفاتورة الإلكترونية (ETA)
            </p>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: '16px', fontWeight: 900 }}>مسودة عرض سعر رسمي (RFQ Draft)</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
              التاريخ: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              صلاحية العرض: 15 يوماً من تاريخ الإصدار
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
            {lang === 'ar' ? 'بيانات التجهيز المحسوب:' : 'Quotation Specifications:'}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ccc', textAlign: 'start' }}>
                <th style={{ padding: '8px' }}>{lang === 'ar' ? 'بند التجهيز' : 'Equipment Description'}</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                <th style={{ padding: '8px', textAlign: 'end' }}>{lang === 'ar' ? 'سعر الوحدة قبل الخصم' : 'Unit Price'}</th>
                <th style={{ padding: '8px', textAlign: 'end' }}>{lang === 'ar' ? 'نسبة الخصم' : 'Discount Rate'}</th>
                <th style={{ padding: '8px', textAlign: 'end' }}>{lang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 8px' }}>
                  <strong>{lang === 'ar' ? selectedBundle.nameAr : selectedBundle.nameEn}</strong>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                    {lang === 'ar' ? selectedBundle.specsAr : selectedBundle.specsEn}
                  </div>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{quantity}</td>
                <td style={{ padding: '10px 8px', textAlign: 'end' }}>{unitPrice.toLocaleString()} {currency}</td>
                <td style={{ padding: '10px 8px', textAlign: 'end', color: '#16a34a' }}>{Math.round(discountRate * 100)}%</td>
                <td style={{ padding: '10px 8px', textAlign: 'end', fontWeight: 800 }}>{estimatedTotal.toLocaleString()} {currency}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: '10px 8px', textAlign: 'end', fontWeight: 700 }}>
                  {lang === 'ar' ? 'قيمة التوفير الإجمالية للشركة:' : 'Total Corporate Savings:'}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'end', color: '#16a34a', fontWeight: 800 }}>
                  - {savingsAmount.toLocaleString()} {currency}
                </td>
              </tr>
              <tr style={{ borderTop: '2px solid #222' }}>
                <td colSpan={4} style={{ padding: '10px 8px', textAlign: 'end', fontWeight: 900, fontSize: '15px' }}>
                  {lang === 'ar' ? 'إجمالي التكلفة التقديرية:' : 'Estimated Net Total:'}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'end', fontWeight: 900, fontSize: '16px', color: '#ea580c' }}>
                  {estimatedTotal.toLocaleString()} {currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#555', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 6px' }}>
            * ملاحظة: هذه المسودة تقديرية للكميات وتخضع للشروط والأحكام وعقود مستوى الخدمة (SLA).
          </p>
          <p style={{ margin: 0 }}>
            * جميع التوريدات مشمولة بفاتورة إلكترونية معتمدة، وضمان الوكيل الرسمي المعتمد، واستبدال فوري 24 ساعة للشركات.
          </p>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#777' }}>الخط الساخن: 19888 | info@techhaven.com.eg</div>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px dashed #777', width: '180px', paddingTop: '6px', fontSize: '12px' }}>
            ختم واعتماد قسم الشركات
          </div>
        </div>
      </div>
    </div>
  );
}
