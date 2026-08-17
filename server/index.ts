import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import { createApp } from './app.js'
import { openDb, PROJECT_ROOT } from './db.js'
import { seedIfEmpty } from './seed.js'
import { createHub, attachRealtime } from './realtime.js'
import { lanIps } from './util-net.js'

const PORT = parseInt(process.env.PORT || '8787', 10)

const db = openDb()
seedIfEmpty(db)
const { hub, clients } = createHub()
const app = createApp(db, hub)

const distDir = path.join(PROJECT_ROOT, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  console.log('[server] 未找到 dist 构建产物，页面将由开发模式提供（npm run dev）。')
}

const server = http.createServer(app)
attachRealtime(server, clients)

server.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('学习小管家 已启动')
  console.log(`  本机访问:  http://localhost:${PORT}`)
  for (const ip of lanIps()) {
    console.log(`  平板访问:  http://${ip}:${PORT}   (与电脑同一 WiFi)`)
  }
  console.log(`  家长入口:  /parent   孩子入口: /child`)
  console.log('')
})