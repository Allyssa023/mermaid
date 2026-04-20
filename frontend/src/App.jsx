import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage, RoleSetupPage } from './pages/LoginPage'
import FishermanDashboard from './FishermanDashboard'
import AdminDashboard from './AdminDashboard'
import VendorDashboard from './VendorDashboard'

function AppInner() {
  const { user, loading, logout } = useAuth()

  if (loading) return null

  if (!user) return <LoginPage />

  if (user.role === 'FISHERMAN') {
    return <FishermanDashboard user={user} token={null} onLogout={logout} />
  }
  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} token={null} onLogout={logout} />
  }
  if (user.role === 'VENDOR') {
    return <VendorDashboard user={user} token={null} onLogout={logout} />
  }

  if (!user.role) return <RoleSetupPage />

  logout()
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
