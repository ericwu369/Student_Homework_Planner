import { useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { api } from '../../api'
import { useSyncData, todayStr } from '../../hooks'
import type { Task } from '../../types'
import { SUBJECTS } from '../../types'
import { ProgressRing } from '../../components/ProgressRing'
import { Confetti } from '../../components/Confetti'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { FlameBadge } from '../../components/StreakCalendar'
import { SUBJECT_EMOJI, subjectColor, fmtTime } from '../../components/meta'

const ORDER: Array<{ key: string; label: string }> = [
  { key: '语文', label: '语文' },
  { key: '数学', label: '数学' },
  { key: '英语', label: '英语' },
  { key: '课外', label: '课外' },
]

function taskEmoji(t: Task): string {
  return t.kind === 'extracurricular' ? '🎨' : SUBJECT_EMOJI[t.subject ?? ''] ?? '📚'
}

export default function ChildHome() {
  const [date] = useState(todayStr())
  const [justDone, setJustDone] = useState<Record<number, string>>({})
  const [celebrate, setCelebrate] = useState(false)
  const wasAllDone = useRef(false)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)

  const tasksRes = useSyncData(() => api.tasks(date), ['tasks-changed'])
  const pointsRes = useSyncData(() => api.points(), ['points-changed'])
  const streakRes = useSyncData(() => api.streak(), ['tasks-changed'])
  const infoRes = useSyncData(() => api.info(), ['settings-changed'])

  const nickname = infoRes.data?.nickname ?? '皮卡皮卡'

  const serverTasks = tasksRes.data ?? []
  const tasks: Task[] = serverTasks.map((t) =>
    justDone[t.id] ? { ...t, completed_at: justDone[t.id] } : t
  )
  const doneCount = tasks.filter((t) => t.completed_at).length
  const allDone = tasks.length > 0 && doneCount === tasks.length

  useEffect(() => {
    if (allDone && !wasAllDone.current) {
      wasAllDone.current = true
      setCelebrate(true)
      const timer = setTimeout(() => setCelebrate(false), 4200)
      return () => clearTimeout(timer)
    }
    if (!allDone) wasAllDone.current = false
  }, [allDone])

  const toggle = async (t: Task) => {
    if (t.completed_at) return
    const now = new Date()
    const p = (x: number) => String(x).padStart(2, '0')
    const time = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
    setJustDone((prev) => ({ ...prev, [t.id]: time }))
    if (t.points > 0) setToast({ id: t.id, text: `＋${t.points} 分` })
    try {
      await api.completeTask(t.id)
    } catch (e) {
      setJustDone((prev) => {
        const next = { ...prev }
        delete next[t.id]
        return next
      })
      alert((e as Error).message)
    }
    setTimeout(() => setToast(null), 1600)
  }

  const groups = ORDER.map((g) => ({
    ...g,
    color: subjectColor(g.key === '课外' ? null : (g.key as never)),
    tasks: tasks.filter((t) => (g.key === '课外' ? t.kind === 'extracurricular' : t.subject === g.key)),
  })).filter((g) => g.tasks.length > 0)

  const points = pointsRes.data
  const streak = streakRes.data

  return (
    <div className="child-page">
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} />

      <header className="child-header">
        <div className="child-brand">
          <span className="child-brand-ico">⚡</span>
          <div>
            <b>学习小管家</b>
            <small>{nickname}，一起加油！</small>
          </div>
        </div>
        <div className="child-header-right">
          <ConnectionBadge status={tasksRes.status} />
        </div>
      </header>

      <main className="child-main">
        <div className="child-hero">
          <div className="child-ring">
            <ProgressRing percent={allDone ? 1 : tasks.length ? doneCount / tasks.length : 0} size={190} />
          </div>
          <div className="child-hero-info">
            <div className="child-stats">
              <div className="child-stat">
                <span className="cs-label">⭐ 总积分</span>
                <b>{points ? points.balance : '…'}</b>
              </div>
              <div className="child-stat">
                <span className="cs-label">⚡ 今日获得</span>
                <b>{points ? points.todayEarned : '…'}</b>
              </div>
              {streak && (
                <FlameBadge count={streak.current} />
              )}
            </div>
            <p className="child-hero-tip">
              {tasks.length === 0
                ? `${nickname}，等爸爸妈妈布置任务吧！`
                : allDone
                  ? `全部完成，${nickname}！`
                  : `已完成 ${doneCount} / ${tasks.length}，继续加油！`}
            </p>
          </div>
        </div>

        {toast && <div className="toast-points">⚡ {toast.text}</div>}

        <div className="child-groups">
          {groups.length === 0 && (
            <div className="child-empty">
              <div className="child-empty-ico">🔍</div>
              <p>今天还没有任务哦</p>
              <small>等爸爸妈妈在家长端布置好，刷新一下就能看到啦</small>
              <button className="btn btn-primary" onClick={tasksRes.refresh}>
                刷新看看
              </button>
            </div>
          )}
          {groups.map((g) => (
            <section className="child-group" key={g.key} style={{ ['--tc' as never]: g.color }}>
              <div className="child-group-head">
                <span className="child-group-emoji">{g.key === '课外' ? '🎨' : SUBJECT_EMOJI[g.key]}</span>
                <h3>{g.label}</h3>
                <span className="child-group-count">
                  {g.tasks.filter((t) => t.completed_at).length}/{g.tasks.length}
                </span>
              </div>
              <div className="child-task-list">
                {g.tasks.map((t) => {
                  const done = !!t.completed_at
                  return (
                    <button
                      key={t.id}
                      className={`child-task${done ? ' done' : ''}`}
                      onClick={() => toggle(t)}
                      disabled={done}
                    >
                      <span className="ct-emoji">{taskEmoji(t)}</span>
                      <span className="ct-body">
                        <span className="ct-title">{t.content}</span>
                        <span className="ct-meta">
                          {t.minutes > 0 ? `${t.minutes}分钟` : ''}
                          {t.points > 0 ? ` · +${t.points}分` : ''}
                        </span>
                      </span>
                      {done ? (
                        <span className="ct-check" title={t.completed_at ?? undefined}>
                          ✓
                        </span>
                      ) : (
                        <span className="ct-check empty" />
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <nav className="child-nav">
        <NavLink to="/child" end className={({ isActive }) => 'child-nav-item' + (isActive ? ' active' : '')}>
          <span className="cn-ico">🎯</span>
          今日任务
        </NavLink>
        <NavLink to="/child/redeem" className={({ isActive }) => 'child-nav-item' + (isActive ? ' active' : '')}>
          <span className="cn-ico">🎁</span>
          奖励站
        </NavLink>
      </nav>

      {celebrate && (
        <div className="celebrate">
          <div className="celebrate-card">
            <div className="celebrate-bolt">⚡</div>
            <h2>{nickname}！</h2>
            <p>今天的任务全部完成啦！</p>
            <p className="celebrate-pts">
              今日获得积分 <b>{points ? points.todayEarned : '…'}</b> 分
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => setCelebrate(false)}>
              太棒了！
            </button>
            <Link to="/child/redeem" className="celebrate-link">
              去奖励站看看 →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}