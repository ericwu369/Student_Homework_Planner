import { Navigate, Route, Routes } from 'react-router-dom'
import './styles/parent.css'
import './styles/child.css'
import Home from './pages/Home'
import ParentGate from './pages/parent/ParentGate'
import TodayPage from './pages/parent/TodayPage'
import BoardPage from './pages/parent/BoardPage'
import PoolPage from './pages/parent/PoolPage'
import RewardsPage from './pages/parent/RewardsPage'
import StatsPage from './pages/parent/StatsPage'
import SettingsPage from './pages/parent/SettingsPage'
import ChildHome from './pages/child/ChildHome'
import ChildRedeem from './pages/child/ChildRedeem'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/child" element={<ChildHome />} />
      <Route path="/child/redeem" element={<ChildRedeem />} />
      <Route path="/parent" element={<ParentGate />}>
        <Route index element={<Navigate to="/parent/today" replace />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="pool" element={<PoolPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}