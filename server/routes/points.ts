import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { requireParent } from '../auth.js'
import { resErr, str, num, todayStr } from '../util.js'

function balanceOf(db: DB): number {
  const row = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM points_ledger`).get() as { s: number }
  return row.s
}

export function pointsRoutes(r: Router, db: DB, hub: Hub): void {
  r.get('/points', (_req, res) => {
    const today = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM points_ledger WHERE amount > 0 AND ref_type = 'task' AND date(created_at) = ?`
      )
      .get(todayStr()) as { s: number }
    const earnedTotal = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM points_ledger WHERE amount > 0`)
      .get() as { s: number }
    res.json({ balance: balanceOf(db), todayEarned: today.s, earnedTotal: earnedTotal.s })
  })

  r.get('/points/ledger', requireParent, (_req, res) => {
    res.json(db.prepare(`SELECT * FROM points_ledger ORDER BY id DESC LIMIT 300`).all())
  })

  r.post('/points/adjust', requireParent, (req, res) => {
    const amount = req.body?.amount
    const reason = str(req.body?.reason)
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) return resErr(res, 400, '积分变动不能为 0')
    if (!reason) return resErr(res, 400, '请填写变动原因')
    db.prepare(`INSERT INTO points_ledger (amount, reason, ref_type) VALUES (?, ?, 'manual')`).run(
      Math.round(amount),
      reason
    )
    hub.broadcast('points-changed')
    res.json({ ok: true, balance: balanceOf(db) })
  })
}