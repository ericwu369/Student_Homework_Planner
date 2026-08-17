import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import {
  getPinHash,
  setPinHash,
  verifyPin,
  issueSession,
  destroySession,
  isSessionValid,
  getToken,
} from '../auth.js'
import { resErr, str } from '../util.js'

export function authRoutes(r: Router, db: DB, _hub: Hub): void {
  r.get('/setup-required', (_req, res) => {
    res.json({ required: !getPinHash(db) })
  })

  r.get('/me', (req, res) => {
    res.json({ authed: isSessionValid(getToken(req)), setupRequired: !getPinHash(db) })
  })

  r.post('/setup', (req, res) => {
    if (getPinHash(db)) return resErr(res, 409, '家长密码已初始化')
    const pin = str(req.body?.pin)
    if (!pin || !/^\d{4,6}$/.test(pin)) return resErr(res, 400, '密码需为 4-6 位数字')
    setPinHash(db, pin)
    issueSession(res)
    res.json({ ok: true })
  })

  r.post('/login', (req, res) => {
    const hash = getPinHash(db)
    if (!hash) return resErr(res, 400, '请先初始化家长密码')
    const pin = str(req.body?.pin)
    if (!pin || !verifyPin(pin, hash)) return resErr(res, 401, '密码错误')
    issueSession(res)
    res.json({ ok: true })
  })

  r.post('/logout', (_req, res) => {
    destroySession(res)
    res.json({ ok: true })
  })
}