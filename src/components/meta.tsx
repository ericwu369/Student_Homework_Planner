import type { Subject, Kind } from '../types'

export const SUBJECT_EMOJI: Record<string, string> = {
  语文: '📖',
  数学: '📐',
  英语: '🔤',
  课外: '🎨',
}
export const KIND_EMOJI: Record<Kind, string> = {
  homework: '📚',
  extracurricular: '🎨',
}

export function subjectColor(subject?: Subject | null): string {
  if (!subject) return 'var(--subj-课外)'
  return `var(--subj-${subject})`
}

export function subjLabel(subject?: Subject | null): string {
  return subject ?? '课外'
}

export function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso + (iso.includes(' ') ? '' : 'T00:00:00'))
  if (iso.includes(' ')) return iso.slice(11, 16)
  return iso
}

/** 北京时间字面量(本地时区)解析辅助：``YYYY-MM-DD HH:mm:ss`` -> Date */
export function parseLocal(iso: string | null): number {
  if (!iso) return 0
  return new Date(iso.replace(' ', 'T')).getTime()
}