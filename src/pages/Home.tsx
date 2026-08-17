import { Link } from 'react-router-dom'
import { api } from '../api'
import { useSyncData } from '../hooks'

export default function Home() {
  const infoRes = useSyncData(() => api.info(), ['settings-changed'])
  const nickname = infoRes.data?.nickname ?? '皮卡皮卡'

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-mascot">⚡</div>
        <div className="home-title">学习小管家</div>
        <p className="home-sub">{nickname}，今天也要认真完成学习任务哦！</p>
        <div className="home-actions">
          <Link to="/child" className="home-btn child">
            <span className="home-btn-icon">🎒</span>
            <span>
              <b>开始学习</b>
              <small>孩子打卡</small>
            </span>
          </Link>
          <Link to="/parent" className="home-btn parent">
            <span className="home-btn-icon">🔒</span>
            <span>
              <b>家长入口</b>
              <small>布置与查看</small>
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
