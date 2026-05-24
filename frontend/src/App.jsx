import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { queryClient } from './lib/queryClient'
import { LoginPage, RoleSetupPage } from './pages/LoginPage'
import FishermanDashboard from './fisherman/FishermanDashboard'
import BuyerDashboard from './buyer/BuyerDashboard'
import AdminDashboard from './AdminDashboard'
import VendorDashboard from './vendor/VendorDashboard'
import PublicShop from './buyer/PublicShop'

import { StompProvider } from './context/StompContext'

function AppInner() {
  const { user, loading, logout } = useAuth()

  if (loading) return null

  const pathMatch = window.location.pathname.match(/^\/shop\/(.+)/)
  if (pathMatch) return <PublicShop vendorIdOrSlug={pathMatch[1]} />

  if (!user) return <LoginPage />

  if (user.role === 'FISHERMAN') {
    return (
      <BrowserRouter>
        <FishermanDashboard user={user} onLogout={logout} />
      </BrowserRouter>
    )
  }
  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} token={null} onLogout={logout} />
  }
  if (user.role === 'VENDOR') {
    return (
      <BrowserRouter>
        <VendorDashboard user={user} onLogout={logout} />
      </BrowserRouter>
    )
  }
  if (user.role === 'BUYER') {
    return (
      <CartProvider>
        <FavoritesProvider>
          <StompProvider>
            <BrowserRouter>
              <BuyerDashboard user={user} token={null} onLogout={logout} />
            </BrowserRouter>
          </StompProvider>
        </FavoritesProvider>
      </CartProvider>
    )
  }

  if (!user.role) return <RoleSetupPage />

  logout()
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

