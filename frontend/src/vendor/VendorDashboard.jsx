import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'
import Home from './Home'
import StorefrontEditor from './StorefrontEditor'
import Inventory from './Inventory'
import OrdersInbox from './OrdersInbox'
import ProcurementFeed from './ProcurementFeed'
import Watchlist from './Watchlist'
import Analytics from './Analytics'
import Reviews from './Reviews'
import Payouts from './Payouts'
import ShopProfile from './ShopProfile'

// ─── Vendor nav config (from shell.jsx ROLE_NAV VENDOR) ──────────────────
const VENDOR_NAV_ITEMS = [
  { id: 'vdashboard',   icon: 'Dashboard', label: 'Dashboard' },
  { id: 'vstore',       icon: 'Receipt',   label: 'Storefront' },
  { id: 'vinventory',   icon: 'Box',       label: 'Inventory' },
  { id: 'vorders',      icon: 'Clipboard', label: 'Orders',       badge: 1 },
  { id: 'vprocurement', icon: 'Fish',      label: 'Source Catch', badge: 4 },
  { id: 'vwatchlist',   icon: 'Star',      label: 'Watchlist' },
  { id: 'vanalytics',   icon: 'Bars',      label: 'Analytics' },
  { id: 'vreviews',     icon: 'Heart',     label: 'Reviews' },
  { id: 'vpayouts',     icon: 'Wallet',    label: 'Payouts' },
  { id: 'vshop',        icon: 'User',      label: 'Shop profile' },
  { id: 'vmessages',    icon: 'Message',   label: 'Messages',     badge: 2 },
]

const PAGE_LABELS = {
  vdashboard: 'Dashboard',
  vstore:     'Storefront',
  vinventory: 'Inventory',
  vorders:    'Orders',
  vprocurement: 'Source Catch',
  vwatchlist: 'Catch Watchlist',
  vanalytics: 'Analytics',
  vreviews:   'Reviews',
  vpayouts:   'Payouts',
  vshop:      'Shop Profile',
  vmessages:  'Messages',
}

