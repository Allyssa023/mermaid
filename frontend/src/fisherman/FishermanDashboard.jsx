import { Routes, Route, Navigate } from 'react-router-dom'
import '../design-system.css'
import '../handoff.css'
import FishermanLayout from './FishermanLayout'
import Home         from './Home'
import Trips        from './Trips'
import CatchAlerts  from './CatchAlerts'
import Orders       from './Orders'
import Procurement  from './Procurement'
import Marketplace  from './Marketplace'
import Earnings     from './Earnings'
import Messages     from './Messages'
import Profile      from './Profile'

export default function FishermanDashboard({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/fisherman" element={<FishermanLayout user={user} onLogout={onLogout} />}>
        <Route index element={<Navigate to="/fisherman/home" replace />} />
        <Route path="home"         element={<Home />} />
        <Route path="trips"        element={<Trips />} />
        <Route path="catch-alerts" element={<CatchAlerts />} />
        <Route path="orders"       element={<Orders />} />
        <Route path="procurement"  element={<Procurement />} />
        <Route path="marketplace"  element={<Marketplace />} />
        <Route path="earnings"     element={<Earnings />} />
        <Route path="messages"     element={<Messages />} />
        <Route path="profile"      element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/fisherman/home" replace />} />
    </Routes>
  )
}
