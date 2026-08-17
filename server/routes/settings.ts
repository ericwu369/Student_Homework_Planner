import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { requireParent } from '../auth.js'
import { getPinHash, setPinHash, verifyPin } from '../auth.js'
import { resErr, str } from '../util.js'
import { lanIps } from '../util-net.js'

function getSetting(db: DB, key: string): string {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value?: string } | undefined
  return row?.value ?? ''
}

export function settingsRoutes(r: Router, db: DB, hub: Hub): void {
  r.get('/info', (_req, res) => {
    res.json({
      appName: getSetting(db, 'app_name') || '学习小管家',
      nickname: getSetting(db, 'nickname') || '皮卡皮卡',
      port: process.env.PORT || '8787',
      lanIps: lanIps(),
    })
  })

  r.get('/settings', requireParent, (_req, res) => {
    res.json({
      appName: getSetting(db, 'app_name') || '学习小管家',
      nickname: getSetting(db, 'nickname') || '皮卡皮卡',
    })
  })

  r.put('/settings/nickname', requireParent, (req, res) => {
    const nickname = str(req.body?.nickname)
    if (!nickname) return resErr(res, 400, '称呼不能为空')
    db.prepare(
      `INSERT INTO settings (key, value) VALUES ('nickname', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(nickname)
    hub.broadcast('settings-changed')
    res.json({ ok: true })
  })

  r.put('/settings/pin', requireParent, (req, res) => {
    const hash = getPinHash(db)
    if (!hash) return resErr(res, 400, '请先初始化家长密码')
    const oldPin = str(req.body?.oldPin)
    const newPin = str(req.body?.newPin)
    if (!oldPin || !verifyPin(oldPin, hash)) return resErr(res, 403, '原密码错误')
    if (!newPin || !/^\d{4,6}$/.test(newPin)) return resErr(res, 400, '新密码需为 4-6 位数字')
    setPinHash(db, newPin)
    res.json({ ok: true })
  })
}

