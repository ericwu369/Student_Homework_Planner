import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { requireParent } from '../auth.js'
import { resErr, num, nowLocalStr } from '../util.js'

function balanceOf(db: DB): number {
  const row = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM points_ledger`).get() as { s: number }
  return row.s
}

export function redeemRoutes(r: Router, db: DB, hub: Hub): void {
  r.get('/redeem', requireParent, (_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT rr.id, rr.tier_id, rr.status, rr.requested_at, rr.decided_at, t.name AS tier_name, t.cost
           FROM redemption_requests rr JOIN redemption_tiers t ON t.id = rr.tier_id
           ORDER BY rr.requested_at DESC, rr.id DESC`
        )
        .all()
    )
  })

  r.post('/redeem', (req, res) => {
    const tierId = num(req.body?.tierId, -1)
    const tier = db
      .prepare(`SELECT id, name, cost FROM redemption_tiers WHERE id = ? AND enabled = 1`)
      .get(tierId) as { id: number; name: string; cost: number } | undefined
    if (!tier) return resErr(res, 404, '奖励档位不存在或已停用')
    const pending = db.prepare(`SELECT id FROM redemption_requests WHERE tier_id = ? AND status = 'pending'`).get(tierId)
    if (pending) return resErr(res, 409, '该奖励已有待处理的申请')
    const info = db.prepare(`INSERT INTO redemption_requests (tier_id) VALUES (?)`).run(tierId)
    hub.broadcast('redeem-changed')
    res.json({ id: Number(info.lastInsertRowid), tierName: tier.name, cost: tier.cost, balance: balanceOf(db) })
  })

  r.post('/redeem/:id/approve', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    try {
      const result = db.transaction(() => {
        const reqRow = db
          .prepare(`SELECT id, tier_id, status FROM redemption_requests WHERE id = ?`)
          .get(id) as { id: number; tier_id: number; status: string } | undefined
        if (!reqRow) throw Object.assign(new Error('申请不存在'), { status: 404 })
        if (reqRow.status !== 'pending') throw Object.assign(new Error('该申请已处理'), { status: 409 })
        const tier = db.prepare(`SELECT name, cost FROM redemption_tiers WHERE id = ?`).get(reqRow.tier_id) as {
          name: string
          cost: number
        }
        const balance = balanceOf(db)
        if (balance < tier.cost) throw Object.assign(new Error('孩子积分不足，无法批准'), { status: 409 })
        db
          .prepare(`INSERT INTO points_ledger (amount, reason, ref_type, ref_id) VALUES (?, ?, 'redeem', ?)`)
          .run(-tier.cost, `兑换：「${tier.name}」`, reqRow.id)
        db
          .prepare(`UPDATE redemption_requests SET status = 'approved', decided_at = ? WHERE id = ?`)
          .run(nowLocalStr(), reqRow.id)
        return { balance: balanceOf(db) }
      })()
      hub.broadcast('points-changed')
      hub.broadcast('redeem-changed')
      res.json({ ok: true, balance: result.balance })
    } catch (e) {
      const err = e as { status?: number; message?: string }
      resErr(res, err.status || 500, err.message || '操作失败')
    }
  })

  r.post('/redeem/:id/reject', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    const info = db
      .prepare(`UPDATE redemption_requests SET status = 'rejected', decided_at = ? WHERE id = ? AND status = 'pending'`)
      .run(nowLocalStr(), id)
    if (info.changes === 0) return resErr(res, 404, '未找到待处理申请')
    hub.broadcast('redeem-changed')
    res.json({ ok: true })
  })
}