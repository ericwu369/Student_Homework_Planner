import type { Server } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

export type Hub = {
  clientCount: () => number
  broadcast: (event: string, payload?: Record<string, unknown>) => void
  broadcastTaskDate: (date: string) => void
}

export function createHub(): { hub: Hub; clients: Set<WebSocket> } {
  const clients = new Set<WebSocket>()
  const hub: Hub = {
    clientCount: () => clients.size,
    broadcast: (event, payload = {}) => {
      const msg = JSON.stringify({ event, payload })
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg)
      }
    },
    broadcastTaskDate: (date) => {
      hub.broadcast('tasks-changed', { date })
    },
  }
  return { hub, clients }
}

export function attachRealtime(server: Server, clients: Set<WebSocket>): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' })
  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))
    ws.on('pong', () => undefined)
  })
  const heartbeat = setInterval(() => {
    for (const ws of [...clients]) {
      if (ws.readyState !== WebSocket.OPEN) {
        clients.delete(ws)
        ws.terminate()
      } else {
        ws.ping()
      }
    }
  }, 30000)
  wss.on('close', () => clearInterval(heartbeat))
  return wss
}