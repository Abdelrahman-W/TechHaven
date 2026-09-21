import React from 'react';

const StatsCard = ({ title, value, change, changeType, icon, color }) => {
  return (
    <div className="stats-card card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 10px 0', fontSize: '0.9rem' }}>{title}</h4>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem' }}>{value}</h2>
        <div style={{ fontSize: '0.8rem', color: changeType === 'up' ? 'var(--success)' : changeType === 'down' ? 'var(--danger)' : 'var(--warning)' }}>
          {changeType === 'up' ? '↑ ' : changeType === 'down' ? '↓ ' : ''}{change}
        </div>
      </div>
      <div style={{ width: '50px', height: '50px', borderRadius: '10px', backgroundColor: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
        {icon}
      </div>
    </div>
  );
};

export default StatsCard;
