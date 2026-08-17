import { Router } from 'express'
import type { DB } from '../db.js'
import type { Hub } from '../realtime.js'
import { authRoutes } from './auth.js'
import { taskRoutes } from './tasks.js'
import { extrasRoutes } from './extras.js'
import { tiersRoutes } from './tiers.js'
import { redeemRoutes } from './redeem.js'
import { pointsRoutes } from './points.js'
import { statsRoutes } from './stats.js'
import { settingsRoutes } from './settings.js'

export function registerRoutes(app: Router, db: DB, hub: Hub): void {
  const api = Router()
  authRoutes(api, db, hub)
  taskRoutes(api, db, hub)
  extrasRoutes(api, db, hub)
  tiersRoutes(api, db, hub)
  redeemRoutes(api, db, hub)
  pointsRoutes(api, db, hub)
  statsRoutes(api, db, hub)
  settingsRoutes(api, db, hub)
  app.use('/api', api)
}