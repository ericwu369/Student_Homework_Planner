import { useState } from 'react'
import { api, type ExtraInput } from '../../api'
import { useSyncData } from '../../hooks'
import type { ExtraOption } from '../../types'
import { ConnectionBadge } from '../../components/ConnectionBadge'

function ExtraRow({
  item,
  onChange,
  onDelete,
  onToggle,
}: {
  item: ExtraOption
  onChange: (p: ExtraInput) => Promise<void>
  onDelete: () => Promise<void>
  onToggle: (enabled: boolean) => Promise<void>
}) {
  const [name, setName] = useState(item.name)
  const [minutes, setMinutes] = useState(String(item.default_minutes))
  const [points, setPoints] = useState(String(item.default_points))
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await onChange({ name, default_minutes: Number(minutes || 0), default_points: Number(points || 0) })
      setDirty(false)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`pool-row${item.enabled ? '' : ' disabled'}`}>
      <input
        className="input pool-row-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setDirty(true)
        }}
      />
      <label className="pool-row-num">
        <input className="input" inputMode="numeric" value={minutes} onChange={(e) => { setMinutes(e.target.value.replace(/\D/g, '')); setDirty(true) }} />
        <span>分钟</span>
      </label>
      <label className="pool-row-num">
        <input className="input" inputMode="numeric" value={points} onChange={(e) => { setPoints(e.target.value.replace(/\D/g, '')); setDirty(true) }} />
        <span>积分</span>
      </label>
      <button className={`btn btn-sm ${item.enabled ? 'btn-success' : ''}`} onClick={() => onToggle(!item.enabled)}>
        {item.enabled ? '已启用' : '已停用'}
      </button>
      <button className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>
        {busy ? '…' : '保存'}
      </button>
      <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('删除这个可选项？')) onDelete() }}>
        删除
      </button>
    </div>
  )
}

export default function PoolPage() {
  const res = useSyncData(() => api.extras(), ['extras-changed'])

  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('20')
  const [points, setPoints] = useState('5')
  const [busy, setBusy] = useState(false)

  const refresh = res.refresh
  const items = res.data ?? []

  const add = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await api.createExtra({ name: name.trim(), default_minutes: Number(minutes || 0), default_points: Number(points || 0) })
      setName('')
      refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const edit = async (id: number, p: ExtraInput) => {
    await api.updateExtra(id, p)
    refresh()
  }
  const toggle = async (id: number, enabled: boolean) => {
    await api.updateExtra(id, { enabled })
    refresh()
  }
  const remove = async (id: number) => {
    await api.deleteExtra(id)
    refresh()
  }

  if (res.error) return <div className="error-box">{res.error}</div>

  return (
    <div className="pad-page">
      <div className="page-head">
        <div>
          <h2>课外可选项池</h2>
          <p className="hint">可长期复用的课外学习选项，布置每日任务时从这里挑选</p>
        </div>
        <ConnectionBadge status={res.status} />
      </div>

      <div className="card pool-add card">
        <input className="input pool-row-name" placeholder="新选项名称，如：钢琴练习" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <label className="pool-row-num"><input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} /><span>分钟</span></label>
        <label className="pool-row-num"><input className="input" inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value.replace(/\D/g, ''))} /><span>积分</span></label>
        <button className="btn btn-primary" disabled={!name.trim() || busy} onClick={add}>{busy ? '…' : '＋ 添加'}</button>
      </div>

      {items.length === 0 && <div className="empty"><span className="big">🎨</span>还没有可选项，先添加一个吧</div>}
      {items.map((it) => (
        <div className="card pool-row-wrap" key={it.id} style={{ opacity: it.enabled ? 1 : 0.55 }}>
          <ExtraRow item={it} onChange={(p) => edit(it.id, p)} onToggle={(en) => toggle(it.id, en)} onDelete={() => remove(it.id)} />
        </div>
      ))}
    </div>
  )
}