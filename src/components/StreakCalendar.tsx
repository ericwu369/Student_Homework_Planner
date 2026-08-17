import type { DayStat } from '../types'

export function StreakCalendar({ calendar }: { calendar: DayStat[] }) {
  const cells = calendar.slice(-35)
  const weekDays = ['一', '二', '三', '四', '五', '六', '日']
  return (
    <div className="streak-block">
      <div className="streak-week">
        {weekDays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="streak-grid">
        {cells.map((d) => {
          const cls = d.doneAll ? 'done' : d.hasTasks ? 'partial' : 'none'
          return (
            <div key={d.date} className={`streak-cell ${cls}`} title={`${d.date}${d.hasTasks ? `（${d.done}/${d.total}）` : '（无任务）'}`}>
              {Number(d.date.slice(8))}
            </div>
          )
        })}
      </div>
      <div className="streak-legend">
        <span><i className="lg done" />完成</span>
        <span><i className="lg partial" />未完成</span>
        <span><i className="lg none" />无任务</span>
      </div>
    </div>
  )
}

export function FlameBadge({ count }: { count: number }) {
  return (
    <span className="flame-badge" title="连续完成天数">
      <span className="flame-emoji">🔥</span>
      <strong>{count}</strong>
      <span className="flame-unit">天</span>
    </span>
  )
}