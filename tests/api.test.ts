import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { openDb } from '../server/db.js'
import { seedIfEmpty } from '../server/seed.js'
import { createHub } from '../server/realtime.js'
import { createApp } from '../server/app.js'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'homeworkplan-'))
const db = openDb(path.join(tmp, 'test.db'))
seedIfEmpty(db)

const { hub } = createHub()
const events: Array<{ event: string; payload: Record<string, unknown> }> = []
hub.broadcast = (event, payload = {}) => {
  events.push({ event, payload })
}

const app = createApp(db, hub)
const server = http.createServer(app)
let base = ''
let cookie = ''
const date = new Date().toISOString().slice(0, 10)

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(() => {
  server.close()
  db.close()
  fs.rmSync(tmp, { recursive: true, force: true })
})

async function api(method: string, url: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(base + url, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const first = setCookie.split(';')[0]
    if (first.startsWith('parent_session=')) {
      cookie = first.split('=')[1] ? first : ''
    }
  }
  const text = await res.text()
  return { status: res.status, json: text ? JSON.parse(text) : null }
}

test('首次初始化家长密码并登录', async () => {
  const required = await api('GET', '/api/setup-required')
  assert.equal(required.json.required, true)

  const bad = await api('POST', '/api/setup', { pin: 'ab' })
  assert.equal(bad.status, 400)

  const setup = await api('POST', '/api/setup', { pin: '1234' })
  assert.equal(setup.status, 200)
  assert.ok(cookie)
})

test('未登录访问家长接口返回 401', async () => {
  const saved = cookie
  cookie = ''
  const res = await api('POST', '/api/tasks', { date, kind: 'homework', subject: '语文', content: '写生字' })
  assert.equal(res.status, 401)
  cookie = saved
})

test('家长布置语数英作业与课外任务', async () => {
  for (const subject of ['语文', '数学', '英语']) {
    const res = await api('POST', '/api/tasks', {
      date,
      kind: 'homework',
      subject,
      content: `${subject}作业`,
      minutes: 30,
    })
    assert.equal(res.status, 200)
  }
  const extra = await api('POST', '/api/tasks', {
    date,
    kind: 'extracurricular',
    content: '课外阅读',
    minutes: 30,
    points: 10,
    is_seed: true,
  })
  assert.equal(extra.status, 200)
})

test('列表返回 4 项，作业积分为 0 课外积分正确', async () => {
  const res = await api('GET', `/api/tasks?date=${date}`)
  assert.equal(res.status, 200)
  assert.equal(res.json.length, 4)
  const hw = res.json.find((t: any) => t.subject === '语文')
  assert.equal(hw.kind, 'homework')
  assert.equal(hw.points, 0)
  const extra = res.json.find((t: any) => t.kind === 'extracurricular')
  assert.equal(extra.points, 10)
})

test('孩子打卡：作业不加分，课外任务加分且防重复', async () => {
  const list = await api('GET', `/api/tasks?date=${date}`)
  const hw = list.json.find((t: any) => t.kind === 'homework')
  const hwDone = await api('POST', `/api/tasks/${hw.id}/complete`)
  assert.equal(hwDone.status, 200)
  assert.equal(hwDone.json.already, false)
  assert.equal(hwDone.json.points, 0)
  assert.equal(hwDone.json.balance, 0)

  const extra = list.json.find((t: any) => t.kind === 'extracurricular')
  const first = await api('POST', `/api/tasks/${extra.id}/complete`)
  assert.equal(first.status, 200)
  assert.equal(first.json.already, false)
  assert.equal(first.json.points, 10)
  const balance1 = first.json.balance
  assert.equal(balance1, 10)

  const second = await api('POST', `/api/tasks/${extra.id}/complete`)
  assert.equal(second.status, 200)
  assert.equal(second.json.already, true)
  assert.equal(second.json.balance, balance1)
})

test('积分查询正确', async () => {
  const res = await api('GET', '/api/points')
  assert.equal(res.status, 200)
  assert.equal(res.json.balance, 10)
  assert.equal(res.json.todayEarned, 10)
})

