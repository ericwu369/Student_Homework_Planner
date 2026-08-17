import { useState } from 'react'
import { api } from '../../api'
import { useSyncData, todayStr } from '../../hooks'
import { ProgressRing } from '../../components/ProgressRing'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { FlameBadge } from '../../components/StreakCalendar'
import { SUBJECT_EMOJI, subjectColor, fmtTime } from '../../components/meta'

export default function BoardPage() {
  const [date, setDate] = useState(todayStr())

  const tasksRes = useSyncData(() => api.tasks(date), ['tasks-changed'], date)
  const pointsRes = useSyncData(() => api.points(), ['points-changed'])
  const streakRes = useSyncData(() => api.streak(), ['tasks-changed'])

  const tasks = tasksRes.data ?? []
  const points = pointsRes.data
  const streak = streakRes.data

  const done = tasks.filter((t) => t.completed_at).length
  const percent = tasks.length > 0 ? done / tasks.length : 0

  const uncomplete = async (id: number) => {
    if (!confirm('撤销这次打卡？')) return
    await api.uncompleteTask(id)
  }

  if (tasksRes.error) return <div className="error-box">{tasksRes.error}</div>

  return (
    <div className="pad-page">
      <div className="page-head">
        <div>
          <h2>实时看板</h2>
          <p className="hint">孩子在哪打勾，这里立刻更新</p>
        </div>
        <div className="page-head-right">
          <ConnectionBadge status={tasksRes.status} />
          <input className="input date-input" type="date" value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
        </div>
      </div>

      <div className="board-top">
        <div className="card board-ring-card">
          <ProgressRing percent={percent} />
          <div className="ring-caption">
            已完成 <b>{done}</b> / {tasks.length} 项
            {tasks.length > 0 && percent === 1 && <span className="all-done-badge">🎉 全部完成</span>}
          </div>
        </div>
        <div className="board-stats">
          <div className="card stat-card">
            <span className="stat-label">⭐ 总积分</span>
            <b className="stat-value">{points ? points.balance : '…'}</b>
          </div>
          <div className="card stat-card">
            <span className="stat-label">⚡ 今日获得</span>
            <b className="stat-value">{points ? points.todayEarned : '…'}</b>
          </div>
          <div className="card stat-card flame-card">
            <span className="stat-label">连续完成</span>
            {streak ? <FlameBadge count={streak.current} /> : <b className="stat-value">…</b>}
          </div>
        </div>
      </div>

      <div className="card board-list">
        <h3 className="card-title">任务状态</h3>
        {tasks.length === 0 && <div className="empty">这一天还没有布置任务</div>}
        {tasks.map((t) => {
          const color = subjectColor(t.subject)
          return (
            <div className={`list-row${t.completed_at ? ' is-done' : ''}`} key={t.id}>
              <span className="list-emoji" style={{ color }}>
                {t.kind === 'extracurricular' ? SUBJECT_EMOJI.课外 : SUBJECT_EMOJI[t.subject ?? '']}
              </span>
              <div className="list-main">
                <div className="list-title">{t.content}</div>
                <div className="list-sub">
                  {t.subject ?? '课外'} · {t.minutes > 0 ? `${t.minutes}分钟` : '不限时'}
                  {t.points > 0 ? ` · +${t.points}分` : ''}
                </div>
              </div>
              {t.completed_at ? (
                <div className="list-right">
                  <span className="chip done">✓ {fmtTime(t.completed_at)}</span>
                  <button className="btn btn-sm" onClick={() => uncomplete(t.id)}>
                    撤销
                  </button>
                </div>
              ) : (
                <span className="chip pending">未打卡</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}