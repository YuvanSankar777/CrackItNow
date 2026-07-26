import React, { useMemo } from 'react';

const LEVELS = ['#E4DBF8', '#CFC0F2', '#B49CEC', '#8E68E4', '#6A3DF5'];
function levelColor(count) {
  if (!count)      return LEVELS[0];
  if (count === 1) return LEVELS[1];
  if (count <= 3)  return LEVELS[2];
  if (count <= 5)  return LEVELS[3];
  return LEVELS[4];
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
                className="w-[11px] h-[11px] rounded-[3px] cursor-default shrink-0"
                style={{ background: levelColor(cell.count), boxShadow: 'inset 1px 1px 2px rgba(120,88,210,.15)' }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] clay-ink-faint">
        <span>Less</span>
        {LEVELS.map((c, i) => (
          <div key={i} className="w-[11px] h-[11px] rounded-[3px]" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
