import { useState } from 'react'
import '../index.css'
import { useAuth } from '../context/AuthContext'

// ── Icons ─────────────────────────────────────────────────────────────────────
const EmailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
)
const EyeOn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
)

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ type = 'text', value, onChange, placeholder, icon, required, minLength }) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <div className="field-wrap">
      {icon && <span className="field-icon">{icon}</span>}
      <input
        className="field-inp"
        type={isPw ? (show ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        style={{ paddingLeft: icon ? '38px' : '14px' }}
      />
      {isPw && (
        <button type="button" className="field-eye" onClick={() => setShow(s => !s)} tabIndex={-1}>
          {show ? <EyeOff /> : <EyeOn />}
        </button>
      )}
    </div>
  )
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }) {
  const { login, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    clearError()
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Welcome back</h2>
        <p className="form-desc">Sign in to navigate your waters</p>
      </div>
      <form onSubmit={submit} className="form-body">
        {error && <p className="alert alert--err">{error}</p>}
        <Field type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email address" icon={<EmailIcon />} required />
        <Field type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" icon={<LockIcon />} required minLength={6} />
        <div className="form-extras">
          <label className="check-label">
            <input type="checkbox" className="check-inp" />
            <span>Remember me</span>
          </label>
          <button type="button" className="link-btn">Forgot password?</button>
        </div>
        <button type="submit" className="cta" disabled={loading}>
          {loading ? <><span className="spinner" /> Signing in…</> : 'Dive In'}
        </button>
      </form>
      <p className="form-switch">
        No account? <button type="button" className="link-btn link-btn--accent" onClick={onSwitch}>Create one</button>
      </p>
    </div>
  )
}

// ── Register form ─────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const { register, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('FISHERMAN')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    clearError()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await register({ fullName: name, email, password, role })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Create account</h2>
        <p className="form-desc">Join MERMAID — fish smarter, sail safer</p>
      </div>
      <form onSubmit={submit} className="form-body">
        {error && <p className="alert alert--err">{error}</p>}
        <Field type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Full name" icon={<UserIcon />} required />
        <Field type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email address" icon={<EmailIcon />} required />
        <Field type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" icon={<LockIcon />} required minLength={6} />
        <Field type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm password" icon={<LockIcon />} required minLength={6} />
        <div className="role-row">
          <button type="button"
            className={`role-chip${role === 'FISHERMAN' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('FISHERMAN')}>
            Fisherman
          </button>
          <button type="button"
            className={`role-chip${role === 'VENDOR' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('VENDOR')}>
            Vendor
          </button>
        </div>
        <button type="submit" className="cta" disabled={loading}>
          {loading ? <><span className="spinner" /> Creating…</> : 'Start Exploring'}
        </button>
      </form>
      <p className="form-switch">
        Have an account? <button type="button" className="link-btn link-btn--accent" onClick={onSwitch}>Sign in</button>
      </p>
    </div>
  )
}

