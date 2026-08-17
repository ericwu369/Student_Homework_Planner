import express from 'express'
import type { DB } from './db.js'
import type { Hub } from './realtime.js'
import { registerRoutes } from './routes/index.js'

export function createApp(db: DB, hub: Hub): express.Express {
  const app = express()
  app.use(express.json())
  registerRoutes(app, db, hub)
  return app
}