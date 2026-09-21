import React from 'react';
import { Link } from 'react-router-dom';

const Breadcrumbs = ({ items }) => {
  return (
    <nav className="breadcrumbs" aria-label="breadcrumb" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', margin: 'var(--space-4) 0', color: 'var(--text-secondary)' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {isLast ? (
              <span aria-current="page" style={{ color: 'var(--primary)', fontWeight: '600' }}>{item.label}</span>
            ) : (
              <Link to={item.href} style={{ textDecoration: 'none' }} className="hover-glow">{item.label}</Link>
            )}
            {!isLast && <span>/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