// ── Hook & Fish animation ─────────────────────────────────────────────────────
function HookFish({ active }) {
  return (
    <div className={`hook-area${active ? ' hook-area--active' : ''}`}>
      <div className="hook-line" />
      <svg className="hook-svg" viewBox="0 0 28 60" width="28" height="60" fill="none">
        <defs>
          <linearGradient id="hookGrad-hf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#E8E8F0" />
            <stop offset="45%"  stopColor="#C0C0CE" />
            <stop offset="100%" stopColor="#7878A0" />
          </linearGradient>
        </defs>
        <circle cx="14" cy="5" r="4" stroke="url(#hookGrad-hf)" strokeWidth="2" />
        <line x1="14" y1="9" x2="14" y2="38" stroke="url(#hookGrad-hf)" strokeWidth="3" strokeLinecap="round" />
        <path d="M14 38 Q14 55 5 55 Q1 55 1 50" stroke="url(#hookGrad-hf)" strokeWidth="3" strokeLinecap="round" />
        <path d="M1 50 L8 44" stroke="url(#hookGrad-hf)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="splash-group">
        <svg className="splash-svg splash-svg--left" viewBox="0 0 40 30" width="40" height="30" fill="none">
          <path d="M28 30 Q18 10 8 2" stroke="rgba(100,190,255,0.75)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="8"  cy="2" r="2.5" fill="rgba(160,220,255,0.8)"/>
          <circle cx="14" cy="9" r="1.5" fill="rgba(140,200,255,0.6)"/>
        </svg>
        <svg className="splash-svg splash-svg--center" viewBox="0 0 40 30" width="40" height="30" fill="none">
          <path d="M20 30 Q20 10 20 2" stroke="rgba(100,190,255,0.75)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="20" cy="2" r="2.5" fill="rgba(160,220,255,0.8)"/>
          <circle cx="20" cy="8" r="1.5" fill="rgba(140,200,255,0.6)"/>
        </svg>
        <svg className="splash-svg splash-svg--right" viewBox="0 0 40 30" width="40" height="30" fill="none">
          <path d="M12 30 Q22 10 32 2" stroke="rgba(100,190,255,0.75)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="32" cy="2" r="2.5" fill="rgba(160,220,255,0.8)"/>
          <circle cx="26" cy="9" r="1.5" fill="rgba(140,200,255,0.6)"/>
        </svg>
      </div>
      <img className="fish-img" src="/loginfish.png" alt="" aria-hidden="true" draggable={false} />
    </div>
  )
}

// ── LoginPage ─────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [mode, setMode] = useState('login')
  const [animating, setAnimating] = useState(false)

  const handleTabClick = (newMode) => {
    if (newMode === mode || animating) return
    setAnimating(true)
    setTimeout(() => setMode(newMode), 680)
    setTimeout(() => setAnimating(false), 1200)
  }

  return (
    <div className="page">

      {/* Background video */}
      <video className="bg-video" autoPlay muted loop playsInline>
        <source src="/mainbg.mov" type="video/mp4" />
        <source src="/mainbg.mov" type="video/quicktime" />
      </video>
      <div className="bg-overlay" />

      {/* Decorative images */}
      <img src="/rightside.png"      alt="" className="deco-right" aria-hidden="true" />
      <img src="/bottomleftside.png" alt="" className="deco-bl"    aria-hidden="true" />

      {/* Layout — left column holds the form, right is transparent */}
      <div className="layout">
        <div className="left-col">

          {/* Logo */}
          <div className="logo-bar">
            <img src="/logo.png" alt="MERMAID" className="logo-img" />
            <span className="brand-name">MERMAID</span>
          </div>

          {/* Hero tagline */}
          <div className="hero-block">
            <h1 className="hero-title">
              Safer Seas.<br />
              <em>Smarter Catch.</em>
            </h1>
            <p className="hero-sub">
              Real-time marine conditions and market intelligence<br />
              for Filipino fishermen and wet market vendors.
            </p>
          </div>

          {/* Glass card */}
          <div className="glass-card">
            <div className="tabs">
              <div className="tab-line" style={{
                transform: mode === 'login' ? 'translateX(0%)' : 'translateX(100%)'
              }} />
              <button
                className={`tab-btn${mode === 'login' ? ' tab-btn--on' : ''}`}
                onClick={() => handleTabClick('login')}>
                Login
              </button>
              <button
                className={`tab-btn${mode === 'signup' ? ' tab-btn--on' : ''}`}
                onClick={() => handleTabClick('signup')}>
                Register
              </button>
            </div>
            <div className="card-body">
              {mode === 'login'
                ? <LoginForm    key="login"  onSwitch={() => handleTabClick('signup')} />
                : <RegisterForm key="signup" onSwitch={() => handleTabClick('login')} />}
            </div>
          </div>

          {/* Terms */}
          <p className="terms">
            By continuing you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>

        </div>

        {/* Right column — transparent, shows through to video + decorations */}
        <div className="right-col">
          <HookFish active={animating} />
        </div>
      </div>

    </div>
  )
}
