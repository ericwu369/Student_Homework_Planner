import { useEffect, useRef, useState } from 'react'

export type WsStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'

export function useRealtime(handler: (event: string, payload: Record<string, unknown>) => void): WsStatus {
  const [status, setStatus] = useState<WsStatus>('connecting')
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    let ws: WebSocket | null = null
    let retries = 0
    let closed = false
    let timer: number | undefined

    const connect = () => {
      setStatus(retries === 0 ? 'connecting' : 'reconnecting')
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/ws`)
      ws.onopen = () => {
        retries = 0
        setStatus('online')
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { event: string; payload: Record<string, unknown> }
          handlerRef.current(msg.event, msg.payload)
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        if (closed) return
        retries += 1
        setStatus('reconnecting')
        timer = window.setTimeout(connect, Math.min(1000 * 2 ** Math.min(retries, 6), 15000))
      }
      ws.onerror = () => {
        ws?.close()
      }
    }
    connect()
    return () => {
      closed = true
      if (timer) clearTimeout(timer)
      ws?.close()
    }
  }, [])

  return status
}

export function useSyncData<T>(
  fetcher: () => Promise<T>,
  watchEvents: string[] = [],
  key: string = ''
): { data: T | null; error: string | null; status: WsStatus; refresh: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = () => setNonce((n) => n + 1)

  useEffect(() => {
    let alive = true
    setError(null)
    fetcherRef
      .current()
      .then((d) => {
        if (alive) setData(d)
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, key])

  const status = useRealtime((event) => {
    if (watchEvents.includes(event)) refresh()
  })

  return { data, error, status, refresh }
}

export function todayStr(): string {
  const d = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export { dateStrFromOffset } from './lib/dates'