// ─── Inline Rail ─────────────────────────────────────────────────────────
function Rail({ page, setPage, user, onLogout }) {
  const initials = user
    ? (user.fullName || user.first || 'V').slice(0, 1) + ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'V'
  const displayName  = user?.first || user?.fullName?.split(' ')[0] || 'Vendor'
  const displaySub   = user?.business || user?.businessName || 'Vendor'

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {VENDOR_NAV_ITEMS.map(it => {
          const Icon = I[it.icon]
          return (
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => setPage(it.id)}
              data-tip={it.label}
            >
              <div className="rail-item__icon"><Icon size={18} /></div>
              <div className="rail-item__text">{it.label}</div>
              {it.badge ? <span className="rail-item__badge">{it.badge}</span> : null}
            </div>
          )
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onLogout} data-tip="Log out">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Log out</div>
        </div>
        <div className="rail-item" data-tip="Help & docs">
          <div className="rail-item__icon"><I.Help size={18} /></div>
          <div className="rail-item__text">Help</div>
        </div>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{displayName}</span>
            <span className="rail__user-role">VENDOR · {displaySub}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Inline Topbar ───────────────────────────────────────────────────────
function Topbar({ page }) {
  const label = PAGE_LABELS[page] || page
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <span style={{color: 'var(--ink-3)'}}>Vendor</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search listings, fishermen, alerts…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
    </div>
  )
}

// ─── Inline MessagesPage ─────────────────────────────────────────────────
const CONVERSATIONS = [
  { id: 'c1', name: 'Ramiro Delgado',  avatar: 'R', color: 'accent', tag: 'Fisherman', last: 'I have 42kg fresh YT, interested?', lastTime: '14:32', unread: 2, online: true  },
  { id: 'c2', name: 'Tomas Reyes',     avatar: 'T', color: 'sage',   tag: 'Fisherman', last: 'Skipjack ready at Lucena Port now.', lastTime: '12:10', unread: 1, online: false },
  { id: 'c3', name: 'Helena Cruz',     avatar: 'H', color: 'sage',   tag: 'Fisherman', last: 'Mahi-mahi gilled and iced.', lastTime: '09:45', unread: 0, online: false },
  { id: 'c4', name: 'Casa Mendez Kitchen', avatar: 'C', color: 'warm', tag: 'Buyer', last: 'Can you do 10kg for Saturday?', lastTime: 'Yesterday', unread: 0, online: false },
]

function MessagesPage() {
  const [activeId, setActiveId] = useState('c1')
  const active = CONVERSATIONS.find(c => c.id === activeId)
  const [draft, setDraft] = useState('')

  const msgs = [
    { from: 'them', ts: '14:22', content: 'Hi Inez, I have 42kg fresh Yellowfin this morning.' },
    { from: 'me',   ts: '14:30', content: 'Hi Ramiro! Sashimi-grade? How was the ice?' },
    { from: 'them', ts: '14:32', content: active.last },
  ]

  return (
    <div className="page" style={{paddingBottom: 24}}>
      <div className="page__head" style={{marginBottom: 14}}>
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{marginTop: 4}}><em>Messages</em></h1>
          <p className="page__sub">{CONVERSATIONS.length} conversations · {CONVERSATIONS.reduce((a,c) => a + c.unread, 0)} unread</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--sm"><I.Filter size={12} /> Filter</button>
          <button className="btn btn--primary btn--sm"><I.Plus size={12} /> New message</button>
        </div>
      </div>

      <div className="msgs">
        <div className="msgs__list">
          <div className="msgs__head">
            <strong style={{fontSize: 13}}>All conversations</strong>
            <span className="kbd">{CONVERSATIONS.length}</span>
          </div>
          <div className="msgs__search">
            <input placeholder="Search contacts, messages…" />
          </div>
          {CONVERSATIONS.map(c => (
            <div key={c.id} className={`contact${activeId === c.id ? ' contact--on' : ''}`} onClick={() => setActiveId(c.id)}>
              <div className={`contact__avatar contact__avatar--${c.color}${c.online ? ' contact__avatar--online' : ''}`}>
                {c.avatar}
              </div>
              <div style={{minWidth: 0}}>
                <div className="contact__name">{c.name}</div>
                <div className="contact__preview">
                  <span style={{
                    fontSize: 10,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginRight: 6,
                  }}>{c.tag}</span>
                </div>
                <div className="contact__preview" style={{marginTop: 1}}>{c.last}</div>
              </div>
              <div className="contact__meta">
                <div>{c.lastTime}</div>
                {c.unread > 0 && <span className="contact__unread">{c.unread}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="thread">
          <div className="thread__head">
            <div className={`contact__avatar contact__avatar--${active.color}${active.online ? ' contact__avatar--online' : ''}`}>
              {active.avatar}
            </div>
            <div>
              <div style={{fontSize: 14, fontWeight: 500}}>{active.name}</div>
              <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>
                {active.tag} · {active.online ? 'Online now' : 'Last seen 2h ago'}
              </div>
            </div>
            <div className="spacer" />
            <button className="topbar__icon-btn"><I.Receipt size={14} /></button>
            <button className="topbar__icon-btn"><I.Dots size={14} /></button>
          </div>
          <div className="thread__body">
            <div className="thread__date-sep">— Today —</div>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble bubble--${m.from === 'me' ? 'mine' : 'theirs'}`}>
                {m.content}
                <div className="bubble__time">{m.ts}</div>
              </div>
            ))}
            <div className="bubble bubble--theirs" style={{padding: '8px 14px', opacity: 0.7}}>
              <span style={{display: 'inline-flex', gap: 3}}>
                <span style={{width: 4, height: 4, borderRadius: 99, background: 'var(--ink-4)', animation: 'typing 1.2s infinite'}} />
                <span style={{width: 4, height: 4, borderRadius: 99, background: 'var(--ink-4)', animation: 'typing 1.2s infinite 0.2s'}} />
                <span style={{width: 4, height: 4, borderRadius: 99, background: 'var(--ink-4)', animation: 'typing 1.2s infinite 0.4s'}} />
              </span>
            </div>
          </div>
          <div className="thread__input">
            <button className="topbar__icon-btn"><I.Paperclip size={14} /></button>
            <textarea placeholder="Type a message…" value={draft} onChange={e => setDraft(e.target.value)} />
            <button className="btn btn--accent"><I.Send size={12} /> Send</button>
          </div>
        </div>

        <div className="thread__info">
          <div>
            <h4>Contact</h4>
            <div className="info-item"><span className="l">Organization</span><span className="v">{active.name}</span></div>
            <div className="info-item"><span className="l">Type</span><span className="v">{active.tag}</span></div>
            <div className="info-item"><span className="l">Location</span><span className="v">Pinagbayanan, QZ</span></div>
            <div className="info-item"><span className="l">Rating</span><span className="v">4.8 ★ (42)</span></div>
          </div>
          <div>
            <h4>Active deal</h4>
            <div style={{padding: 12, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line-soft)'}}>
              <div style={{fontSize: 13, fontWeight: 500}}>Yellowfin Tuna · 42kg</div>
              <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2}}>From alert CA-841</div>
              <div style={{fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 8}}>₱15,960</div>
              <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>₱380/kg asking</div>
              <button className="btn btn--accent btn--sm" style={{marginTop: 10, width: '100%', justifyContent: 'center'}}>Add to cart</button>
            </div>
          </div>
          <div>
            <h4>Recent orders together</h4>
            <div style={{fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>PO-7012</span>
                <span className="data" style={{color: 'var(--ink-2)'}}>₱7,600</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>PO-6998</span>
                <span className="data" style={{color: 'var(--ink-2)'}}>₱2,160</span>
              </div>
            </div>
          </div>
          <div>
            <h4>Shared files</h4>
            <div style={{fontSize: 12, color: 'var(--ink-3)'}}>No files yet</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Page router ─────────────────────────────────────────────────────────
function PageContent({ page, setPage }) {
  switch (page) {
    case 'vdashboard':   return <Home setPage={setPage} />
    case 'vstore':       return <StorefrontEditor />
    case 'vinventory':   return <Inventory />
    case 'vorders':      return <OrdersInbox />
    case 'vprocurement': return <ProcurementFeed />
    case 'vwatchlist':   return <Watchlist />
    case 'vanalytics':   return <Analytics />
    case 'vreviews':     return <Reviews />
    case 'vpayouts':     return <Payouts />
    case 'vshop':        return <ShopProfile />
    case 'vmessages':    return <MessagesPage />
    default:             return <Home setPage={setPage} />
  }
}

// ─── VendorDashboard shell ────────────────────────────────────────────────
export default function VendorDashboard({ user, onLogout }) {
  const [page, setPage] = useState('vdashboard')

  return (
    <div className="app" data-accent="warm" data-density="balanced">
      <Rail page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <div className="main">
        <Topbar page={page} />
        <PageContent page={page} setPage={setPage} />
      </div>
    </div>
  )
}
