export function todayStr(): string {
  const d = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 返回距今天 days 天后的日期字符串；days 为正表示未来，为负表示过去 */
export function dateStrFromOffset(days: number, base = todayStr()): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}