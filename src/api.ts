import type { Task, ExtraOption, Tier, RedeemRequest, LedgerRow, DayStat } from './types'

const BASE = '/api'
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type TaskInput = Partial<Omit<Task, 'subject' | 'is_seed'>> & { subject?: string | null; is_seed?: boolean }
export type ExtraInput = {
  name?: string
  default_minutes?: number
  default_points?: number
  sort_order?: number
  enabled?: boolean
}
export type TierInput = { name?: string; cost?: number; sort_order?: number; enabled?: boolean }

async function request<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('无法连接到家长电脑，请检查服务是否启动')
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error || `请求失败(${res.status})`)
  return data as T
}

export const api = {
  me: () => request<{ authed: boolean; setupRequired: boolean }>('/me'),
  info: () => request<{ appName: string; nickname: string; port: string; lanIps: string[] }>('/info'),
  settings: () => request<{ appName: string; nickname: string }>('/settings'),
  setup: (pin: string) => request<{ ok: boolean }>('/setup', 'POST', { pin }),
  login: (pin: string) => request<{ ok: boolean }>('/login', 'POST', { pin }),
  logout: () => request<{ ok: boolean }>('/logout', 'POST'),

  tasks: (date: string) => request<Task[]>('/tasks?date=' + date),
  createTask: (t: TaskInput) => request<{ id: number }>('/tasks', 'POST', t),
  updateTask: (id: number, t: TaskInput) => request<{ ok: boolean }>('/tasks/' + id, 'PUT', t),
  deleteTask: (id: number) => request<{ ok: boolean }>('/tasks/' + id, 'DELETE'),
  completeTask: (id: number) => request<{ ok: boolean; points: number; already: boolean; balance: number }>(`/tasks/${id}/complete`, 'POST'),
  uncompleteTask: (id: number) => request<{ ok: boolean }>(`/tasks/${id}/uncomplete`, 'POST'),

  extras: () => request<ExtraOption[]>('/extras'),
  createExtra: (e: Partial<ExtraOption>) => request<{ id: number }>('/extras', 'POST', e),
  updateExtra: (id: number, e: ExtraInput) => request<{ ok: boolean }>('/extras/' + id, 'PUT', e),
  deleteExtra: (id: number) => request<{ ok: boolean }>('/extras/' + id, 'DELETE'),

  tiers: () => request<Tier[]>('/tiers'),
  createTier: (t: { name: string; cost: number }) => request<{ id: number }>('/tiers', 'POST', t),
  updateTier: (id: number, t: TierInput) => request<{ ok: boolean }>('/tiers/' + id, 'PUT', t),
  deleteTier: (id: number) => request<{ ok: boolean }>('/tiers/' + id, 'DELETE'),
  redeem: () => request<RedeemRequest[]>('/redeem'),
  submitRedeem: (tierId: number) => request<{ id: number; balance: number }>('/redeem', 'POST', { tierId }),
  approveRedeem: (id: number) => request<{ ok: boolean; balance: number }>('/redeem/' + id + '/approve', 'POST'),
  rejectRedeem: (id: number) => request<{ ok: boolean }>('/redeem/' + id + '/reject', 'POST'),

  points: () => request<{ balance: number; todayEarned: number; earnedTotal: number }>('/points'),
  ledger: () => request<LedgerRow[]>('/points/ledger'),
  adjustPoints: (amount: number, reason: string) => request<{ ok: boolean; balance: number }>('/points/adjust', 'POST', { amount, reason }),

  overview: (days = 30) => request<DayStat[]>('/stats/overview?days=' + days),
  subjectsStats: (from: string, to: string) => request<Array<{ subject: string; total: number; done: number }>>('/stats/subjects?from=' + from + '&to=' + to),
  streak: () => request<{ current: number; best: number; todayDone: boolean; hasTasksToday: boolean; calendar: DayStat[] }>('/stats/streak'),
  pointsStats: (from: string, to: string) => request<{ earned: number; spent: number }>('/stats/points?from=' + from + '&to=' + to),

  changePin: (oldPin: string, newPin: string) => request<{ ok: boolean }>('/settings/pin', 'PUT', { oldPin, newPin }),
  saveNickname: (nickname: string) => request<{ ok: boolean }>('/settings/nickname', 'PUT', { nickname }),
}