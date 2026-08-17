import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { requireParent } from '../auth.js'
import { resErr, isDateStr, str, num, todayStr } from '../util.js'

type TaskRow = {
  id: number
  date: string
  kind: string
  subject: string | null
  content: string
  minutes: number
  points: number
  sort_order: number
  is_seed: number
  completed_at: string | null
}

const SUBJECTS = ['语文', '数学', '英语']
const TASK_SELECT = `SELECT t.id, t.date, t.kind, t.subject, t.content, t.minutes, t.points, t.sort_order, t.is_seed,
  c.completed_at
  FROM tasks t LEFT JOIN completions c ON c.task_id = t.id`

function balanceOf(db: DB): number {
  const row = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM points_ledger`).get() as { s: number }
  return row.s
}

export function taskRoutes(r: Router, db: DB, hub: Hub): void {
  r.get('/tasks', (req, res) => {
    const date = req.query.date as string
    if (!isDateStr(date)) return resErr(res, 400, '日期格式错误')
    res.json(db.prepare(`${TASK_SELECT} WHERE t.date = ? ORDER BY t.sort_order, t.id`).all(date) as TaskRow[])
  })

  r.post('/tasks', requireParent, (req, res) => {
    const { date, kind, subject, content } = req.body ?? {}
    if (!isDateStr(date)) return resErr(res, 400, '日期格式错误')
    if (kind !== 'homework' && kind !== 'extracurricular') return resErr(res, 400, '任务类型错误')
    const c = str(content)
    if (!c) return resErr(res, 400, '任务内容不能为空')
    let subj: string | null = null
    if (kind === 'homework') {
      if (typeof subject !== 'string' || !SUBJECTS.includes(subject)) return resErr(res, 400, '学科错误')
      subj = subject
    } else if (subject) {
      return resErr(res, 400, '课外任务不需要学科')
    }
    const points = kind === 'homework' ? 0 : num(req.body?.points, 5)
    const info = db
      .prepare(
        `INSERT INTO tasks (date, kind, subject, content, minutes, points, sort_order, is_seed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(date, kind, subj, c, num(req.body?.minutes, 0), points, num(req.body?.sort_order, 0), req.body?.is_seed ? 1 : 0)
    hub.broadcastTaskDate(date)
    res.json({ id: Number(info.lastInsertRowid) })
  })

  r.put('/tasks/:id', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    const existing = db.prepare(`SELECT date, kind FROM tasks WHERE id = ?`).get(id) as
      | { date: string; kind: string }
      | undefined
    if (!existing) return resErr(res, 404, '任务不存在')
    const fields: string[] = []
    const values: Array<string | number | null> = []
    if (req.body?.content !== undefined) {
      const c = str(req.body.content)
      if (!c) return resErr(res, 400, '内容不能为空')
      fields.push('content = ?')
      values.push(c)
    }
    if (req.body?.minutes !== undefined) {
      fields.push('minutes = ?')
      values.push(num(req.body.minutes, 0))
    }
    if (req.body?.points !== undefined && existing.kind !== 'homework') {
      fields.push('points = ?')
      values.push(num(req.body.points, 0))
    }
    if (req.body?.sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(num(req.body.sort_order, 0))
    }
    if (req.body?.subject !== undefined) {
      fields.push('subject = ?')
      values.push(str(req.body.subject))
    }
    if (fields.length === 0) return resErr(res, 400, '没有可更新的字段')
    values.push(id)
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    hub.broadcastTaskDate(existing.date)
    res.json({ ok: true })
  })

  r.delete('/tasks/:id', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    const existing = db
      .prepare(`SELECT date, content, points FROM tasks WHERE id = ?`)
      .get(id) as { date: string; content: string; points: number } | undefined
    if (!existing) return resErr(res, 404, '任务不存在')
    db.transaction(() => {
      const comp = db.prepare(`SELECT id FROM completions WHERE task_id = ?`).get(id)
      db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id)
      if (comp && existing.points !== 0) {
        db
          .prepare(`INSERT INTO points_ledger (amount, reason, ref_type, ref_id) VALUES (?, ?, 'task', ?)`)
          .run(-existing.points, `撤销：删除已完成任务「${existing.content}」`, id)
      }
    })()
    hub.broadcastTaskDate(existing.date)
    hub.broadcast('points-changed')
    res.json({ ok: true })
  })

  r.post('/tasks/:id/complete', (req, res) => {
    const id = num(req.params.id, -1)
    try {
      const result = db.transaction(() => {
        const task = db
          .prepare(`SELECT date, content, points FROM tasks WHERE id = ?`)
          .get(id) as { date: string; content: string; points: number } | undefined
        if (!task) throw Object.assign(new Error('任务不存在'), { status: 404 })
        const comp = db.prepare(`SELECT id FROM completions WHERE task_id = ?`).get(id)
        if (comp) return { already: true, points: 0, date: task.date }
        db.prepare(`INSERT INTO completions (task_id) VALUES (?)`).run(id)
        if (task.points !== 0) {
          db
            .prepare(`INSERT INTO points_ledger (amount, reason, ref_type, ref_id) VALUES (?, ?, 'task', ?)`)
            .run(task.points, `完成任务：「${task.content}」`, id)
        }
        return { already: false, points: task.points, date: task.date }
      })()
      hub.broadcastTaskDate(result.date)
      hub.broadcast('points-changed')
      res.json({ ok: true, points: result.points, already: result.already, balance: balanceOf(db) })
    } catch (e) {
      const err = e as { status?: number; message?: string }
      resErr(res, err.status || 500, err.message || '操作失败')
    }
  })

  r.post('/tasks/:id/uncomplete', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    try {
      const result = db.transaction(() => {
        const task = db
          .prepare(`SELECT date, content, points FROM tasks WHERE id = ?`)
          .get(id) as { date: string; content: string; points: number } | undefined
        if (!task) throw Object.assign(new Error('任务不存在'), { status: 404 })
        const comp = db.prepare(`SELECT id FROM completions WHERE task_id = ?`).get(id)
        if (!comp) return { already: true, date: todayStr() }
        db.prepare(`DELETE FROM completions WHERE task_id = ?`).run(id)
        if (task.points !== 0) {
          db
            .prepare(`INSERT INTO points_ledger (amount, reason, ref_type, ref_id) VALUES (?, ?, 'task', ?)`)
            .run(-task.points, `撤销打卡：「${task.content}」`, id)
        }
        return { already: false, date: task.date }
      })()
      hub.broadcastTaskDate(result.date)
      hub.broadcast('points-changed')
      res.json({ ok: true, already: result.already })
    } catch (e) {
      const err = e as { status?: number; message?: string }
      resErr(res, err.status || 500, err.message || '操作失败')
    }
  })
}