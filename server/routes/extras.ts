import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { requireParent } from '../auth.js'
import { resErr, str, num } from '../util.js'

export function extrasRoutes(r: Router, db: DB, hub: Hub): void {
  r.get('/extras', requireParent, (_req, res) => {
    res.json(db.prepare(`SELECT * FROM extracurricular_options ORDER BY sort_order, id`).all())
  })

  r.post('/extras', requireParent, (req, res) => {
    const name = str(req.body?.name)
    if (!name) return resErr(res, 400, '名称不能为空')
    const info = db
      .prepare(
        `INSERT INTO extracurricular_options (name, default_minutes, default_points, sort_order)
         VALUES (?, ?, ?, ?)`
      )
      .run(name, num(req.body?.default_minutes, 0), num(req.body?.default_points, 5), num(req.body?.sort_order, 0))
    hub.broadcast('extras-changed')
    res.json({ id: Number(info.lastInsertRowid) })
  })

  r.put('/extras/:id', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    if (!db.prepare(`SELECT id FROM extracurricular_options WHERE id = ?`).get(id)) return resErr(res, 404, '选项不存在')
    const fields: string[] = []
    const values: Array<string | number> = []
    if (req.body?.name !== undefined) {
      const n = str(req.body.name)
      if (!n) return resErr(res, 400, '名称不能为空')
      fields.push('name = ?')
      values.push(n)
    }
    if (req.body?.default_minutes !== undefined) {
      fields.push('default_minutes = ?')
      values.push(num(req.body.default_minutes, 0))
    }
    if (req.body?.default_points !== undefined) {
      fields.push('default_points = ?')
      values.push(num(req.body.default_points, 0))
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
    db.prepare(`UPDATE extracurricular_options SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    hub.broadcast('extras-changed')
    res.json({ ok: true })
  })

  r.delete('/extras/:id', requireParent, (req, res) => {
    const id = num(req.params.id, -1)
    const info = db.prepare(`DELETE FROM extracurricular_options WHERE id = ?`).run(id)
    if (info.changes === 0) return resErr(res, 404, '选项不存在')
    hub.broadcast('extras-changed')
    res.json({ ok: true })
  })
}