# Auth Page Design Spec
**Date:** 2026-03-22
**Feature:** Login / Register page redesign
**Branch:** `marine-api`

---

## Overview

Replace the current monolithic `App.jsx` auth form with a modern, production-grade login/register page. The page uses a split-screen layout with a looping background video on the left and a 3D card-flip form panel on the right.

**User personas:** Isidro (fisherman) and Rosario (vendor).
**API:** `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/profile`

---

## Layout

### Overall Structure
Full-viewport two-column layout. No routing library — state-based toggle preserved.

| Panel | Width | Content |
|-------|-------|---------|
| Left (video) | 52% | `mainbgvid.mov` + overlay + hero copy |
| Right (form) | 48% | Dark panel + 3D flip card |

**Mobile (≤ 768px):** Left panel collapses. Right panel takes full width. Video hidden. Existing mobile styles from `index.css` extended.

---

## Left Panel — Video + Hero Copy

### Video Background
- `<video>` element: `src="/mainbgvid.mov"`, `autoplay`, `muted`, `loop`, `playsInline`, `poster="/sidebg.jpeg"`
- `sidebg.jpeg` acts as poster/fallback while video loads
- Positioned `absolute`, `object-fit: cover`, full panel coverage
- Two gradient overlays stacked on top:
  - Top-to-bottom: `rgba(2,14,30,0.4)` → transparent → `rgba(2,14,30,0.85)` (ensures bottom content readable)
  - Radial: subtle blue glow at center for depth

### Hero Content (bottom-anchored, `z-index: 2`)
1. **Logo row** — `logo.png` (32×32, border-radius 8px) + "MERMAID" wordmark in `#3ae8d6`, weight 800, letter-spacing 2px
2. **Headline** — `font-family: 'Instrument Serif', serif; font-style: italic; font-size: 2.2rem`
   - Text: *"Know the sea."* + line break + *"Fish smarter."* — the word "smarter" in `#3ae8d6`
3. **Sub-copy** — 13px, `rgba(255,255,255,0.5)`: *"Real-time marine conditions, risk assessments, and market demand — built for Filipino fishermen and vendors."*
4. **Feature pills** — flex row, wrapping:
   - 🌊 Wave alerts · ⚠️ Risk levels · 📈 Market demand · 🗺️ Zone maps
   - Style: `rgba(255,255,255,0.07)` bg, `rgba(255,255,255,0.12)` border, 11px

### Floating Fish Decorations
- 3 fish emoji (`🐟`, `🐠`, `🐡`) positioned absolutely at varying depths/opacities (0.10–0.18)
- Each runs `fishFloat` keyframe independently with staggered `animation-delay` (0s, 2s, 4s)
- `fishFloat`: `translateY(0)` → `translateY(-12px)` → back, 8s ease-in-out, no pointer events

---

## Right Panel — Form Area

### Background
- Base: `#03101f`
- `sidebg.jpeg` as `background-image`, `opacity: 0.04` — subtle texture only

### Tab Row
- Two tabs: **Sign In** / **Register** — flex row, `border-radius: 12px` container, `padding: 3px`
- Active tab: `rgba(255,255,255,0.08)` bg, white text
- Inactive tab: `rgba(255,255,255,0.4)` text
- Clicking a tab triggers the card flip

### 3D Card Flip
- **Container:** `perspective: 800px`
- **Card:** `transform-style: preserve-3d; transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)`
- **Trigger:** adds/removes `.flipped` class → `rotateY(180deg)`
- **Front face:** Login form (`backface-visibility: hidden`)
- **Back face:** Register form (`transform: rotateY(180deg); backface-visibility: hidden`)
- Both the tab row and the inline "Create one" / "Sign in" links trigger the flip

### Field Entrance Animation
- On flip completion, form fields stagger fade-slide-up
- Keyframe: `opacity: 0, translateY(8px)` → `opacity: 1, translateY(0)`
- Duration: 0.35s, stagger: 50ms per field
- Triggered via JS class toggle after flip transition ends (`transitionend` event)

---

## Login Form (front face)

**Fields:**
1. Email — `type="email"`, placeholder `you@example.com`
2. Password — `type="password"`, placeholder `••••••••`

**Button:** "Sign In →"

