import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: 'home',         label: 'Home' },
  { to: 'storefront',   label: 'Storefront' },
  { to: 'orders',       label: 'Orders' },
  { to: 'procurement',  label: 'Procurement' },
  { to: 'inventory',    label: 'Inventory' },
  { to: 'watchlist',    label: 'Watchlist' },
  { to: 'shop-profile', label: 'Shop profile' },
  { to: 'analytics',    label: 'Analytics' },
  { to: 'reviews',      label: 'Reviews' },
  { to: 'payouts',      label: 'Payouts' },
]

export default function VendorLayout({ user, onLogout }) {
  return (
    <div className="vendor-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, padding: 16, borderRight: '1px solid #eee' }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>{user?.fullName || 'Vendor'}</div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
            display: 'block', padding: '8px 12px', borderRadius: 6,
            background: isActive ? '#eef' : 'transparent', textDecoration: 'none', color: '#222',
          })}>{n.label}</NavLink>
        ))}
        <button onClick={onLogout} style={{ marginTop: 24 }}>Log out</button>
      </nav>
      <main style={{ flex: 1 }}><Outlet /></main>
    </div>
  )
}
