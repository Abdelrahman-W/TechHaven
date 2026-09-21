import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, ExternalLink, Bell, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminHeader({ toggleSidebar, notificationCount = 0 }) {
  let user = { name: 'المسؤول الرئيسي' };
  try {
    const auth = useAuth();
    if (auth && auth.user) user = auth.user;
  } catch {
    // Fallback to default user
  }

  return (
    <header
      className="admin-header"
      style={{
        height: '64px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-dropdown)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={toggleSidebar}
          className="btn btn-ghost"
          style={{ padding: '6px', color: 'var(--text-primary)' }}
          aria-label="القائمة الجانبية"
        >
          <Menu size={20} />
        </button>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
          مركز العمليات والإدارة
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Link
          to="/"
          target="_blank"
          className="btn btn-ghost btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <span>زيارة المتجر</span>
          <ExternalLink size={14} />
        </Link>

        <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <Bell size={18} />
          {notificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--danger)',
                color: 'white',
                borderRadius: 'var(--radius-full)',
                fontSize: '10px',
                width: '15px',
                height: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              {notificationCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 'var(--text-xs)',
            }}
          >
            {user?.name?.charAt(0) || 'A'}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{user?.name || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}