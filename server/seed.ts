import type { DB } from './db.js'

export function seedIfEmpty(db: DB): void {
  const pool = db.prepare(`SELECT COUNT(*) AS n FROM extracurricular_options`).get() as { n: number }
  if (pool.n === 0) {
    const ins = db.prepare(
      `INSERT INTO extracurricular_options (name, default_minutes, default_points, sort_order) VALUES (?, ?, ?, ?)`
    )
    const items: Array<[string, number, number, number]> = [
      ['课外阅读', 30, 10, 0],
      ['口算练习', 10, 5, 1],
      ['练字', 15, 5, 2],
      ['英语单词背诵', 15, 5, 3],
      ['跳绳锻炼', 10, 5, 4],
    ]
    db.transaction(() => {
      items.forEach((it, i) => ins.run(it[0], it[1], it[2], i))
    })()
  }
  const tiers = db.prepare(`SELECT COUNT(*) AS n FROM redemption_tiers`).get() as { n: number }
  if (tiers.n === 0) {
    const ins = db.prepare(`INSERT INTO redemption_tiers (name, cost, sort_order) VALUES (?, ?, ?)`)
    const items: Array<[string, number, number]> = [
      ['看动画片30分钟', 30, 0],
      ['玩平板30分钟', 30, 1],
      ['买一个小零食', 10, 2],
      ['周末去公园玩', 40, 3],
    ]
    db.transaction(() => {
      items.forEach((it, i) => ins.run(it[0], it[1], i))
    })()
  }
}