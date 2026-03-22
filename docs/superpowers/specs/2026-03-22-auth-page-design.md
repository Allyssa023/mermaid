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
- The existing `fish1.png` / `fish2.png` image elements and their `.f1` / `.f2` CSS classes are **removed** from the auth page and replaced by 3 emoji fish on the left panel only.
- 3 fish emoji (`🐟`, `🐠`, `🐡`) positioned `absolute` at varying depths/opacities (0.10–0.18), `pointer-events: none`
- Each runs a new `fishFloatAuth` keyframe (distinct from the existing `fishFloat1` / `fishFloat2` in `index.css`) with staggered `animation-delay` (0s, 2s, 4s)
- **New keyframe `fishFloatAuth`** (added to `index.css`): `translateY(0) rotate(-3deg)` → `translateY(-12px) rotate(3deg)` → back, 8s ease-in-out infinite

---

## Right Panel — Form Area

### Background
- Base: `#03101f`
- `sidebg.jpeg` as `background-image`, `opacity: 0.04` — subtle texture only

### Tab Row
- CSS class: `.auth-tabs`
- Container: `display: flex`, `background: rgba(255,255,255,0.04)`, `border-radius: 12px`, `padding: 3px`
- Each tab (`.auth-tab`): `flex: 1`, `height: 36px`, `font-size: 13px`, `font-weight: 600`, `border-radius: 10px`, `cursor: pointer`, `transition: all 0.2s`
- Active tab (`.auth-tab.active`): `background: rgba(255,255,255,0.08)`, `color: #fff`
- Inactive tab: `color: rgba(255,255,255,0.4)`
- Clicking a tab triggers the card flip
- The existing bottom `card-switch` / `switch-link` inline links (*"No account? Create one"* / *"Already registered? Sign in"*) are **retained** as a secondary affordance inside each form face

### 3D Card Flip

**Breaking change from existing CSS:** The current `App.jsx` uses two `.form-pane` divs with opacity/translateY fade transitions and a `.card` element with `overflow: hidden` and a height transition between `.card--login` (380px) and `.card--signup` (560px). This mechanism is **fully replaced**. The following existing CSS rules are removed as part of this implementation:
- `.form-pane`, `.form-pane--visible`
- `.card--login`, `.card--signup`
- The entire height constraint block on `.card` — specifically `overflow: hidden`, `height: var(--card-h, 380px)`, and `transition: height 0.5s ...` (see `index.css` lines 624–640). The `.card` base rule is either deleted or overridden so no height or overflow constraint restricts the flip card container

The new flip mechanism requires `overflow: visible` (or no overflow constraint) on the card container for `preserve-3d` to render the rotated back face correctly.

**New flip implementation:**
- **Container (`.flip-scene`):** `perspective: 800px`
- **Card (`.flip-card`):** `transform-style: preserve-3d; transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)` — **no** `overflow: hidden`
- **Trigger:** adds/removes `.flipped` class → `rotateY(180deg)`
- **Front face (`.flip-front`):** Login form, `backface-visibility: hidden`
- **Back face (`.flip-back`):** `position: absolute; top: 0; left: 0; width: 100%; transform: rotateY(180deg); backface-visibility: hidden`
- Both the `.auth-tabs` tab row and the inline secondary links trigger the flip

### Field Entrance Animation
- On flip completion, form fields stagger fade-slide-up
- Keyframe: `opacity: 0, translateY(8px)` → `opacity: 1, translateY(0)`
- Duration: 0.35s, stagger: 50ms per field
- Triggered via `transitionend` on `.flip-card`. Guard with `event.propertyName === 'transform'` to ensure the animation fires exactly once (not for every transitioning property)

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

**API call:** `POST /api/auth/register` → `{ fullName, email, password, role }` (role value: `"FISHERMAN"` or `"VENDOR"`) → on 201 success:
1. A green success message *"Account created! Please sign in."* appears briefly on the Register face for 1 500ms
2. After 1 500ms the card auto-flips back to the Login face
3. The email field on the Login face is pre-populated with the email the user just registered with
4. No `accessToken` is returned by `/auth/register` — the user must sign in separately

**Error handling:** inline error message, color `#ff8a8a`

---

## Role Picker

**DOM structure:** Single `div.role-picker` containing two `div` children — `div.role-opt.fisher` and `div.role-opt.vendor`. No gap between halves (flush). The existing `.role-btn` elements and their individual `border-radius` are replaced entirely.

**Container (`.role-picker`):** `display: flex`, `border-radius: 14px`, `overflow: hidden`, `border: 1px solid rgba(255,255,255,0.08)`

**Each half (`.role-opt`):** `flex: 1`, `position: relative`, `overflow: hidden`, `cursor: pointer`, `transition: all 0.25s` — `position: relative` and `overflow: hidden` are required to clip the `::after` bottom-border sweep to the half's bounds

**Style:** Full-width split panel, two equal halves, `border-radius: 14px` on container only

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

**Email pre-population state:** After successful registration, `RegisterForm` must hand off the registered email to `LoginForm`. This shared state (`registeredEmail`) lives in `FlipCard.jsx` (the common parent) and is passed down as a prop — `LoginForm` receives `initialEmail?: string` and pre-fills the email field on mount when provided.

---

## Assets Used

| Asset | Usage |
|-------|-------|
| `public/mainbgvid.mov` | Left panel video background |
| `public/sidebg.jpeg` | Video poster + right panel faint texture |
| `public/logo.png` | Logo in left panel hero row |
| `public/fish1.png` | Not used on auth page — reserved for dashboard |
| `public/fish2.png` | Not used on auth page — reserved for dashboard |

Whale images (`whale1.png`, `whale2.png`) and `seaweed1/2.png` are **not used** in the auth page — reserved for dashboard/home.

---

## Existing Code Reuse

- **Color variables, fonts, keyframes** — all reused from `index.css` (`#0d2342`, `#3ae8d6`, `Outfit`, `fadeSlideUp`, etc.). New `fishFloatAuth` keyframe added to `index.css`.
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
