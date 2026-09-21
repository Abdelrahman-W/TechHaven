import React from 'react';

export default function Hero() {
  return (
    <section className="th-hero-section">
      <div className="th-hero-grid container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}>
        <div className="badge badge-hot">
          السوق المصري الأول للعتاد التقني — أسعار حقيقية، توصيل لجميع المحافظات
        </div>
        <h1 className="th-hero-headline" style={{ marginBottom: '0' }}>
          Egy<span style={{ color: 'var(--brand-orange)' }}>Hardware</span>
        </h1>
        <p className="th-hero-desc" style={{ margin: '0 auto' }}>
          من الكروت الرسومية للمعالجات، كل حاجة تلاقيها هنا بأفضل سعر وضمان.
          قارن، اشترِ، وابنِ جهازك في دقايق.
        </p>
        <div className="th-hero-cta-wrap">
          <a href="#products" className="btn btn-primary btn-lg">
            تصفح المنتجات
          </a>
          <a href="#builder" className="btn btn-ghost btn-lg">
            بناء جهازي
          </a>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', marginTop: '32px' }}>
          <div style={{ minWidth: '120px' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--primary)' }}>15K+</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>منتج متاح</div>
          </div>
          <div style={{ minWidth: '120px' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--primary)' }}>27</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>محافظة مغطاة</div>
          </div>
          <div style={{ minWidth: '120px' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--primary)' }}>4.9★</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>متوسط التقييم</div>
          </div>
          <div style={{ minWidth: '120px' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--primary)' }}>24h</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>شحن سريع</div>
          </div>
        </div>
      </div>
    </section>
  );
}