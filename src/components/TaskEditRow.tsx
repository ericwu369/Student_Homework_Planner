import { useEffect, useState } from 'react'
import type { Task } from '../types'
import type { TaskInput } from '../api'
import { SUBJECT_EMOJI, subjectColor, fmtTime } from './meta'

export function TaskEditRow({
  task,
  defaultPoints,
  onSave,
  onDelete,
  onUncomplete,
}: {
  task: Task
  defaultPoints?: number
  onSave: (id: number, p: TaskInput) => Promise<void>
  onDelete: (id: number) => void
  onUncomplete?: (id: number) => Promise<void>
}) {
  const [content, setContent] = useState(task.content)
  const [minutes, setMinutes] = useState(String(task.minutes || ''))
  const [points, setPoints] = useState(String(task.points ?? defaultPoints ?? 0))
  const [busy, setBusy] = useState(false)

  const isHomework = task.kind === 'homework'

  useEffect(() => {
    setContent(task.content)
    setMinutes(String(task.minutes || ''))
    setPoints(String(task.points ?? defaultPoints ?? 0))
  }, [task, defaultPoints])

  const dirty =
    content !== task.content || Number(minutes || 0) !== task.minutes || (isHomework ? false : Number(points || 0) !== task.points)

  const save = async () => {
    if (!dirty) return
    setBusy(true)
    try {
      await onSave(task.id, {
        content,
        minutes: Number(minutes || 0),
        points: isHomework ? 0 : Number(points || 0),
      })
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`task-edit${task.completed_at ? ' is-done' : ''}`}>
      <span className="task-edit-emoji" style={{ color: subjectColor(task.subject) }}>
        {task.kind === 'extracurricular' ? SUBJECT_EMOJI.课外 : SUBJECT_EMOJI[task.subject ?? '']}
      </span>
      <input
        className="input task-edit-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="作业内容"
      />
      <label className="task-edit-num">
        <input
          className="input"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
        />
        <span>分钟</span>
      </label>
      {!isHomework && (
        <label className="task-edit-num">
          <input
            className="input"
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/\D/g, ''))}
            placeholder="5"
          />
          <span>积分</span>
        </label>
      )}
      {task.completed_at ? (
        <span className="done-tag" title={task.completed_at}>
          ✓ {fmtTime(task.completed_at)}
        </span>
      ) : (
        <span className="pending-tag">待完成</span>
      )}
      <div className="task-edit-ops">
        <button className="btn btn-success btn-sm" disabled={!dirty || busy} onClick={save}>
          {busy ? '…' : '保存'}
        </button>
        {task.completed_at && onUncomplete && (
          <button
            className="btn btn-sm"
            onClick={() => {
              if (confirm(task.kind === 'homework' ? '撤销这次打卡？' : '撤销这次打卡？会扣回已获得的积分。')) onUncomplete(task.id)
            }}
          >
            撤销打卡
          </button>
        )}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(task.id)}>
          删除
        </button>
      </div>
    </div>
  )
}

export function AddHomeworkRow({
  subject,
  onAdd,
}: {
  subject: string
  onAdd: (content: string, minutes: number) => Promise<void>
}) {
  const [content, setContent] = useState('')
  const [minutes, setMinutes] = useState('30')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!content.trim()) return
    setBusy(true)
    try {
      await onAdd(content.trim(), Number(minutes || 0))
      setContent('')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="task-edit is-add">
      <input
        className="input task-edit-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={`输入今天${subject}作业内容…`}
      />
      <label className="task-edit-num">
        <input
          className="input"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
        />
        <span>分钟</span>
      </label>
      <div className="task-edit-ops">
        <button className="btn btn-primary btn-sm" disabled={!content.trim() || busy} onClick={add}>
          {busy ? '…' : '＋ 添加'}
        </button>
      </div>
    </div>
  )
}