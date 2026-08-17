import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { api } from '../../api'
import { useSyncData } from '../../hooks'
import type { RedeemStatus } from '../../types'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { Modal } from '../../components/Modal'

const STATUS: Record<RedeemStatus, { text: string; cls: string }> = {
  pending: { text: '等待家长批准', cls: 'pending' },
  approved: { text: '已兑换 ✓', cls: 'approved' },
  rejected: { text: '被拒绝', cls: 'rejected' },
}

export default function ChildRedeem() {
  const pointsRes = useSyncData(() => api.points(), ['points-changed'])
  const tiersRes = useSyncData(() => api.tiers(), ['tiers-changed'])
  const redeemRes = useSyncData(() => api.redeem(), ['redeem-changed', 'points-changed'])
  const infoRes = useSyncData(() => api.info(), ['settings-changed'])

  const nickname = infoRes.data?.nickname ?? '皮卡皮卡'

  const [confirmTier, setConfirmTier] = useState<{ id: number; name: string; cost: number } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const points = pointsRes.data
  const tiers = (tiersRes.data ?? []).filter((t) => t.enabled)
  const requests = redeemRes.data ?? []
  const myPending = requests.filter((r) => r.status === 'pending')

  const submit = async () => {
    if (!confirmTier) return
    setBusy(true)
    setMsg(null)
    try {
      await api.submitRedeem(confirmTier.id)
      setMsg({ ok: true, text: '已提交申请，等爸爸妈妈批准哦！' })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
      setConfirmTier(null)
    }
  }

  return (
    <div className="child-page">
      <header className="child-header">
        <div className="child-brand">
          <span className="child-brand-ico">🎁</span>
          <div>
            <b>奖励站</b>
            <small>{nickname}，攒积分换奖励！</small>
          </div>
        </div>
        <div className="child-header-right">
          <span className="child-balance">
            ⭐ <b>{points ? points.balance : '…'}</b> 分
          </span>
        </div>
      </header>

      <main className="child-main">
        {msg && <div className={`error-box ${msg.ok ? 'ok-box' : ''}`}>{msg.text}</div>}
        {myPending.length > 0 && (
          <div className="redeem-pending">
            有 {myPending.length} 个奖励在等家长批准，耐心等一下哦
          </div>
        )}

        {tiers.length === 0 && (
          <div className="child-empty">
            <div className="child-empty-ico">🎁</div>
            <p>奖励站还没有奖励</p>
            <small>让爸爸妈妈在家长端添加吧</small>
          </div>
        )}

        <div className="redeem-grid">
          {tiers.map((t) => {
            const affordable = points ? points.balance >= t.cost : false
            return (
              <div className={`card redeem-card${affordable ? ' affordable' : ''}`} key={t.id}>
                <div className="redeem-cost">
                  <span className="rc-ico">⭐</span>
                  <b>{t.cost}</b>
                  <small>积分</small>
                </div>
                <h3 className="redeem-name">{t.name}</h3>
                <button
                  className="btn btn-lg redeem-btn"
                  disabled={!affordable}
                  onClick={() => setConfirmTier({ id: t.id, name: t.name, cost: t.cost })}
                >
                  {affordable ? '我要兑换' : '积分不够'}
                </button>
                {!affordable && points && (
                  <small className="redeem-need">还差 {t.cost - points.balance} 分</small>
                )}
              </div>
            )
          })}
        </div>

        {requests.length > 0 && (
          <section className="redeem-history card">
            <h3>我的申请记录</h3>
            {requests.map((r) => (
              <div className="req-mini" key={r.id}>
                <span className="req-mini-name">{r.tier_name}</span>
                <span className={`chip ${STATUS[r.status].cls}`}>{STATUS[r.status].text}</span>
              </div>
            ))}
          </section>
        )}
      </main>

      <nav className="child-nav">
        <NavLink to="/child" end className={({ isActive }) => 'child-nav-item' + (isActive ? ' active' : '')}>
          <span className="cn-ico">🎯</span>
          今日任务
        </NavLink>
        <NavLink to="/child/redeem" className={({ isActive }) => 'child-nav-item' + (isActive ? ' active' : '')}>
          <span className="cn-ico">🎁</span>
          奖励站
        </NavLink>
      </nav>

      <Modal
        open={!!confirmTier}
        title="兑换奖励"
        onClose={() => setConfirmTier(null)}
        footer={
          <>
            <button className="btn" onClick={() => setConfirmTier(null)}>
              再想想
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={submit}>
              {busy ? '提交中…' : '确定兑换'}
            </button>
          </>
        }
      >
        <div className="confirm-redeem">
          <p>
            确认用 <b>{confirmTier?.cost}</b> 分兑换 <b>「{confirmTier?.name}」</b> 吗？
          </p>
          <p className="hint">提交后需要爸爸妈妈批准，批准后才会扣除积分。</p>
        </div>
      </Modal>
    </div>
  )
}