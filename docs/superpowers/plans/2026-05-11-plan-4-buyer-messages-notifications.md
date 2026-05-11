# Plan 4: Buyer Domain + Messages + Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the missing `BuyerHomeController` backend endpoint, create all `buyer/api/` frontend modules, wire all buyer pages, build the real-time WebSocket messages client, and connect all three roles' notification bells to the live API.

**Architecture:** Buyer has no `api/` folder yet — all modules must be created. `BuyerHomeController` aggregates order stats + fresh listings + activity into a single `/buyer/home` response. Messages uses STOMP over `/ws-chat` (already configured in `WebSocketConfig`); the React hook is a singleton. Notifications use React Query with `refetchInterval: 30_000`.

**Tech Stack:** React 18, @tanstack/react-query v5, @stomp/stompjs, Vitest, Spring Boot

**Spec:** `docs/superpowers/specs/2026-05-11-mock-to-real-data-integration-design.md` — Sections D14–D17

**Prerequisite:** Plans 1, 2, and 3 must be complete.

---

## File Map

| Action | File |
|---|---|
| **Create (backend)** | `backend/src/main/java/com/mermaid/app/controller/BuyerHomeController.java` |
| Create | `frontend/src/buyer/api/home.js` |
| Create | `frontend/src/buyer/api/marketplace.js` |
| Create | `frontend/src/buyer/api/orders.js` |
| Create | `frontend/src/buyer/api/cart.js` |
| Create | `frontend/src/buyer/api/favorites.js` |
| Create | `frontend/src/buyer/api/profile.js` |
| Modify | `frontend/src/buyer/Home.jsx` |
| Modify | `frontend/src/buyer/Marketplace.jsx` |
| Modify | `frontend/src/buyer/ListingDetail.jsx` |
| Modify | `frontend/src/buyer/Orders.jsx` |
| Modify | `frontend/src/buyer/Cart.jsx` |
| Modify | `frontend/src/buyer/Checkout.jsx` |
| Modify | `frontend/src/buyer/Favorites.jsx` |
| Modify | `frontend/src/buyer/Profile.jsx` |
| Create | `frontend/src/api/notifications.js` |
| Modify | `frontend/src/fisherman/components/NotificationsBell.jsx` |
| Modify | `frontend/src/vendor/components/NotificationsBell.jsx` |
| Modify | `frontend/src/buyer/components/NotificationsBell.jsx` |
| Create | `frontend/src/hooks/useWebSocket.js` |
| Create | `frontend/src/api/messages.js` |
| Modify | `frontend/src/fisherman/Messages.jsx` |
| Modify | `frontend/src/vendor/Messages.jsx` (if exists) |

---

### Task 1: Implement BuyerHomeController (backend)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/BuyerHomeController.java`

The `/buyer/home` endpoint aggregates data from existing services into a single response to power the buyer dashboard.

- [ ] **Step 1: Check existing buyer services**

Verify these exist before implementing:
```bash
ls backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java
ls backend/src/main/java/com/mermaid/app/service/BuyerMarketplaceService.java
ls backend/src/main/java/com/mermaid/app/service/NotificationService.java
```

If any are missing, check `BuyerOrderController` to see which service it injects and use the same.

- [ ] **Step 2: Add BuyerHomeResponse DTO to api.yaml**

Open `backend/src/main/resources/openapi/api.yaml`. In the `components/schemas` section, add:

```yaml
    BuyerHomeResponse:
      type: object
      properties:
        orderStats:
          type: object
          properties:
            pending:   { type: integer }
            confirmed: { type: integer }
            recent:    { type: integer }
        freshListings:
          type: array
          items:
            $ref: '#/components/schemas/StorefrontListing'
        recentOrders:
          type: array
          items:
            $ref: '#/components/schemas/BuyerOrder'
        unreadNotifications:
          type: integer
```

Add the endpoint under the buyer paths section:

```yaml
  /buyer/home:
    get:
      operationId: getBuyerHome
      summary: Get buyer home dashboard
      tags: [Buyer]
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Buyer home data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BuyerHomeResponse'
```

- [ ] **Step 3: Regenerate sources**

```bash
cd backend && ./mvnw generate-sources
```

Expected: `BuyerHomeResponse` model and `BuyerApi` interface updated.

- [ ] **Step 4: Implement BuyerHomeController**

