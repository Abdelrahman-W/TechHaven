import React, { useEffect, useState } from 'react';
import { AlertTriangle, PackageOpen } from 'lucide-react';
import { api } from '../lib/api';
import ProductCard from './ProductCard';

export default function ProductGrid({ products: initialProducts, category, search, limit }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    api.getProducts({ category, search, limit })
      .then((res) => {
        if (!cancelled) setProducts(res.data || res.products || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialProducts, category, search, limit]);

  if (loading) {
    return (
      <div className="product-grid">
        {[...Array(limit || 8)].map((_, i) => (
          <div
            key={i}
            className="tech-product-card"
            style={{ minHeight: '380px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div className="skeleton" style={{ height: '180px', width: '100%', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '18px', width: '40%' }} />
            <div className="skeleton" style={{ height: '24px', width: '90%' }} />
            <div className="skeleton" style={{ height: '18px', width: '60%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%', marginTop: 'auto', borderRadius: 'var(--radius-md)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: 'var(--danger)', borderColor: 'rgba(255, 107, 107, 0.3)' }}>
        <AlertTriangle size={36} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
        <h3>حدث خطأ أثناء تحميل المنتجات</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <PackageOpen size={44} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h3>لا توجد منتجات متوفرة حالياً</h3>
        <p style={{ color: 'var(--text-muted)' }}>جرب البحث بكلمات أخرى أو اختر فئة مختلفة من القائمة.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
