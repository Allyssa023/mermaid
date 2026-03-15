import { useState } from 'react'
import './index.css'

// ── API helper ───────────────────────────────────────────────────────────────
const API_BASE = '/api' // Spring Boot context-path is /api

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

// ── Forms ────────────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiPost('/auth/login', { email, password })
      // Store JWT
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      // TODO: redirect to dashboard or reload
      window.location.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label className="form-label">EMAIL ADDRESS</label>
      <input
        className="form-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label className="form-label">PASSWORD</label>
      <input
        className="form-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />

      <button type="submit" className="form-btn" disabled={loading}>
        {loading ? 'Signing in…' : 'Dive In'}
      </button>
    </form>
  )
}

function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('FISHERMAN')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await apiPost('/auth/register', {
        fullName: name,
        email,
        password,
        role,
      })
      setSuccess('Account created! You can now sign in.')
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <label className="form-label">FULL NAME</label>
      <input
        className="form-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label className="form-label">EMAIL ADDRESS</label>
      <input
        className="form-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label className="form-label">PASSWORD</label>
      <input
        className="form-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />

      <label className="form-label">I AM A</label>
      <div className="role-picker">
        <button
          type="button"
          className={`role-btn${role === 'FISHERMAN' ? ' role-active' : ''}`}
          onClick={() => setRole('FISHERMAN')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 16s1-4 4-4 4 4 7 4 4-4 7-4 4 4 4 4" />
            <path d="M12 12V2" />
            <path d="M12 6l-3-2" />
            <path d="M12 8l3-2" />
          </svg>
          Fisherman
        </button>
        <button
          type="button"
          className={`role-btn${role === 'VENDOR' ? ' role-active' : ''}`}
          onClick={() => setRole('VENDOR')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
            <path d="M12 3v6" />
          </svg>
          Vendor
        </button>
      </div>

      <button type="submit" className="form-btn" disabled={loading}>
        {loading ? 'Creating account…' : 'Start Exploring'}
      </button>
    </form>
  )
}

function Bubbles() {
  return (
    <div className="bubbles" aria-hidden="true">
      <span className="bubble b1" />
      <span className="bubble b2" />
      <span className="bubble b3" />
      <span className="bubble b4" />
      <span className="bubble b5" />
      <span className="bubble b6" />
      <span className="bubble b7" />
      <span className="bubble b8" />
    </div>
  )
}

function App() {
  const [mode, setMode] = useState('login')

  return (
    <div className="page">
      {/* Atmospheric background effects */}
      <div className="caustics" aria-hidden="true" />
      <div className="depth-particles" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>

      {/* Subtle left-side bubbles */}
      <div className="left-bubbles" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
        <span /><span /><span /><span /><span /><span />
      </div>

      {/* Layer 1 – ocean scene background (S-curve) */}
      <img src="/bg.png" alt="" className="ocean-bg" />

      {/* Layer 2 – whale illustrations */}
      <img src="/whale1.png" alt="" className="whale w1" />
      <img src="/whale2.png" alt="" className="whale w2" />

      {/* Layer 2.5 – seaweed */}
      <img src="/seaweed1.png" alt="" className="seaweed sw1" />
      <img src="/seaweed2.png" alt="" className="seaweed sw2" />

      {/* Layer 3 – bubbles */}
      <Bubbles />

      {/* Layer 4 – content (highest z-index) */}
      <div className="top-bar">
        <img src="/logo.png" alt="MERMAID logo" className="top-logo" />
        <span className="top-brand">MERMAID</span>
      </div>

      <div className="left-content">
        <header className="hero-header">
          <h1 className="hero-title">
            Safer seas,<br />
            <span className="hero-accent">smarter catch</span>
          </h1>
        </header>

        <div className={`card card--${mode}`}>
          <div className="card-glow" />

          <h2 className="card-heading">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          <div className="card-body">
            <div className={`form-pane ${mode === 'login' ? 'form-pane--visible' : ''}`}>
              <LoginForm />
            </div>
            <div className={`form-pane ${mode === 'signup' ? 'form-pane--visible' : ''}`}>
              <SignupForm />
            </div>
          </div>

          <p className="card-switch">
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button type="button" className="switch-link" onClick={() => setMode('signup')}>
                  Register
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button type="button" className="switch-link" onClick={() => setMode('login')}>
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>

        <p className="footer-note">
          By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

export default App
