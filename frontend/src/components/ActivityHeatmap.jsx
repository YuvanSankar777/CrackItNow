import React, { useMemo } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getColorClass(count) {
  if (!count) return 'bg-[#161616] border-[#222]';
  if (count === 1) return 'bg-green-900/60 border-green-800/40';
  if (count <= 3)  return 'bg-green-700/70 border-green-600/50';
  if (count <= 5)  return 'bg-green-500/80 border-green-400/60';
  return 'bg-green-400 border-green-300/70';
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

  // Group into weeks (columns)
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
                className={`w-[11px] h-[11px] rounded-[2px] border cursor-default shrink-0 ${getColorClass(cell.count)} hover:ring-1 hover:ring-green-400/50 transition-all`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-gray-600">
        <span>Less</span>
        {['bg-[#161616] border-[#222]', 'bg-green-900/60 border-green-800/40', 'bg-green-700/70 border-green-600/50', 'bg-green-500/80 border-green-400/60', 'bg-green-400 border-green-300/70'].map((c, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-[2px] border ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