test('兑换流程：申请-拒绝-再申请-审批扣分', async () => {
  const cheap = await api('POST', '/api/tiers', { name: '测试小奖励', cost: 2 })
  const tier = { id: cheap.json.id, cost: 2 }

  const apply = await api('POST', '/api/redeem', { tierId: tier.id })
  assert.equal(apply.status, 200)

  const dup = await api('POST', '/api/redeem', { tierId: tier.id })
  assert.equal(dup.status, 409)

  const reject = await api('POST', `/api/redeem/${apply.json.id}/reject`)
  assert.equal(reject.status, 200)

  const reapply = await api('POST', '/api/redeem', { tierId: tier.id })
  assert.equal(reapply.status, 200)

  const approve = await api('POST', `/api/redeem/${reapply.json.id}/approve`)
  assert.equal(approve.status, 200)
  assert.ok(approve.json.balance < 10)

  const requests = await api('GET', '/api/redeem')
  assert.equal(requests.json[0].status, 'approved')
})

test('统计接口：今日完成率、各科、连续', async () => {
  const list = await api('GET', `/api/tasks?date=${date}`)
  for (const t of list.json.filter((x: any) => !x.completed_at)) {
    await api('POST', `/api/tasks/${t.id}/complete`)
  }
  const overview = await api('GET', '/api/stats/overview?days=7')
  const today = overview.json.find((d: any) => d.date === date)
  assert.equal(today.total, 4)
  assert.equal(today.done, 4)
  assert.equal(today.doneAll, true)

  const subjects = await api('GET', `/api/stats/subjects?from=${date}&to=${date}`)
  assert.equal(subjects.json.reduce((s: number, x: any) => s + x.total, 0), 3)

  const streak = await api('GET', '/api/stats/streak')
  assert.equal(streak.json.todayDone, true)
  assert.ok(streak.json.current >= 1)
})

test('撤销打卡后积分回落', async () => {
  const list = await api('GET', `/api/tasks?date=${date}`)
  const extra = list.json.find((t: any) => t.kind === 'extracurricular')
  const before = await api('GET', '/api/points')
  const un = await api('POST', `/api/tasks/${extra.id}/uncomplete`)
  assert.equal(un.status, 200)
  assert.equal(un.json.already, false)
  const after = await api('GET', '/api/points')
  assert.equal(after.json.balance, before.json.balance - 10)
})

test('家长手动调分与改密', async () => {
  const adjust = await api('POST', '/api/points/adjust', { amount: 3, reason: '测试加分' })
  assert.equal(adjust.status, 200)

  const wrong = await api('PUT', '/api/settings/pin', { oldPin: '0000', newPin: '5678' })
  assert.equal(wrong.status, 403)

  const chg = await api('PUT', '/api/settings/pin', { oldPin: '1234', newPin: '5678' })
  assert.equal(chg.status, 200)

  const loginOld = await api('POST', '/api/login', { pin: '1234' })
  assert.equal(loginOld.status, 401)
  const loginNew = await api('POST', '/api/login', { pin: '5678' })
  assert.equal(loginNew.status, 200)
})

test('可选项池与奖励档位 CRUD', async () => {
  const add = await api('POST', '/api/extras', { name: '围棋', default_minutes: 30, default_points: 8 })
  assert.equal(add.status, 200)
  const list = await api('GET', '/api/extras')
  const total = list.json.length
  assert.ok(list.json.some((x: any) => x.name === '围棋'))

  await api('DELETE', `/api/extras/${add.json.id}`)
  const after = await api('GET', '/api/extras')
  assert.equal(after.json.length, total - 1)

  const tier = await api('POST', '/api/tiers', { name: '新奖励', cost: 99 })
  assert.equal(tier.status, 200)
  await api('DELETE', `/api/tiers/${tier.json.id}`)
})

test('信息接口返回局域网地址', async () => {
  const info = await api('GET', '/api/info')
  assert.equal(info.status, 200)
  assert.equal(typeof info.json.port, 'string')
})

test('实时事件已广播', async () => {
  assert.ok(events.some((e) => e.event === 'tasks-changed'))
  assert.ok(events.some((e) => e.event === 'points-changed'))
  assert.ok(events.some((e) => e.event === 'redeem-changed'))
})