```java
package com.mermaid.app.controller;

import com.mermaid.app.model.BuyerHomeResponse;
import com.mermaid.app.service.BuyerOrderService;
import com.mermaid.app.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/buyer/home")
public class BuyerHomeController {

    private final BuyerOrderService buyerOrderService;
    private final NotificationService notificationService;

    public BuyerHomeController(BuyerOrderService buyerOrderService,
                                NotificationService notificationService) {
        this.buyerOrderService = buyerOrderService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<BuyerHomeResponse> getBuyerHome() {
        Long buyerId = getCurrentUserId();

        // Order stats
        int pending   = buyerOrderService.countByStatus(buyerId, "PENDING");
        int confirmed = buyerOrderService.countByStatus(buyerId, "CONFIRMED");
        int recent    = buyerOrderService.countRecent(buyerId, 30);

        // Recent orders (last 5)
        var recentOrders = buyerOrderService.listRecentOrders(buyerId, 5);

        // Unread notification count
        int unread = notificationService.getUnreadCount(buyerId);

        BuyerHomeResponse.OrderStats stats = new BuyerHomeResponse.OrderStats();
        stats.setPending(pending);
        stats.setConfirmed(confirmed);
        stats.setRecent(recent);

        BuyerHomeResponse response = new BuyerHomeResponse();
        response.setOrderStats(stats);
        response.setRecentOrders(recentOrders);
        response.setUnreadNotifications(unread);

        return ResponseEntity.ok(response);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Long.parseLong(auth.getName());
    }
}
```

Note: If `BuyerOrderService` doesn't have `countByStatus` or `countRecent` methods, add them — they are simple `repository.countByBuyerIdAndStatus(...)` calls.

- [ ] **Step 5: Build and verify**

```bash
cd backend && ./mvnw clean package -DskipTests
```

Expected: BUILD SUCCESS.

- [ ] **Step 6: Test the endpoint manually**

Start backend, log in as BUYER, then:

```bash
curl -b cookies.txt http://localhost:8080/api/buyer/home
```

Expected: JSON with `orderStats`, `recentOrders`, `unreadNotifications`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/BuyerHomeController.java backend/src/main/resources/openapi/api.yaml
git commit -m "feat(backend): add BuyerHomeController with /buyer/home dashboard endpoint"
```

---

### Task 2: Create all buyer/api/ modules

**Files:**
- Create: `frontend/src/buyer/api/home.js`
- Create: `frontend/src/buyer/api/marketplace.js`
- Create: `frontend/src/buyer/api/orders.js`
- Create: `frontend/src/buyer/api/cart.js`
- Create: `frontend/src/buyer/api/favorites.js`
- Create: `frontend/src/buyer/api/profile.js`

- [ ] **Step 1: Create home.js**

```js
// frontend/src/buyer/api/home.js
import { apiGet } from '../../api'
export const getBuyerHome = () => apiGet('/buyer/home')
```

- [ ] **Step 2: Create marketplace.js**

```js
// frontend/src/buyer/api/marketplace.js
import { apiGet } from '../../api'

const qs = (p) => { const s = new URLSearchParams(Object.entries(p).filter(([,v]) => v != null)).toString(); return s ? `?${s}` : '' }

export const browseListings   = (params = {})  => apiGet(`/buyer/marketplace${qs(params)}`)
export const getListingDetail = (id)            => apiGet(`/buyer/marketplace/${id}`)
export const getPublicShop    = (vendorIdOrSlug) => apiGet(`/shop/${vendorIdOrSlug}`)
```

- [ ] **Step 3: Create orders.js**

```js
// frontend/src/buyer/api/orders.js
import { apiGet } from '../../api'

export const listBuyerOrders  = (status) => apiGet(`/buyer/orders${status ? `?status=${status}` : ''}`)
export const getBuyerOrder    = (id)      => apiGet(`/buyer/orders/${id}`)
export const getBuyerTimeline = (id)      => apiGet(`/buyer/orders/${id}/timeline`)
```

- [ ] **Step 4: Create cart.js**

```js
// frontend/src/buyer/api/cart.js
import { apiGet, apiPost, apiPut, apiDelete } from '../../api'

