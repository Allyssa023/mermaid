import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { LoginPage, RoleSetupPage } from './pages/LoginPage'
import FishermanDashboard from './fisherman/FishermanDashboard'
import BuyerDashboard from './buyer/BuyerDashboard'
import AdminDashboard from './AdminDashboard'
import VendorDashboard from './vendor/VendorDashboard'
import PublicShop from './buyer/PublicShop'

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

  const pathMatch = window.location.pathname.match(/^\/shop\/(.+)/)
  if (pathMatch) return <PublicShop vendorIdOrSlug={pathMatch[1]} />

  if (!user) return <><LoginPage /><ThemeToggle /></>

  if (user.role === 'FISHERMAN') {
    return (
      <>
        <BrowserRouter>
          <FishermanDashboard user={user} onLogout={logout} />
        </BrowserRouter>
        <ThemeToggle />
      </>
    )
  }
  if (user.role === 'ADMIN') {
    return <><AdminDashboard user={user} token={null} onLogout={logout} /><ThemeToggle /></>
  }
  if (user.role === 'VENDOR') {
    return (
      <>
        <BrowserRouter>
          <VendorDashboard user={user} onLogout={logout} />
        </BrowserRouter>
        <ThemeToggle />
      </>
    )
  }
  if (user.role === 'BUYER') {
    return (
      <CartProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <BuyerDashboard user={user} token={null} onLogout={logout} />
          </BrowserRouter>
          <ThemeToggle />
        </FavoritesProvider>
      </CartProvider>
    )
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

