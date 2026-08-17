import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../../api'
import { useRealtime } from '../../hooks'
import { ConnectionBadge } from '../../components/ConnectionBadge'

const NAV = [
  { to: 'today', icon: '🗓️', label: '今日安排' },
  { to: 'board', icon: '📊', label: '实时看板' },
  { to: 'pool', icon: '🎨', label: '课外选项' },
  { to: 'rewards', icon: '⭐', label: '积分奖励' },
  { to: 'stats', icon: '📈', label: '统计报表' },
  { to: 'settings', icon: '⚙️', label: '设置' },
]

function PinForm({
  title,
  subtitle,
  mode,
  onSuccess,
}: {
  title: string
  subtitle: string
  mode: 'setup' | 'login'
  onSuccess: () => void
}) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      if (mode === 'setup') await api.setup(pin)
      else await api.login(pin)
      onSuccess()
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="parent-login-screen">
      <div className="login-card card">
        <div className="login-lock">🔒</div>
        <h2>{title}</h2>
        <p className="hint">{subtitle}</p>
        <form onSubmit={submit} className="login-form">
          <input
            className="input pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
          />
          {err && <div className="error-box">{err}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy || pin.length < 4}>
            {busy ? '请稍候…' : '进入家长端'}
          </button>
        </form>
        <Link to="/" className="login-back">
          ← 返回首页
        </Link>
      </div>
    </div>
  )
}

function ParentLayout() {
  const status = useRealtime(() => undefined)
  return (
    <div className="parent-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <b className="sidebar-brand-ico">⚡</b> 学习小管家
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={'/parent/' + n.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-ico">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ConnectionBadge status={status} />
          <button
            className="btn btn-sm"
            onClick={async () => {
              await api.logout().catch(() => undefined)
              location.reload()
            }}
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="parent-main">
        <Outlet />
      </main>
    </div>
  )
}

export default function ParentGate() {
  const [state, setState] = useState<'loading' | 'setup' | 'login' | 'ok'>('loading')

  useEffect(() => {
    api
      .me()
      .then((m) => setState(m.authed ? 'ok' : m.setupRequired ? 'setup' : 'login'))
      .catch(() => setState('login'))
  }, [])

  if (state === 'loading')
    return (
      <div className="parent-login-screen">
        <span className="spin" />
      </div>
    )
  if (state === 'ok') return <ParentLayout />
  if (state === 'setup')
    return (
      <PinForm
        title="设置家长密码"
        subtitle="首次使用，请设置 4-6 位数字密码（只有家长自己知道）"
        mode="setup"
        onSuccess={() => setState('ok')}
      />
    )
  return (
    <PinForm
      title="家长登录"
      subtitle="请输入家长密码"
      mode="login"
      onSuccess={() => setState('ok')}
    />
  )
}