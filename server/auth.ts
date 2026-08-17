import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import type { DB } from './db.js'

const SESSION_COOKIE = 'parent_session'
const SESSION_DAYS = 7
const sessions = new Map<string, number>()

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(pin, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
}

export function getPinHash(db: DB): string | null {
  const row = db.prepare(`SELECT value FROM settings WHERE key='pin_hash'`).get() as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setPinHash(db: DB, pin: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('pin_hash', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(hashPin(pin))
}

export function getToken(req: Request): string | undefined {
  const cookie = req.headers.cookie
  if (!cookie) return undefined
  for (const part of cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (name === SESSION_COOKIE) return part.slice(eq + 1).trim()
  }
  return undefined
}

export function isSessionValid(token: string | undefined): boolean {
  if (!token) return false
  const exp = sessions.get(token)
  if (!exp) return false
  if (exp < Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

export function issueSession(res: Response): string {
  const token = crypto.randomBytes(24).toString('hex')
  sessions.set(token, Date.now() + SESSION_DAYS * 24 * 3600 * 1000)
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
  })
  return token
}

export function destroySession(res: Response): string | undefined {
  const token = getToken(res.req)
  if (token) sessions.delete(token)
  res.clearCookie(SESSION_COOKIE)
  return token
}

export function requireParent(req: Request, res: Response, next: NextFunction): void {
  if (isSessionValid(getToken(req))) return next()
  res.status(401).json({ error: '需要家长登录' })
}