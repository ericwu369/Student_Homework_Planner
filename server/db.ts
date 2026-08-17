import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function defaultDbPath(): string {
  return process.env.DB_PATH || path.join(PROJECT_ROOT, 'data', 'app.db')
}

export function defaultSettings(): Record<string, string> {
  return {
    app_name: '学习小管家',
    nickname: '皮卡皮卡',
  }
}

const migrations: string[][] = [
  [
    `CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
    `CREATE TABLE extracurricular_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_minutes INTEGER NOT NULL DEFAULT 0,
      default_points INTEGER NOT NULL DEFAULT 5,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`,
    `CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('homework','extracurricular')),
      subject TEXT,
      content TEXT NOT NULL,
      minutes INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_seed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`,
    `CREATE INDEX idx_tasks_date ON tasks(date);`,
    `CREATE TABLE completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`,
    `CREATE TABLE points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref_type TEXT NOT NULL DEFAULT 'manual',
      ref_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`,
    `CREATE INDEX idx_ledger_created ON points_ledger(created_at);`,
    `CREATE TABLE redemption_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`,
    `CREATE TABLE redemption_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_id INTEGER NOT NULL REFERENCES redemption_tiers(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      requested_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`,
    `CREATE INDEX idx_requests_status ON redemption_requests(status);`,
  ],
  [
    // 学校作业不再积分：历史作业积分清零，账本中作业产生的记录一并清除
    `UPDATE tasks SET points = 0 WHERE kind = 'homework';`,
    `DELETE FROM points_ledger
      WHERE ref_type = 'task' AND ref_id IN (SELECT id FROM tasks WHERE kind = 'homework');`,
    `DELETE FROM settings WHERE key = 'subject_points';`,
  ],
]

export type DB = Database.Database

export function openDb(dbPath: string = defaultDbPath()): DB {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

export function getSchemaVersion(db: DB): number {
  const table = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`).get()
  if (!table) return 0
  const row = db.prepare(`SELECT value FROM settings WHERE key='schema_version'`).get() as
    | { value: string }
    | undefined
  return row ? parseInt(row.value, 10) : 0
}

export function migrate(db: DB): void {
  const current = getSchemaVersion(db)
  if (current >= migrations.length) return
  const apply = db.transaction(() => {
    let v = current
    for (; v < migrations.length; v++) {
      for (const sql of migrations[v]) db.exec(sql)
      db.prepare(
        `INSERT INTO settings (key, value) VALUES ('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run(String(v + 1))
      for (const [k, value] of Object.entries(defaultSettings())) {
        db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(k, value)
      }
    }
  })
  apply()
}