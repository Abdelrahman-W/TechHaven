import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cpu, Search, Home, ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function NotFound() {
  const { t, isRtl } = useLanguage();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '580px', width: '100%' }}>
        {/* Animated Badge & Icon */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(255, 94, 20, 0.12)',
            border: '1px solid rgba(255, 94, 20, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-5)',
            color: 'var(--brand-orange)',
            boxShadow: '0 0 35px rgba(255, 94, 20, 0.25)',
          }}
        >
          <Cpu size={48} />
        </div>

        {/* 404 Title */}
        <div
          style={{
            fontSize: 'var(--text-5xl)',
            fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            background: 'linear-gradient(135deg, #FF5E14, #FFA502)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            marginBottom: 'var(--space-3)',
          }}
        >
          404 ERROR
        </div>

        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2)' }}>
          {t('notfound_title')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: '0 0 var(--space-6)' }}>
          {t('notfound_sub')}
        </p>

        {/* Instant Search Form */}
        <form
          onSubmit={handleSearch}
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            background: 'var(--bg-card)',
            padding: '6px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <input
            type="text"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRtl ? 'ابحث عن كارت شاشة، شاشة ألعاب، لابتوب...' : 'Search for GPU, gaming monitor, laptop...'}
            style={{ flex: 1, border: 'none', background: 'transparent' }}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Search size={15} />
            <span>{isRtl ? 'بحث' : 'Search'}</span>
          </button>
        </form>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Home size={16} />
            <span>{t('notfound_btn_home')}</span>
          </Link>
          <Link to="/shop" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={16} />
            <span>{t('notfound_btn_shop')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

