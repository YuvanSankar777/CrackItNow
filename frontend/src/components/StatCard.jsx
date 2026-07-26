import React from 'react';

const StatCard = ({ label, value, sub, icon, accent = 'blue', trend }) => {
  const accentColor = {
    blue:   'var(--clay-violet)',
    green:  'var(--clay-mint)',
    yellow: 'var(--clay-gold)',
    purple: 'var(--clay-peri)',
    red:    'var(--clay-coral)',
  }[accent] || 'var(--clay-violet)';

  return (
    <div className="clay-card-sm p-5 flex flex-col gap-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] clay-display uppercase tracking-widest clay-ink-faint mb-1">{label}</p>
          <p className="text-3xl clay-display tabular-nums" style={{ color: accentColor }}>{value ?? '—'}</p>
          {sub && <p className="text-xs clay-ink-faint mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-70">{icon}</span>}
      </div>
      {trend !== undefined && (
        <p className="text-[11px] font-medium mt-1" style={{ color: trend >= 0 ? 'var(--clay-mint)' : 'var(--clay-coral)' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </p>
      )}
    </div>
  );
};

export default StatCard;
