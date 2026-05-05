import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { apiGet } from '../api'
import { useCart } from '../context/CartContext'
import BuyerLayout from './BuyerLayout'
import Home from './Home'
import Marketplace from './Marketplace'
import ListingDetailView, { VendorStorefrontView } from './ListingDetail'
import Cart from './Cart'
import CheckoutView, { InstantCheckoutView } from './Checkout'
import Orders from './Orders'
import Favorites from './Favorites'
import Profile from './Profile'
import MessagesRoute from './components/MessagesRoute'

export default function BuyerDashboard({ user, onLogout }) {
  const [badges, setBadges]       = useState({ orders: 0, messages: 0 })
  const [quickOrderListing, setQuickOrderListing] = useState(null)
  const { cart } = useCart()
  const railBadges = { ...badges, cart: cart.itemCount }

  function loadPendingBadge() {
    apiGet('/buyer/orders?status=PENDING')
      .then(d => {
        const arr = d?.content || d || []
        setBadges(prev => ({ ...prev, orders: arr.length }))
      })
      .catch(() => {})
  }

  useEffect(() => { loadPendingBadge() }, [])

  function handleOrderSuccess() {
    setQuickOrderListing(null)
    loadPendingBadge()
  }

  return (
    <Routes>
      <Route element={
        <BuyerLayout
          user={user}
          onLogout={onLogout}
          badges={railBadges}
          quickOrderListing={quickOrderListing}
          setQuickOrderListing={setQuickOrderListing}
          onOrderSuccess={handleOrderSuccess}
        />
      }>
        <Route path="/buyer" element={<Navigate to="/buyer/dashboard" replace />} />
        <Route path="/buyer/dashboard" element={
          <Home user={user} onOrderListing={setQuickOrderListing} />
        } />
        <Route path="/buyer/browse" element={<Marketplace />} />
        <Route path="/buyer/listing/:listingId" element={<ListingDetailView />} />
        <Route path="/buyer/vendor/:vendorId" element={<VendorStorefrontView />} />
        <Route path="/buyer/cart" element={<Cart />} />
        <Route path="/buyer/checkout" element={<CheckoutView />} />
        <Route path="/buyer/instant-checkout" element={<InstantCheckoutView />} />
        <Route path="/buyer/orders" element={<Orders />} />
        <Route path="/buyer/orders/:orderId" element={<Orders />} />
        <Route path="/buyer/saved" element={<Favorites />} />
        <Route path="/buyer/messages" element={<MessagesRoute user={user} />} />
        <Route path="/buyer/profile" element={<Profile user={user} />} />
        <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
