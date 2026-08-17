export type Kind = 'homework' | 'extracurricular'
export type Subject = '语文' | '数学' | '英语'

export interface Task {
  id: number
  date: string
  kind: Kind
  subject: Subject | null
  content: string
  minutes: number
  points: number
  sort_order: number
  is_seed: number
  completed_at: string | null
}

export interface ExtraOption {
  id: number
  name: string
  default_minutes: number
  default_points: number
  enabled: number
  sort_order: number
}

export interface Tier {
  id: number
  name: string
  cost: number
  enabled: number
  sort_order: number
}

export type RedeemStatus = 'pending' | 'approved' | 'rejected'

export interface RedeemRequest {
  id: number
  tier_id: number
  status: RedeemStatus
  requested_at: string
  decided_at: string | null
  tier_name: string
  cost: number
}

export interface LedgerRow {
  id: number
  amount: number
  reason: string
  ref_type: string
  ref_id: number | null
  created_at: string
}

export interface DayStat {
  date: string
  total: number
  done: number
  doneAll: boolean
  hasTasks: boolean
}

export type SubjKey = '语文' | '数学' | '英语'
export const SUBJECTS: SubjKey[] = ['语文', '数学', '英语']