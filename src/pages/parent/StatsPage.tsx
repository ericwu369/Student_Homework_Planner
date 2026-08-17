import { useMemo, useState } from 'react'
import { api } from '../../api'
import { useSyncData, todayStr } from '../../hooks'
import { dateStrFromOffset as offset } from '../../lib/dates'
import { StreakCalendar } from '../../components/StreakCalendar'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { subjectColor } from '../../components/meta'

const RANGES = [7, 30, 90]

function Bar({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(Math.max(value, 0), 100) * 100}%`, background: color }} />
      </div>
      <span className="bar-value">{hint}</span>
    </div>
  )
}

export default function StatsPage() {
  const [days, setDays] = useState(30)

  const from = offset(-(days - 1))
  const to = todayStr()

  const overviewRes = useSyncData(() => api.overview(days), ['tasks-changed', 'points-changed'])
  const subjectsRes = useSyncData(() => api.subjectsStats(from, to), ['tasks-changed'], days + from + to)
  const streakRes = useSyncData(() => api.streak(), ['tasks-changed'])
  const pointsStatsRes = useSyncData(() => api.pointsStats(from, to), ['points-changed'], from + to)

  const overview = overviewRes.data ?? []
  const subjects = subjectsRes.data ?? []
  const streak = streakRes.data
  const pointsStats = pointsStatsRes.data

  const avg = useMemo(() => {
    const withTasks = overview.filter((d) => d.hasTasks)
    if (withTasks.length === 0) return 0
    const doneDays = withTasks.filter((d) => d.doneAll).length
    return doneDays / withTasks.length
  }, [overview])

  const completedInRange = overview.filter((d) => d.doneAll).length
  const taskCount = overview.reduce((s, d) => s + d.total, 0)

  const err = overviewRes.error || subjectsRes.error || streakRes.error || pointsStatsRes.error

  return (
    <div className="pad-page">
      <div className="page-head">
        <div>
          <h2>统计报表</h2>
          <p className="hint">完成度优先，积分作为参考</p>
        </div>
        <div className="seg">
          {RANGES.map((d) => (
            <button key={d} className={`seg-btn${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>
              近{d}天
            </button>
          ))}
        </div>
      </div>

      {err && <div className="error-box">{err}</div>}

      <div className="mini-stats">
        <div className="card stat-card"><span className="stat-label">全勤天数</span><b className="stat-value">{completedInRange}</b><span className="stat-sub">/ {overview.filter((d) => d.hasTasks).length} 天有任务</span></div>
        <div className="card stat-card"><span className="stat-label">平均完成率</span><b className="stat-value">{Math.round(avg * 100)}%</b></div>
        <div className="card stat-card"><span className="stat-label">累计任务</span><b className="stat-value">{taskCount}</b></div>
        {pointsStats && (
          <div className="card stat-card"><span className="stat-label">积分收支</span><b className="stat-value" style={{ color: 'var(--success)' }}>+{pointsStats.earned}</b><b className="stat-value" style={{ color: 'var(--danger)' }}> -{pointsStats.spent}</b></div>
        )}
      </div>

      <div className="stats-cols">
        <div className="card panel">
          <h3 className="card-title">各科完成度（{from} ~ {to}）</h3>
          {subjects.length === 0 && <div className="empty">该时段内没有作业记录</div>}
          {subjects.map((s) => (
            <Bar
              key={s.subject}
              label={s.subject}
              value={s.total ? s.done / s.total : 0}
              color={subjectColor(s.subject as never)}
              hint={`${s.done}/${s.total}`}
            />
          ))}
        </div>

        <div className="card panel">
          <h3 className="card-title">连续完成</h3>
          {streak && (
            <div className="streak-nums">
              <div className="streak-big">
                <span className="flame-emoji">🔥</span>
                <b>{streak.current}</b> 天
                <span className="streak-sub">当前连续</span>
              </div>
              <div className="streak-big best">
                <b>{streak.best}</b> 天
                <span className="streak-sub">最佳纪录</span>
              </div>
            </div>
          )}
          {streak && <StreakCalendar calendar={streak.calendar} />}
        </div>
      </div>

      <div className="card panel">
        <h3 className="card-title">每日完成度</h3>
        <div className="daily-bars">
          {overview.filter((d) => d.hasTasks).slice(-Math.min(days, 30)).map((d) => {
            const pct = d.total ? d.done / d.total : 0
            return (
              <div className="daily" key={d.date} title={`${d.date} ${d.done}/${d.total}`}>
                <div className="daily-track">
                  <div className="daily-fill" style={{ height: `${Math.round(pct * 100)}%` }} />
                </div>
                <span className="daily-date">{d.date.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}