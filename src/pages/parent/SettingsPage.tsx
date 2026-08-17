import { useState } from 'react'
import { api } from '../../api'
import { useSyncData } from '../../hooks'
import { ConnectionBadge } from '../../components/ConnectionBadge'

export default function SettingsPage() {
  const infoRes = useSyncData(() => api.info(), [])

  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const [nickname, setNickname] = useState('')
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [nickBusy, setNickBusy] = useState(false)

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setPinMsg(null)
    try {
      await api.changePin(oldPin, newPin)
      setPinMsg({ ok: true, text: '密码已修改' })
      setOldPin('')
      setNewPin('')
    } catch (ex) {
      setPinMsg({ ok: false, text: (ex as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const saveNickname = async (e: React.FormEvent) => {
    e.preventDefault()
    setNickBusy(true)
    setNickMsg(null)
    try {
      await api.saveNickname(nickname)
      setNickMsg({ ok: true, text: '称呼已更新' })
    } catch (ex) {
      setNickMsg({ ok: false, text: (ex as Error).message })
    } finally {
      setNickBusy(false)
    }
  }

  const info = infoRes.data

  const displayedNickname = nickname || (info && info.nickname) || '皮卡皮卡'

  return (
    <div className="pad-page">
      <div className="page-head">
        <div>
          <h2>设置</h2>
          <p className="hint">称呼与密码</p>
        </div>
        <ConnectionBadge status={infoRes.status} />
      </div>

      <section className="section">
        <h3 className="section-title">🧒 孩子称呼</h3>
        <div className="card panel">
          <form onSubmit={saveNickname} className="pin-form">
            <input className="input" type="text" maxLength={12} placeholder="如：皮卡皮卡" value={displayedNickname} onChange={(e) => setNickname(e.target.value)} />
            <button className="btn btn-primary" disabled={nickBusy}>{nickBusy ? '…' : '保存称呼'}</button>
          </form>
          <p className="hint">孩子端欢迎语会使用该称呼。</p>
          {nickMsg && <div className={`error-box ${nickMsg.ok ? 'ok-box' : ''}`}>{nickMsg.text}</div>}
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">📶 局域网访问地址</h3>
        <div className="card panel">
          {info ? (
            <div className="info-rows">
              <div className="info-row">
                <span className="info-key">电脑本机</span>
                <code>http://localhost:{info.port}</code>
              </div>
              {info.lanIps.map((ip) => (
                <div className="info-row" key={ip}>
                  <span className="info-key">平板访问</span>
                  <code>http://{ip}:{info.port}</code>
                </div>
              ))}
              <p className="hint">平板打开上面的地址后，点"开始学习"即可。需与电脑连接同一 WiFi。</p>
            </div>
          ) : (
            <span className="spin" />
          )}
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">🔒 修改家长密码</h3>
        <div className="card panel">
          <form onSubmit={changePin} className="pin-form">
            <input className="input" type="password" inputMode="numeric" maxLength={6} placeholder="原密码" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} />
            <input className="input" type="password" inputMode="numeric" maxLength={6} placeholder="新密码（4-6位数字）" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
            <button className="btn btn-primary" disabled={busy || newPin.length < 4}>{busy ? '…' : '修改密码'}</button>
          </form>
          {pinMsg && <div className={`error-box ${pinMsg.ok ? 'ok-box' : ''}`}>{pinMsg.text}</div>}
        </div>
      </section>
    </div>
  )
}