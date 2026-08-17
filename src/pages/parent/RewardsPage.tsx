import { useState } from 'react'
import { api } from '../../api'
import { useSyncData } from '../../hooks'
import type { RedeemStatus } from '../../types'
import { ConnectionBadge } from '../../components/ConnectionBadge'

const STATUS_TEXT: Record<RedeemStatus, string> = { pending: '待审批', approved: '已兑换', rejected: '已拒绝' }

function TierRow({ id, name, cost, enabled, rank, refresh }: { id: number; name: string; cost: number; enabled: boolean; rank: number; refresh: () => void }) {
  const [nm, setNm] = useState(name)
  const [cst, setCst] = useState(String(cost))
  const [busy, setBusy] = useState(false)
  const dirty = nm !== name || Number(cst || 0) !== cost

  const save = async () => {
    setBusy(true)
    try {
      await api.updateTier(id, { name: nm, cost: Number(cst || 0), sort_order: rank })
      refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const toggleEnabled = async () => {
    await api.updateTier(id, { enabled: !enabled })
    refresh()
  }

  return (
    <div className={`tier-row${enabled ? '' : ' disabled'}`}>
      <input className="input tier-name" value={nm} onChange={(e) => setNm(e.target.value)} />
      <label className="pool-row-num">
        <input className="input" inputMode="numeric" value={cst} onChange={(e) => setCst(e.target.value.replace(/\D/g, ''))} />
        <span>积分</span>
      </label>
      <button className={`btn btn-sm ${enabled ? 'btn-success' : ''}`} onClick={toggleEnabled}>
        {enabled ? '启用' : '停用'}
      </button>
      <button className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>
        {busy ? '…' : '保存'}
      </button>
      <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('删除该奖励档位？')) { await api.deleteTier(id); refresh() } }}>
        删除
      </button>
    </div>
  )
}

export default function RewardsPage() {
  const pointsRes = useSyncData(() => api.points(), ['points-changed'])
  const tiersRes = useSyncData(() => api.tiers(), ['tiers-changed'])
  const redeemRes = useSyncData(() => api.redeem(), ['redeem-changed', 'points-changed'])

  const [name, setName] = useState('')
  const [cost, setCost] = useState('20')
  const [busy, setBusy] = useState(false)

  const points = pointsRes.data
  const tiers = tiersRes.data ?? []
  const requests = redeemRes.data ?? []
  const pending = requests.filter((r) => r.status === 'pending')

  const addTier = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await api.createTier({ name: name.trim(), cost: Number(cost || 0) })
      setName('')
      tiersRes.refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const adjust = async () => {
    const amount = Number(prompt('手动调整积分（输入正数加分、负数扣分）：', '0'))
    if (!amount || !Number.isFinite(amount)) return
    const reason = prompt('调整原因：') || '手动调整'
    try {
      await api.adjustPoints(Math.round(amount), reason.trim())
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const err = pointsRes.error || tiersRes.error || redeemRes.error

  return (
    <div className="pad-page">
      <div className="page-head">
        <div>
          <h2>积分与奖励</h2>
          <p className="hint">孩子完成任务得积分，攒够了来兑换奖励（家长审批）</p>
        </div>
        <ConnectionBadge status={pointsRes.status} />
      </div>

      {err && <div className="error-box">{err}</div>}

      <div className="mini-stats">
        <div className="card stat-card"><span className="stat-label">⭐ 当前积分</span><b className="stat-value">{points ? points.balance : '…'}</b></div>
        <div className="card stat-card"><span className="stat-label">累计获得</span><b className="stat-value">{points ? points.earnedTotal : '…'}</b></div>
        <div className="card stat-card">
          <span className="stat-label">待审批申请</span>
          <b className="stat-value" style={{ color: pending.length ? 'var(--danger)' : undefined }}>{pending.length}</b>
        </div>
        <div className="card stat-card actions-card">
          <button className="btn btn-sm" onClick={adjust}>手动调分</button>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h3 className="section-title">🎁 奖励档位</h3>
        </div>
        <div className="card pool-add card">
          <input className="input tier-name" placeholder="奖励名称，如：喝一杯果汁" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTier()} />
          <label className="pool-row-num"><input className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ''))} /><span>积分</span></label>
          <button className="btn btn-primary" disabled={!name.trim() || busy} onClick={addTier}>{busy ? '…' : '＋ 添加档位'}</button>
        </div>
        {tiers.length === 0 && <div className="empty"><span className="big">🎁</span>还没有奖励档位</div>}
        {tiers.map((t, i) => (
          <div className="card tier-row-wrap" key={t.id}>
            <TierRow id={t.id} name={t.name} cost={t.cost} enabled={!!t.enabled} rank={i} refresh={tiersRes.refresh} />
          </div>
        ))}
      </section>

      <section className="section">
        <h3 className="section-title">📨 兑换申请</h3>
        {requests.length === 0 && <div className="empty"><span className="big">📭</span>孩子还没有提交兑换申请</div>}
        {requests.map((r) => (
          <div className="card req-row" key={r.id}>
            <div className="req-main">
              <span className="req-name">{r.tier_name}</span>
              <span className="req-meta">{r.cost} 积分 · 申请于 {r.requested_at?.replace('T', ' ').slice(0, 16)}</span>
            </div>
            {r.status === 'pending' ? (
              <div className="req-ops">
                <button className="btn btn-success btn-sm" onClick={async () => {
                  try { await api.approveRedeem(r.id) } catch (e) { alert((e as Error).message) }
                }}>批准</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { await api.rejectRedeem(r.id) }}>拒绝</button>
              </div>
            ) : (
              <span className={`chip ${r.status === 'approved' ? 'done' : ''}`}>{STATUS_TEXT[r.status]}{r.decided_at ? ` ${r.decided_at.slice(11, 16)}` : ''}</span>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}