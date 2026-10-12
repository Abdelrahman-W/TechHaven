import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Wrench, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Hero() {
  const { isRtl } = useLanguage();

  return (
    <section className="th-hero-section" style={{ padding: '48px 0 36px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container" style={{ maxWidth: 1100 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(255, 94, 20, 0.12)',
              border: '1px solid rgba(255, 94, 20, 0.3)',
              color: 'var(--brand-orange)',
              fontSize: 'var(--text-xs)',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <ShieldCheck size={14} />
            <span>{isRtl ? 'العتاد التقني المعتمد في مصر • ضمان رسمي' : 'Official Hardware Retailer • Certified Local Warranty'}</span>
          </div>

          <h1 className="th-hero-headline" style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, lineHeight: 1.15 }}>
            Tech<span style={{ color: 'var(--brand-orange)' }}>Haven</span>
          </h1>

          <p className="th-hero-desc" style={{ margin: '0 auto', maxWidth: 680, fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {isRtl
              ? 'منصتك المتخصصة في عتاد الحواسيب، محطات العمل، وقطع التجميع الأصلية. فحص فوري للتوافق، أسعار معلنة بشفافية، وتسليم سريع لجميع المحافظات.'
              : 'Dedicated platform for PC components, engineering workstations, and custom builds. Real-time compatibility checks, transparent pricing, and nationwide delivery.'}
          </p>

          <div className="th-hero-cta-wrap" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
            <Link
              to="/shop"
              className="btn btn-primary"
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: 'var(--text-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
              }}
            >
              <Cpu size={16} />
              <span>{isRtl ? 'استعراض قطع العتاد' : 'Browse Components'}</span>
            </Link>
            <Link
              to="/pc-builder"
              className="btn btn-secondary"
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: 'var(--text-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-secondary)',
              }}
            >
              <Wrench size={16} />
              <span>{isRtl ? 'مُجمّع الحواسيب الذكي' : 'PC Builder Studio'}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}