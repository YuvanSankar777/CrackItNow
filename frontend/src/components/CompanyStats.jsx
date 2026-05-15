import React from 'react';

const COMPANY_ICONS = {
  Google: '🔵', Amazon: '🟠', Microsoft: '🟩', Meta: '🔷', Apple: '🍎',
  Netflix: '🔴', Adobe: '🟥', IBM: '🔵', Oracle: '🟥', Salesforce: '☁️', General: '⭐',
};

const CompanyStats = ({ companyStats = {} }) => {
  const sorted = Object.entries(companyStats).sort((a, b) => b[1].attempts - a[1].attempts);
  if (!sorted.length) return <p className="text-sm text-theme-text-muted text-center py-4">No company data yet. Start an interview!</p>;

  return (
    <div className="space-y-3">
      {sorted.map(([company, data]) => (
        <div key={company} className="flex items-center gap-3 bg-theme-bg border border-theme-border rounded-xl p-3">
          <span className="text-2xl w-8 text-center shrink-0">{COMPANY_ICONS[company] || '🏢'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-theme-text truncate">{company}</span>
              <span className="text-xs text-theme-text-muted shrink-0 ml-2">
                {data.attempts} attempt{data.attempts !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-full bg-theme-border rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-theme-accent transition-all duration-500"
                style={{ width: `${data.avg_score ? (data.avg_score / 10) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-theme-text">
              {data.avg_score !== null ? `${data.avg_score}/10` : '—'}
            </p>
            <p className="text-[10px] text-theme-text-muted">avg score</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyStats;
