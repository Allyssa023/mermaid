import { Routes, Route, Navigate } from 'react-router-dom'
import '../design-system.css'
import '../handoff.css'
import VendorLayout from './VendorLayout'
import Home from './Home'
import StorefrontEditor from './StorefrontEditor'
import OrdersInbox from './OrdersInbox'
import ProcurementFeed from './ProcurementFeed'
import ProcurementCart from './ProcurementCart'
import ProcurementOrders from './ProcurementOrders'
import Inventory from './Inventory'
import Watchlist from './Watchlist'
import ShopProfile from './ShopProfile'
import Analytics from './Analytics'
import Reviews from './Reviews'
import Payouts from './Payouts'

export default function VendorDashboard({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/vendor" element={<VendorLayout user={user} onLogout={onLogout} />}>
        <Route index element={<Navigate to="/vendor/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="storefront" element={<StorefrontEditor />} />
        <Route path="orders" element={<OrdersInbox />} />
        <Route path="procurement" element={<ProcurementFeed />} />
        <Route path="procurement/cart" element={<ProcurementCart />} />
        <Route path="procurement/orders" element={<ProcurementOrders />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="shop-profile" element={<ShopProfile />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="payouts" element={<Payouts />} />
      </Route>
      <Route path="*" element={<Navigate to="/vendor/home" replace />} />
    </Routes>
  )
}
