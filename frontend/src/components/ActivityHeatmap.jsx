import React, { useMemo } from 'react';

function getColorClass(count) {
  if (!count)      return 'bg-theme-bg border-theme-border';
  if (count === 1) return 'bg-emerald-200 border-emerald-300';
  if (count <= 3)  return 'bg-emerald-400 border-emerald-500';
  if (count <= 5)  return 'bg-emerald-500 border-emerald-600';
  return 'bg-emerald-600 border-emerald-700';
}

const ActivityHeatmap = ({ activity = {} }) => {
  const cells = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: activity[key] || 0, d });
    }
    return result;
  }, [activity]);

  const weeks = useMemo(() => {
    const out = [];
    let week = [];
    cells.forEach((cell, i) => {
      week.push(cell);
      if (week.length === 7 || i === cells.length - 1) {
        out.push(week);
        week = [];
      }
    });
    return out;
  }, [cells]);

  return (
    <div className="space-y-3">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
                className={`w-[11px] h-[11px] rounded-[2px] border cursor-default shrink-0 ${getColorClass(cell.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-theme-text-muted">
        <span>Less</span>
        {['bg-theme-bg border-theme-border', 'bg-emerald-200 border-emerald-300', 'bg-emerald-400 border-emerald-500', 'bg-emerald-500 border-emerald-600', 'bg-emerald-600 border-emerald-700'].map((c, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-[2px] border ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
