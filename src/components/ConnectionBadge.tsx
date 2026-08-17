import type { WsStatus } from '../hooks'

const TEXT: Record<WsStatus, string> = {
  online: '已实时同步',
  connecting: '正在连接…',
  reconnecting: '重连中…',
  offline: '离线',
}

export function ConnectionBadge({ status, className = '' }: { status: WsStatus; className?: string }) {
  return (
    <span className={`conn ${className}`}>
      <span className={`conn-dot ${status}`} />
      {TEXT[status]}
    </span>
  )
}