**API call:** `POST /api/auth/login` → `{ email, password }` → store `accessToken` + `user` in `localStorage`

**Error handling:** inline error message below button, color `#ff8a8a`

---

## Register Form (back face)

**Fields:**
1. Full name — `type="text"`, placeholder `Isidro Reyes`
2. Email — `type="email"`
3. Password — `type="password"`
4. Role picker (see below)

**Button:** "Create Account →"

**API call:** `POST /api/auth/register` → `{ fullName, email, password, role }` → on 201 success, auto-flip back to Login with a success message pre-filled

**Error handling:** inline error message, color `#ff8a8a`

---

## Role Picker

**Style:** Full-width split panel, two equal halves, `border-radius: 14px`, `overflow: hidden`

| | Fisherman | Vendor |
|--|-----------|--------|
| Icon | 🎣 (26px) | 🏪 (26px) |
| Default bg | `linear-gradient(160deg, #0a3060, #041828)` | `linear-gradient(160deg, #1a2a10, #041408)` |
| Selected bg | `linear-gradient(160deg, #0d4a8c, #0a2545)` | `linear-gradient(160deg, #254a15, #0d2808)` |
| Label | "FISHERMAN" | "VENDOR" |
| Default selected | FISHERMAN | — |

**Selection micro-interaction:**
- Bottom border sweep: `::after` pseudo-element, `scaleX(0 → 1)`, 0.3s, gradient `#1e6fd9 → #0bb8ff`
- Icon scale: `1.0 → 1.1`, 0.3s
- Label color: `rgba(255,255,255,0.5) → #3ae8d6`, 0.2s

---

## Micro-interactions

| Element | Trigger | Effect |
|---------|---------|--------|
| Input | `:focus` | Border → `rgba(11,184,255,0.5)`, bg → `rgba(255,255,255,0.07)`, box-shadow glow ring `rgba(11,184,255,0.12)` |
| Submit button | `:hover` | `translateY(-1px)`, shadow deepens to `rgba(11,184,255,0.45)` |
| Submit button | `:active` | `translateY(0)` snap back |
| Submit button | Loading | Text → spinner (CSS border animation), disabled state |
| Role panel | click | Color shift + icon scale + bottom border sweep |
| Card | flip | 700ms 3D Y-axis rotation |
| Fields | post-flip | Staggered 50ms fade-slide-up entrance |
| Fish | always | Independent float keyframes, no pointer events |

---

## Component Structure

Refactor from the current monolithic `App.jsx` into:

```
frontend/src/
  components/
    auth/
      AuthPage.jsx          ← top-level: layout shell, video, left panel
      LoginForm.jsx          ← front face of flip card
      RegisterForm.jsx       ← back face of flip card
      RolePicker.jsx         ← fisherman/vendor split panel
      FlipCard.jsx           ← 3D flip wrapper (front/back slots)
  hooks/
    useAuth.js               ← login/register API calls + localStorage
  App.jsx                    ← unchanged shell (will add routing later)
```

**`useAuth.js`** extracts the current `apiPost` + localStorage logic from `App.jsx` into a reusable hook. Returns `{ login, register, user, error, loading }`.

---

## Assets Used

| Asset | Usage |
|-------|-------|
| `public/mainbgvid.mov` | Left panel video background |
| `public/sidebg.jpeg` | Video poster + right panel faint texture |
| `public/logo.png` | Logo in left panel hero row |
| `public/fish1.png` | Available for enhanced fish decoration (optional) |
| `public/fish2.png` | Available for enhanced fish decoration (optional) |

Whale images (`whale1.png`, `whale2.png`) and `seaweed1/2.png` are **not used** in the auth page — reserved for dashboard/home.

---

## Existing Code Reuse

- **Color variables, fonts, keyframes** — all reused from `index.css` (`#0d2342`, `#3ae8d6`, `Outfit`, `fishFloat`, `fadeSlideUp`, etc.)
- **`apiPost` helper** — moved into `useAuth.js`, unchanged logic
- **`Bubbles` component** — optionally kept as background decoration
- **Mobile breakpoint styles** — extended from existing `max-width: 768px` rules

---

## Out of Scope

- React Router / protected routes (future task)
- JWT refresh logic (future task)
- Auth context provider (future task)
- Dashboard page (future task)
- Admin login flow (future task)
