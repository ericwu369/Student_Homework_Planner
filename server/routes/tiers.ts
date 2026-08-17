import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { requireParent } from '../auth.js'
import { resErr, str, num } from '../util.js'

export function tiersRoutes(r: Router, db: DB, hub: Hub): void {
  r.get('/tiers', (_req, res) => {
    res.json(db.prepare(`SELECT * FROM redemption_tiers ORDER BY sort_order, id`).all())
  })

  r.post('/tiers', requireParent, (req, res) => {
    const name = str(req.body?.name)
    if (!name) return resErr(res, 400, '名称不能为空')
    const cost = num(req.body?.cost, 0)
    if (cost <= 0) return resErr(res, 400, '所需积分需大于 0')
    const info = db
      .prepare(`INSERT INTO redemption_tiers (name, cost, sort_order) VALUES (?, ?, ?)`)
      .run(name, cost, num(req.body?.sort_order, 0))
    hub.broadcast('tiers-changed')
    res.json({ id: Number(info.lastInsertRowid) })
  })

  r.put('/tiers/:id', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    if (!db.prepare(`SELECT id FROM redemption_tiers WHERE id = ?`).get(id)) return resErr(res, 404, '档位不存在')
    const fields: string[] = []
    const values: Array<string | number> = []
    if (req.body?.name !== undefined) {
      const n = str(req.body.name)
      if (!n) return resErr(res, 400, '名称不能为空')
      fields.push('name = ?')
      values.push(n)
    }
    if (req.body?.cost !== undefined) {
      const c = num(req.body.cost, 0)
      if (c <= 0) return resErr(res, 400, '所需积分需大于 0')
      fields.push('cost = ?')
      values.push(c)
    }
    if (req.body?.enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(req.body.enabled ? 1 : 0)
    }
    if (req.body?.sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(num(req.body.sort_order, 0))
    }
    if (fields.length === 0) return resErr(res, 400, '没有可更新的字段')
    values.push(id)
    db.prepare(`UPDATE redemption_tiers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    hub.broadcast('tiers-changed')
    res.json({ ok: true })
  })

  r.delete('/tiers/:id', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    const info = db.prepare(`DELETE FROM redemption_tiers WHERE id = ?`).run(id)
    if (info.changes === 0) return resErr(res, 404, '档位不存在')
    hub.broadcast('tiers-changed')
    res.json({ ok: true })
  })
}