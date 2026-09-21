import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  TrendingUp,
  ArrowLeft,
  Package,
  Clock,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { formatEGP } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const POPULAR_SEARCHES = [
  'RTX 4090',
  'Core i9 14900KS',
  'DDR5 32GB',
  'Samsung 990 PRO',
  'ASUS ROG OLED',
  'Ryzen 7 7800X3D'
];

export default function SearchModal({ isOpen, onClose }) {
  const { t, isRtl } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard listener for Escape and Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : document.querySelector('.search-trigger')?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll and autofocus input on open; restore on close/unmount
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Live search debounced
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api.getProducts({ search: query })
        .then((res) => {
          const list = res.data || res.products || [];
          setResults(list.slice(0, 6));
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (id) => {
    navigate(`/product/${id}`);
    onClose();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };

  const handlePopularClick = (term) => {
    setQuery(term);
    navigate(`/shop?q=${encodeURIComponent(term)}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="th-search-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav_search') || 'بحث عن منتج'}
    >
      <div
        className="th-search-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <form
          onSubmit={handleSearchSubmit}
          className="th-search-modal-form"
          role="search"
        >
          <Search size={20} style={{ color: 'var(--brand-orange, #FF6B35)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_input_placeholder') || 'ابحث في أكثر من 5,000 قطعة هاردوير...'}
            className="th-search-modal-input"
            aria-label={t('nav_search') || 'بحث عن منتج'}
          />
          {loading && (
            <Loader2 size={18} className="spin" style={{ color: 'var(--text-muted, #9CA3AF)', flexShrink: 0 }} />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="th-search-modal-clear-btn"
              aria-label="مسح نص البحث"
            >
              <X size={16} />
            </button>
          )}
          {/* Desktop visual ESC hint - hidden on mobile viewports via CSS */}
          <kbd className="th-search-modal-esc">
            ESC
          </kbd>
          {/* Touch-friendly close button for mobile & all viewports */}
          <button
            type="button"
            onClick={onClose}
            className="th-search-modal-close-btn"
            aria-label="إغلاق البحث"
          >
            <X size={19} />
          </button>
        </form>

        {/* Modal Body */}
        <div className="th-search-modal-body">
          {query ? (
            <div>
              {results.length > 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: 'var(--text-xs, 0.75rem)',
                      color: 'var(--text-muted, #9CA3AF)',
                      padding: '0 var(--space-2, 8px) var(--space-2, 8px)',
                      fontWeight: 600,
                    }}
                  >
                    {t('search_matching_count') || 'منتجات مطابقة'} ({results.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className="th-search-modal-result-item"
                      >
                        <img
                          src={item.thumbnail || item.images?.[0] || 'https://placehold.co/80x80/1a1a25/6c63ff?text=HW'}
                          alt={item.name}
                          style={{
                            width: '46px',
                            height: '46px',
                            objectFit: 'contain',
                            borderRadius: 'var(--radius-md, 8px)',
                            background: '#0B0D14',
                            padding: '4px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 'var(--text-sm, 0.875rem)',
                              fontWeight: 600,
                              color: 'var(--text-primary, #F0F0FF)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <span style={{ fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--text-secondary, #9090A8)' }}>
                              {item.category?.name || item.brand || (isRtl ? 'هاردوير' : 'Hardware')}
                            </span>
                            {item.in_stock && (
                              <span style={{ fontSize: '10px', color: 'var(--success, #2ED573)', background: 'rgba(46, 213, 115, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                {t('in_stock') || 'متوفر'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: isRtl ? 'left' : 'right', flexShrink: 0 }}>
                          <span style={{ color: 'var(--brand-orange, #FF6B35)', fontWeight: 700, fontSize: 'var(--text-sm, 0.875rem)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {formatEGP(item.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="btn btn-ghost"
                    style={{
                      width: '100%',
                      marginTop: 'var(--space-3, 12px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2, 8px)',
                      fontSize: 'var(--text-sm, 0.875rem)',
                      color: 'var(--brand-orange, #FF6B35)',
                      padding: '10px',
                    }}
                  >
                    <span>{isRtl ? `عرض كل نتائج البحث عن "${query}"` : `View all results for "${query}"`}</span>
                    <ArrowLeft size={16} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
                  </button>
                </div>
              ) : !loading ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary, #9090A8)' }}>
                  <Package size={36} style={{ color: 'var(--text-muted, #5A5A70)', margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('search_no_results') || 'لا توجد نتائج بحث عن:'} "{query}"</p>
                  <small style={{ color: 'var(--text-muted, #5A5A70)', marginTop: '4px', display: 'block' }}>{t('search_no_results_sub') || 'جرّب البحث بكلمات أخرى أو تحقق من الحروف.'}</small>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              {/* Popular Searches */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: 'var(--text-xs, 0.75rem)',
                    color: 'var(--text-muted, #9CA3AF)',
                    fontWeight: 600,
                    marginBottom: '10px',
                  }}
                >
                  <TrendingUp size={14} style={{ color: 'var(--brand-orange, #FF6B35)' }} />
                  <span>{t('search_popular_title') || 'الأكثر بحثاً الآن'}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handlePopularClick(term)}
                      className="th-search-modal-chip"
                    >
                      <TrendingUp size={12} style={{ color: 'var(--brand-orange, #FF6B35)' }} />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

