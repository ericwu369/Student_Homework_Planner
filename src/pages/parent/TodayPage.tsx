import { useState } from 'react'
import { api, type TaskInput } from '../../api'
import { useSyncData, todayStr } from '../../hooks'
import type { Task, ExtraOption } from '../../types'
import { SUBJECTS } from '../../types'
import { SUBJECT_EMOJI, subjectColor } from '../../components/meta'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { TaskEditRow, AddHomeworkRow } from '../../components/TaskEditRow'

const SUBJ_ORDER = ['语文', '数学', '英语']

export default function TodayPage() {
  const [date, setDate] = useState(todayStr())

  const tasksRes = useSyncData(() => api.tasks(date), ['tasks-changed'], date)
  const extrasRes = useSyncData(() => api.extras(), ['extras-changed'])

  const tasks = tasksRes.data ?? []
  const extras = extrasRes.data ?? []
  const refresh = tasksRes.refresh

  const hwOf = (s: string) => tasks.filter((t) => t.kind === 'homework' && t.subject === s)
  const extraTasks = tasks.filter((t) => t.kind === 'extracurricular')
  const extraTaskNames = new Set(extraTasks.map((t) => t.content))
  const poolEnabled = extras.filter((e) => e.enabled)
  const poolNotAdded = poolEnabled.filter((e) => !extraTaskNames.has(e.name))

  const doneCount = tasks.filter((t) => t.completed_at).length

  const addHomework = async (subject: string, content: string, minutes: number) => {
    await api.createTask({ date, kind: 'homework', subject, content, minutes, points: 0 })
    refresh()
  }
  const addSeed = async (e: ExtraOption) => {
    await api.createTask({
      date,
      kind: 'extracurricular',
      content: e.name,
      minutes: e.default_minutes,
      points: e.default_points,
      is_seed: true,
    })
    refresh()
  }
  const addAllSeed = async () => {
    for (const e of poolNotAdded) await addSeed(e)
  }
  const saveTask = async (id: number, p: TaskInput) => {
    await api.updateTask(id, p)
    refresh()
  }
  const removeTask = async (id: number) => {
    if (!confirm('删除这条任务？')) return
    await api.deleteTask(id)
    refresh()
  }
  const uncomplete = async (id: number) => {
    await api.uncompleteTask(id)
  }

  if (tasksRes.error) return <div className="error-box">{tasksRes.error}</div>

  return (
    <div className="pad-page">
      <div className="page-head">
        <div>
          <h2>今日安排</h2>
          <p className="hint">
            填写学校老师布置的作业，并从课外"可选项池"选择今天的课外任务
          </p>
        </div>
        <div className="page-head-right">
          <ConnectionBadge status={tasksRes.status} />
          <input
            className="input date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayStr())}
          />
        </div>
      </div>

      <div className="summary-strip">
        <span>
          已布置 <b>{tasks.length}</b> 项 · 已打卡 <b className="ok">{doneCount}</b> 项
        </span>
        {tasks.length > 0 && doneCount === tasks.length && <span className="all-done-badge">✅ 今日全部完成</span>}
      </div>

      <section className="section">
        <h3 className="section-title">📚 学校作业</h3>
        <div className="subj-grid">
          {SUBJ_ORDER.map((s) => {
            const color = subjectColor(s as '语文')
            const rows = hwOf(s)
            return (
              <div className="card subj-card" key={s} style={{ borderTop: `4px solid ${color}` }}>
                <div className="subj-card-head">
                  <span style={{ color }}>{SUBJECT_EMOJI[s]}</span>
                  <h4>{s}</h4>
                  {rows.length > 0 && (
                    <span className="chip" style={{ background: `${color}1a`, color }}>
                      {rows.length} 条
                    </span>
                  )}
                </div>
                <div className="subj-tasks">
                  {rows.map((t) => (
                    <TaskEditRow
                      key={t.id}
                      task={t}
                      onSave={saveTask}
                      onDelete={removeTask}
                      onUncomplete={uncomplete}
                    />
                  ))}
                </div>
                <AddHomeworkRow
                  subject={s}
                  onAdd={(content, minutes) => addHomework(s, content, minutes)}
                />
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3 className="section-title">🎨 课外任务（可选项池）</h3>
          {poolNotAdded.length > 0 && (
            <button className="btn btn-sm" onClick={addAllSeed}>
              一键加入全部 ({poolNotAdded.length})
            </button>
          )}
        </div>

        {extraTasks.length > 0 && (
          <div className="card subj-card">
            <div className="subj-card-head">
              <span style={{ color: '#f59e0b' }}>{SUBJECT_EMOJI.课外}</span>
              <h4>今天已选的课外任务</h4>
            </div>
            <div className="subj-tasks">
              {extraTasks.map((t) => (
                <TaskEditRow
                  key={t.id}
                  task={t}
                  defaultPoints={t.points || 5}
                  onSave={saveTask}
                  onDelete={removeTask}
                  onUncomplete={uncomplete}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pool-grid">
          {poolEnabled.length === 0 && <div className="empty">可选项池是空的，去"课外选项"页添加吧</div>}
          {poolEnabled.map((e) => {
            const added = extraTaskNames.has(e.name)
            return (
              <div className={`card pool-chip${added ? ' added' : ''}`} key={e.id}>
                <div className="pool-chip-name">{e.name}</div>
                <div className="pool-chip-meta">
                  {e.default_minutes > 0 ? `${e.default_minutes}分钟` : ''} · +{e.default_points}分
                </div>
                {added ? (
                  <span className="pool-added">已加入 ✓</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => addSeed(e)}>
                    ＋ 加入今天
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}