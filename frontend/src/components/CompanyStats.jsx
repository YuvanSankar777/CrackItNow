import React from 'react';

const COMPANY_ICONS = {
  Google: '🔵', Amazon: '🟠', Microsoft: '🟩', Meta: '🔷', Apple: '🍎',
  Netflix: '🔴', Adobe: '🟥', IBM: '🔵', Oracle: '🟥', Salesforce: '☁️', General: '⭐',
};

const CompanyStats = ({ companyStats = {} }) => {
  const sorted = Object.entries(companyStats).sort((a, b) => b[1].attempts - a[1].attempts);
  if (!sorted.length) return <p className="text-sm text-gray-600 text-center py-4">No company data yet. Start an interview!</p>;

  return (
    <div className="space-y-3">
      {sorted.map(([company, data]) => (
        <div key={company} className="flex items-center gap-3 bg-[#161616] border border-[#222] rounded-xl p-3 hover:border-[#333] transition-colors">
          <span className="text-2xl w-8 text-center shrink-0">{COMPANY_ICONS[company] || '🏢'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-white truncate">{company}</span>
              <span className="text-xs text-gray-500 shrink-0 ml-2">
                {data.attempts} attempt{data.attempts !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#222] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                style={{ width: `${data.avg_score ? (data.avg_score / 10) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white">
              {data.avg_score !== null ? `${data.avg_score}/10` : '—'}
            </p>
            <p className="text-[10px] text-gray-600">avg score</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyStats;
