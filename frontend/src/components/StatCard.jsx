import React from 'react';

const StatCard = ({ label, value, sub, icon, accent = 'blue', trend }) => {
  const accentMap = {
    blue:   'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    green:  'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
    red:    'from-red-500/10 to-red-600/5 border-red-500/20 text-red-400',
  };
  const style = accentMap[accent] || accentMap.blue;

  return (
    <div className={`relative bg-gradient-to-br ${style} border rounded-2xl p-5 flex flex-col gap-1 overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-50 group-hover:opacity-80 transition-opacity">{icon}</span>}
      </div>
      {trend !== undefined && (
        <p className={`text-[11px] font-medium mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </p>
      )}
    </div>
  );
};

export default StatCard;
