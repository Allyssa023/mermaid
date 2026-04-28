import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { LoginPage, RoleSetupPage } from './pages/LoginPage'
import FishermanDashboard from './FishermanDashboard'
import BuyerDashboard from './BuyerDashboard'
import AdminDashboard from './AdminDashboard'
import VendorDashboard from './VendorDashboard'

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

function AppInner() {
  const { user, loading, logout } = useAuth()

  if (loading) return null

  if (!user) return <><LoginPage /><ThemeToggle /></>

  if (user.role === 'FISHERMAN') {
    return <><FishermanDashboard user={user} token={null} onLogout={logout} /><ThemeToggle /></>
  }
  if (user.role === 'ADMIN') {
    return <><AdminDashboard user={user} token={null} onLogout={logout} /><ThemeToggle /></>
  }
  if (user.role === 'VENDOR') {
    return <><VendorDashboard user={user} token={null} onLogout={logout} /><ThemeToggle /></>
  }
  if (user.role === 'BUYER') {
    return <><BuyerDashboard user={user} token={null} onLogout={logout} /><ThemeToggle /></>
  }

  if (!user.role) return <><RoleSetupPage /><ThemeToggle /></>

  logout()
  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  )
}

