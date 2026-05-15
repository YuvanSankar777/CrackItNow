import React from 'react';

const StatCard = ({ label, value, sub, icon, accent = 'blue', trend }) => {
  const accentMap = {
    blue:   { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700'  },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    yellow: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
    purple: { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700'  },
    red:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700'    },
  };
  const c = accentMap[accent] || accentMap.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-5 flex flex-col gap-1`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-theme-text-muted mb-1">{label}</p>
          <p className={`text-3xl font-bold tabular-nums ${c.text}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-theme-text-muted mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-70">{icon}</span>}
      </div>
      {trend !== undefined && (
        <p className={`text-[11px] font-medium mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </p>
      )}
    </div>
  );
};

export default StatCard;