export const getCart         = ()              => apiGet('/buyer/cart')
export const addToCart       = (body)          => apiPost('/buyer/cart/items', null, body)
export const updateCartItem  = (itemId, body)  => apiPut(`/buyer/cart/items/${itemId}`, null, body)
export const removeCartItem  = (itemId)        => apiDelete(`/buyer/cart/items/${itemId}`)
export const checkout        = (body)          => apiPost('/buyer/cart/checkout', null, body)
```

- [ ] **Step 5: Create favorites.js**

```js
// frontend/src/buyer/api/favorites.js
import { apiGet, apiPost, apiDelete } from '../../api'

export const listFavorites   = (targetType) => apiGet(`/buyer/favorites${targetType ? `?targetType=${targetType}` : ''}`)
export const saveFavorite    = (body)        => apiPost('/buyer/favorites', null, body)
export const removeFavorite  = (id)          => apiDelete(`/buyer/favorites/${id}`)
```

- [ ] **Step 6: Create profile.js**

```js
// frontend/src/buyer/api/profile.js
import { apiGet, apiPut } from '../../api'

export const getBuyerProfile    = ()     => apiGet('/buyer/profile')
export const updateBuyerProfile = (body) => apiPut('/buyer/profile', null, body)
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/buyer/api/
git commit -m "feat(buyer): create all buyer/api/ modules"
```

---

### Task 3: Wire all buyer pages

**Files:**
- Modify: `frontend/src/buyer/Home.jsx`
- Modify: `frontend/src/buyer/Marketplace.jsx`
- Modify: `frontend/src/buyer/ListingDetail.jsx`
- Modify: `frontend/src/buyer/Orders.jsx`
- Modify: `frontend/src/buyer/Cart.jsx`
- Modify: `frontend/src/buyer/Favorites.jsx`
- Modify: `frontend/src/buyer/Profile.jsx`

Apply the same pattern to each: remove all `const MOCK_*` / `const BUYER_*` blocks, import the relevant api module + React Query hooks + Skeleton + ApiError.

- [ ] **Step 1: Wire Home.jsx**

```jsx
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getBuyerHome } from './api/home'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const { user } = useAuth()
const homeQ = useQuery({ queryKey: ['buyer', 'home'], queryFn: getBuyerHome, refetchInterval: 60_000 })

if (homeQ.isLoading) return <div className="page"><StatTileSkeleton /><TableRowSkeleton /></div>
if (homeQ.error) return <div className="page"><ApiError error={homeQ.error} onRetry={homeQ.refetch} /></div>
const h = homeQ.data ?? {}
```

Replace `B_HOME.*` with `h.*`, `BUYER_USER.*` with `user.*`.

- [ ] **Step 2: Wire Marketplace.jsx**

```jsx
import { useQuery } from '@tanstack/react-query'
import { browseListings } from './api/marketplace'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const [filters, setFilters] = useState({})
const listingsQ = useQuery({
  queryKey: ['buyer', 'marketplace', filters],
  queryFn: () => browseListings(filters),
})
const speciesQ  = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={8} /></div>
if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
const listings = listingsQ.data?.content ?? listingsQ.data ?? []
```

- [ ] **Step 3: Wire ListingDetail.jsx**

```jsx
import { useQuery } from '@tanstack/react-query'
import { getListingDetail } from './api/marketplace'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const listingQ = useQuery({
  queryKey: ['buyer', 'listing', listingId],
  queryFn: () => getListingDetail(listingId),
  enabled: !!listingId,
})
```

- [ ] **Step 4: Wire Orders.jsx**

```jsx
import { useQuery } from '@tanstack/react-query'
import { listBuyerOrders } from './api/orders'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const [statusFilter, setStatusFilter] = useState(null)
const ordersQ = useQuery({
  queryKey: ['buyer', 'orders', statusFilter],
  queryFn: () => listBuyerOrders(statusFilter),
})
if (ordersQ.isLoading) return <div className="page"><OrderCardSkeleton /><OrderCardSkeleton /></div>
if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>
const orders = ordersQ.data ?? []
```

- [ ] **Step 5: Wire Cart.jsx**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCart, updateCartItem, removeCartItem } from './api/cart'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const qc     = useQueryClient()
const cartQ  = useQuery({ queryKey: ['buyer', 'cart'], queryFn: getCart })
const removeMut = useMutation({
  mutationFn: removeCartItem,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['buyer', 'cart'] }),
})
const updateMut = useMutation({
  mutationFn: ({ itemId, body }) => updateCartItem(itemId, body),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['buyer', 'cart'] }),
})
```

