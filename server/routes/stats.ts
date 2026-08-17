import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { resErr, num, isDateStr, dateStrFromOffset, todayStr } from '../util.js'

type DayStat = {
  date: string
  total: number
  done: number
  doneAll: boolean
  hasTasks: boolean
}

function overview(db: DB, days: number): DayStat[] {
  const from = dateStrFromOffset(-(days - 1))
  const rows = db
    .prepare(
      `SELECT t.date, COUNT(t.id) AS total, COUNT(c.id) AS done
       FROM tasks t LEFT JOIN completions c ON c.task_id = t.id
       WHERE t.date >= ?
       GROUP BY t.date`
    )
    .all(from) as Array<{ date: string; total: number; done: number }>
  const byDate = new Map(rows.map((item) => [item.date, item]))
  const out: DayStat[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = dateStrFromOffset(-i)
    const item = byDate.get(date)
    const total = item?.total ?? 0
    const done = item?.done ?? 0
    out.push({ date, total, done, doneAll: total > 0 && done === total, hasTasks: total > 0 })
  }
  return out
}

export function statsRoutes(r: Router, db: DB, _hub: Hub): void {
  r.get('/stats/overview', (req, res) => {
    const days = Math.min(Math.max(num(req.query.days, 30), 1), 180)
    res.json(overview(db, days))
  })

  r.get('/stats/subjects', (req, res) => {
    const from = req.query.from as string
    const to = req.query.to as string
    if (!isDateStr(from) || !isDateStr(to)) return resErr(res, 400, '日期格式错误')
    res.json(
      db
        .prepare(
          `SELECT CASE WHEN t.kind = 'extracurricular' THEN '课外' ELSE t.subject END AS subject,
                  COUNT(t.id) AS total, COUNT(c.id) AS done
           FROM tasks t LEFT JOIN completions c ON c.task_id = t.id
           WHERE t.date BETWEEN ? AND ?
           GROUP BY subject`
        )
        .all(from, to)
    )
  })

  r.get('/stats/streak', (_req, res) => {
    const dayStats = overview(db, 60)
    let best = 0
    let run = 0
    for (const d of dayStats) {
      run = d.doneAll ? run + 1 : 0
      if (run > best) best = run
    }
    let current = 0
    let idx = dayStats.length - 1
    if (idx >= 0 && dayStats[idx].hasTasks && !dayStats[idx].doneAll) idx--
    while (idx >= 0 && dayStats[idx].doneAll) {
      current++
      idx--
    }
    const today = todayStr()
    const todayItem = dayStats.find((d) => d.date === today)
    res.json({
      current,
      best,
      todayDone: todayItem ? todayItem.doneAll : false,
      hasTasksToday: todayItem ? todayItem.hasTasks : false,
      calendar: dayStats,
    })
  })

  r.get('/stats/points', (req, res) => {
    const from = req.query.from as string
    const to = req.query.to as string
    if (!isDateStr(from) || !isDateStr(to)) return resErr(res, 400, '日期格式错误')
    const earned = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM points_ledger WHERE amount > 0 AND date(created_at) BETWEEN ? AND ?`
      )
      .get(from, to) as { s: number }
    const spent = db
      .prepare(
        `SELECT COALESCE(SUM(-amount), 0) AS s FROM points_ledger WHERE amount < 0 AND date(created_at) BETWEEN ? AND ?`
      )
      .get(from, to) as { s: number }
    res.json({ earned: earned.s, spent: spent.s, from, to })
  })
}