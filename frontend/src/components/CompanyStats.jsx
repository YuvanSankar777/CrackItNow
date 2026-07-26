import React from 'react';

const COMPANY_ICONS = {
  Google: '🔵', Amazon: '🟠', Microsoft: '🟩', Meta: '🔷', Apple: '🍎',
  Netflix: '🔴', Adobe: '🟥', IBM: '🔵', Oracle: '🟥', Salesforce: '☁️', General: '⭐',
};

const CompanyStats = ({ companyStats = {} }) => {
  const sorted = Object.entries(companyStats).sort((a, b) => b[1].attempts - a[1].attempts);
  if (!sorted.length) return <p className="text-sm clay-ink-faint text-center py-4">No company data yet. Start an interview!</p>;

  return (
    <div className="space-y-3">
      {sorted.map(([company, data]) => (
        <div key={company} className="flex items-center gap-3 clay-well p-3">
          <span className="text-2xl w-8 text-center shrink-0">{COMPANY_ICONS[company] || '🏢'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm clay-display clay-ink truncate">{company}</span>
              <span className="text-xs clay-ink-faint shrink-0 ml-2">
                {data.attempts} attempt{data.attempts !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: 'rgba(109,83,246,.14)' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${data.avg_score ? (data.avg_score / 10) * 100 : 0}%`, background: 'linear-gradient(90deg,var(--clay-violet),var(--clay-coral))' }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm clay-display clay-ink">
              {data.avg_score !== null ? `${data.avg_score}/10` : '—'}
            </p>
            <p className="text-[10px] clay-ink-faint">avg score</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyStats;