- [ ] **Step 6: Wire Favorites.jsx**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listFavorites, removeFavorite } from './api/favorites'
```

```jsx
const qc   = useQueryClient()
const favQ = useQuery({ queryKey: ['buyer', 'favorites'], queryFn: () => listFavorites() })
const removeMut = useMutation({
  mutationFn: removeFavorite,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['buyer', 'favorites'] }),
})
```

- [ ] **Step 7: Wire Profile.jsx**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBuyerProfile, updateBuyerProfile } from './api/profile'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const qc = useQueryClient()
const profileQ = useQuery({ queryKey: ['buyer', 'profile'], queryFn: getBuyerProfile })
const updateMut = useMutation({
  mutationFn: updateBuyerProfile,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['buyer', 'profile'] }),
})
```

- [ ] **Step 8: Manual smoke test**

Log in as BUYER. Visit Home, Marketplace, Orders, Cart, Favorites, Profile. Confirm real data or clean empty state.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/buyer/
git commit -m "feat(buyer): wire all buyer pages to real API"
```

---

### Task 4: Wire notifications bells

**Files:**
- Create: `frontend/src/api/notifications.js`
- Modify: `frontend/src/fisherman/components/NotificationsBell.jsx`
- Modify: `frontend/src/vendor/components/NotificationsBell.jsx`
- Modify: `frontend/src/buyer/components/NotificationsBell.jsx`

- [ ] **Step 1: Create notifications.js**

```js
// frontend/src/api/notifications.js
import { apiGet, apiPatch, apiPost } from '../api'

export const getNotifications  = ()   => apiGet('/notifications')
export const getUnreadCount    = ()   => apiGet('/notifications/unread-count')
export const markRead          = (id) => apiPatch(`/notifications/${id}/read`, null, {})
export const markAllRead       = ()   => apiPost('/notifications/read-all', null, {})
```

- [ ] **Step 2: Wire fisherman NotificationsBell**

Open `frontend/src/fisherman/components/NotificationsBell.jsx`. Remove any hardcoded badge count. Replace with:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, getUnreadCount, markAllRead } from '../../api/notifications'
```

```jsx
const qc      = useQueryClient()
const countQ  = useQuery({ queryKey: ['notifications', 'unread'], queryFn: getUnreadCount, refetchInterval: 30_000 })
const notifsQ = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, enabled: open })
const markAllMut = useMutation({
  mutationFn: markAllRead,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.setQueryData(['notifications', 'unread'], { count: 0 })
  },
})

const unreadCount = countQ.data?.count ?? 0
```

- [ ] **Step 3: Wire vendor and buyer NotificationsBell**

Apply the same pattern to `frontend/src/vendor/components/NotificationsBell.jsx` and `frontend/src/buyer/components/NotificationsBell.jsx`. The query keys and API calls are identical.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/notifications.js frontend/src/fisherman/components/NotificationsBell.jsx frontend/src/vendor/components/NotificationsBell.jsx frontend/src/buyer/components/NotificationsBell.jsx
git commit -m "feat: wire all NotificationsBell components to live notifications API"
```

---

### Task 5: Build WebSocket messages client

**Files:**
- Create: `frontend/src/hooks/useWebSocket.js`
- Create: `frontend/src/api/messages.js`

- [ ] **Step 1: Install @stomp/stompjs**

```bash
cd frontend && npm install @stomp/stompjs
```

- [ ] **Step 2: Create messages.js (REST history)**

```js
// frontend/src/api/messages.js
import { apiGet } from '../api'

export const getChatContacts  = ()       => apiGet('/messages/users')
export const getConversation  = (userId) => apiGet(`/messages/${userId}`)
```

- [ ] **Step 3: Create useWebSocket.js**

```js
// frontend/src/hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'

export function useWebSocket({ recipientId, onMessage }) {
  const clientRef   = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const client = new Client({
      // Vite proxy forwards /ws-chat → backend:8080/ws-chat (configured in vite.config.js)
      webSocketFactory: () => new WebSocket(`ws://${location.host}/ws-chat`),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        // Subscribe to own queue — backend sends to /user/{userId}/queue/messages
        client.subscribe('/user/queue/messages', (frame) => {
          const msg = JSON.parse(frame.body)
          onMessage?.(msg)
        })
      },
      onDisconnect: () => setConnected(false),
    })

    client.activate()
    clientRef.current = client

    return () => { client.deactivate() }
  }, []) // connect once on mount

  const sendMessage = useCallback((toUserId, content) => {
    if (!clientRef.current?.connected) return
    clientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ recipientId: toUserId, content }),
    })
  }, [])

  return { connected, sendMessage }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useWebSocket.js frontend/src/api/messages.js frontend/package.json frontend/package-lock.json
git commit -m "feat: add WebSocket STOMP client hook and messages REST API module"
```

---

### Task 6: Wire Messages pages

**Files:**
- Modify: `frontend/src/fisherman/Messages.jsx`
- Modify: `frontend/src/vendor/Messages.jsx` (if exists — check with `ls frontend/src/vendor/Messages.jsx`)

- [ ] **Step 1: Wire fisherman Messages.jsx**

Open `frontend/src/fisherman/Messages.jsx`. Remove the `const CONVERSATIONS = [...]` block. Add:

```jsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { getChatContacts, getConversation } from '../api/messages'
import { useWebSocket } from '../hooks/useWebSocket'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace component body:

```jsx
export default function MessagesPage() {
  const qc = useQueryClient()
  const [activeUserId, setActiveUserId] = useState(null)
  const [draft, setDraft] = useState('')
  const [localMsgs, setLocalMsgs] = useState([])
  const bottomRef = useRef()

  const contactsQ = useQuery({ queryKey: ['chat', 'contacts'], queryFn: getChatContacts })
  const historyQ  = useQuery({
    queryKey: ['chat', 'history', activeUserId],
    queryFn: () => getConversation(activeUserId),
    enabled: !!activeUserId,
  })

  const { connected, sendMessage } = useWebSocket({
    onMessage: (msg) => {
      // Append incoming real-time message to local state
      setLocalMsgs(prev => [...prev, msg])
      // Invalidate history so it refreshes on next focus
      qc.invalidateQueries({ queryKey: ['chat', 'history', msg.senderId] })
    },
  })

  // Reset local messages when switching conversation
  useEffect(() => { setLocalMsgs([]) }, [activeUserId])

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [localMsgs, historyQ.data])

  const handleSend = () => {
    if (!draft.trim() || !activeUserId) return
    sendMessage(activeUserId, draft.trim())
    setLocalMsgs(prev => [...prev, { senderId: 'me', content: draft.trim(), sentAt: new Date().toISOString() }])
    setDraft('')
  }

  const contacts  = contactsQ.data ?? []
  const history   = historyQ.data ?? []
  const allMsgs   = [...history, ...localMsgs]
  const activeContact = contacts.find(c => c.id === activeUserId)
  // ... rest of JSX: contact list on left, message thread on right, send box at bottom
  // Replace CONVERSATIONS.map with contacts.map
  // Replace active.messages with allMsgs
```

Keep all existing JSX layout — only replace the data bindings and add the send handler.

- [ ] **Step 2: Wire vendor Messages.jsx if it exists**

```bash
ls frontend/src/vendor/Messages.jsx 2>/dev/null && echo "exists"
```

If it exists, apply the identical pattern as fisherman Messages.jsx (same hooks, same API calls).

- [ ] **Step 3: Test WebSocket manually**

Open two browser tabs: one logged in as FISHERMAN, one as VENDOR. Navigate to Messages in both. Send a message from FISHERMAN — confirm it appears in real time in VENDOR's Messages page without a page refresh.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/fisherman/Messages.jsx frontend/src/vendor/
git commit -m "feat: wire Messages pages to real WebSocket + REST history"
```

---

### Task 7: Final pass — remove all remaining mock constants

- [ ] **Step 1: Grep across entire frontend**

```bash
cd frontend
grep -rn "// ── Inline mock data\|// ─── Mock data\|const MOCK_\|const BUYER_USER\|const BUYER_ORDERS\|const B_HOME\|const CONVERSATIONS\|const VENDOR_USER\|const V_HOME" src/
```

Expected: zero matches.

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Full end-to-end smoke test**

Start all three services (backend, marine-service, frontend dev server). Log in as each role and verify:

- **FISHERMAN:** Dashboard shows real marine conditions. Trips page shows real trips. Catch Alerts page shows real alerts. Earnings shows real totals. Messages sends in real time.
- **VENDOR:** Home shows real revenue/order stats. Inventory shows real lots. Orders Inbox shows real orders. Messages receives in real time.
- **BUYER:** Home shows real order stats. Marketplace shows real listings. Cart works. Notifications bell shows real unread count.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: all roles fully wired to real API — mock data integration complete"
```
