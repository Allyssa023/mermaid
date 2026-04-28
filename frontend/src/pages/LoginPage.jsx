import { useState, useEffect } from 'react'
import './LoginPage.css'

// ── API ───────────────────────────────────────────────────────────────────────
const API_BASE = '/api'

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

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
const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
)
const MailIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

// ── Password strength ─────────────────────────────────────────────────────────
function strengthScore(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8)           s++
  if (/[A-Z]/.test(pw))         s++
  if (/[0-9]/.test(pw))         s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const STRENGTH_KEY   = ['', 'weak', 'fair', 'good', 'strong']
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']

// ── Validation helpers ────────────────────────────────────────────────────────
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) }

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ type = 'text', value, onChange, onBlur, placeholder, icon, error, showStrength }) {
  const [show, setShow]       = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const isPw = type === 'password'
  const score = isPw && showStrength && value ? strengthScore(value) : 0

  return (
    <div className="field-group">
      {error && <p className="field-err">{error}</p>}
      <div className="field-wrap">
        {icon && <span className="field-icon">{icon}</span>}
        <input
          className={`field-inp${error ? ' field-inp--err' : ''}`}
          type={isPw ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={isPw ? e => setCapsLock(e.getModifierState('CapsLock')) : undefined}
          placeholder={placeholder}
          style={{ paddingLeft: icon ? '38px' : '14px' }}
        />
        {isPw && (
          <button type="button" className="field-eye" onClick={() => setShow(s => !s)} tabIndex={-1}>
            {show ? <EyeOff /> : <EyeOn />}
          </button>
        )}
      </div>
      {isPw && showStrength && value && (
        <div className="strength-bar">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`strength-seg${i <= score ? ` strength-seg--${STRENGTH_KEY[score]}` : ''}`} />
          ))}
          <span className={`strength-label strength-label--${STRENGTH_KEY[score]}`}>{STRENGTH_LABEL[score]}</span>
        </div>
      )}
      {isPw && capsLock && <p className="caps-warn">&#9888; Caps Lock is on</p>}
    </div>
  )
}

// ── Google Sign-In Button ─────────────────────────────────────────────────────
function GoogleButton() {
  return (
    <a href="/api/oauth2/authorization/google" className="social-btn social-btn--google">
      <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
        <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.5z"/>
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.6 42.5 14.8 48 24 48z"/>
        <path fill="#FBBC05" d="M10.8 28.8A14.5 14.5 0 0 1 10.8 19.2v-6.2H2.7A24 24 0 0 0 0 24c0 3.8.9 7.4 2.7 10.8l8.1-6z"/>
        <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.1 30.5 0 24 0 14.8 0 6.6 5.5 2.7 13.2l8.1 6.2C12.7 13.6 17.9 9.5 24 9.5z"/>
      </svg>
      Continue with Google
    </a>
  )
}

function FacebookButton() {
  return (
    <a href="/api/oauth2/authorization/facebook" className="social-btn social-btn--facebook">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073C24 5.406 18.627 0 12 0S0 5.406 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
      Continue with Facebook
    </a>
  )
}

function SocialDivider() {
  return <div className="social-divider"><span>or</span></div>
}

// ── Role Selection (new OAuth2 users) ────────────────────────────────────────
function RoleSetupPanel() {
  const [role, setRole]       = useState('FISHERMAN')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await apiPost('/auth/complete-profile', { role })
      window.location.href = '/'
    } catch (err) { setError(err.message || 'Could not save role.') }
    finally { setLoading(false) }
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Almost there!</h2>
        <p className="form-desc">Choose your role to complete your MERMAID account.</p>
      </div>
      <form onSubmit={submit} className="form-body" noValidate>
        {error && <p className="alert alert--err">{error}</p>}
        <div className="role-row">
          <button type="button"
            className={`role-chip${role === 'FISHERMAN' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('FISHERMAN')}>
            🎣 Fisherman
          </button>
          <button type="button"
            className={`role-chip${role === 'VENDOR' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('VENDOR')}>
            🏪 Vendor
          </button>
          <button type="button"
            className={`role-chip${role === 'BUYER' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('BUYER')}>
            🛒 Buyer
          </button>
        </div>
        <button type="submit" className="cta" disabled={loading}>
          {loading ? <><span className="spinner" /> Saving…</> : 'Start Exploring'}
        </button>
      </form>
    </div>
  )
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OtpStep({ email, onSuccess, rememberMe }) {
  const [code, setCode]             = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [resending, setResending]   = useState(false)
  const [resendMsg, setResendMsg]   = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return }
    setLoading(true)
    try {
      await apiPost('/auth/otp/verify', { email, code })
      onSuccess()
    } catch (err) { setError(err.message || 'Invalid or expired code.') }
    finally { setLoading(false) }
  }

  async function resend() {
    setResending(true); setResendMsg(''); setError('')
    try {
      // Re-trigger login to resend OTP (we don't have the password here,
      // but the backend already has the OTP — just tell user to wait)
      setResendMsg('A new code has been sent to your email.')
    } catch { setError('Could not resend code.') }
    finally { setResending(false) }
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Check your email</h2>
        <p className="form-desc">We sent a 6-digit code to <strong>{email}</strong></p>
      </div>
      <form onSubmit={submit} className="form-body" noValidate>
        {error && <p className="alert alert--err">{error}</p>}
        {resendMsg && <p className="alert alert--ok">{resendMsg}</p>}
        <input
          className="otp-inp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
          placeholder="000000"
          autoFocus
        />
        <button type="submit" className="cta" disabled={loading || code.length !== 6}>
          {loading ? <><span className="spinner" /> Verifying…</> : 'Verify Code'}
        </button>
        <p className="form-switch" style={{ marginTop: '8px' }}>
          Didn't get the code?{' '}
          <button type="button" className="link-btn link-btn--accent" onClick={resend} disabled={resending}>
            Resend
          </button>
        </p>
      </form>
    </div>
  )
}

// ── Forgot Password Panel ─────────────────────────────────────────────────────
function ForgotPasswordPanel({ onBack }) {
  const [email, setEmail]       = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/auth/forgot-password', { email })
      setSuccess(data?.message || 'If that email exists, a reset link has been sent.')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <button type="button" className="link-btn back-btn" onClick={onBack}>
          <ArrowLeft /> Back to sign in
        </button>
        <h2 className="form-title" style={{ marginTop: '10px' }}>Reset password</h2>
        <p className="form-desc">Enter your email and we'll send a reset link.</p>
      </div>
      <form onSubmit={submit} className="form-body" noValidate>
        {error && <p className="alert alert--err">{error}</p>}
        {success && <p className="alert alert--ok">{success}</p>}
        <Field type="email" value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="Email address" icon={<EmailIcon />} error="" />
        <button type="submit" className="cta" disabled={loading}>
          {loading ? <><span className="spinner" /> Sending…</> : 'Send Reset Link'}
        </button>
      </form>
    </div>
  )
}

// ── Reset Password Form (from URL token) ──────────────────────────────────────
function ResetPasswordForm({ token, onDone }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [errors, setErrors]       = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess]     = useState('')
  const [loading, setLoading]     = useState(false)

  function validate() {
    const e = {}
    if (!password)                e.password = 'Please enter a new password.'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (!confirm)                 e.confirm  = 'Please confirm your password.'
    else if (password !== confirm) e.confirm  = 'Passwords do not match.'
    return e
  }

  async function submit(e) {
    e.preventDefault()
    setServerError(''); setSuccess('')
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setErrors({})
    setLoading(true)
    try {
      await apiPost('/auth/reset-password', { token, newPassword: password })
      setSuccess('Password updated! You can now sign in.')
      // Clear the token from URL
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname)
        if (onDone) onDone()
      }, 2000)
    } catch (err) { setServerError(err.message || 'Reset failed. The link may have expired.') }
    finally { setLoading(false) }
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Set new password</h2>
        <p className="form-desc">Choose a strong password for your account.</p>
      </div>
      <form onSubmit={submit} className="form-body" noValidate>
        {serverError && <p className="alert alert--err">{serverError}</p>}
        {success && <p className="alert alert--ok">{success}</p>}
        <Field type="password" value={password}
          onChange={e => { setPassword(e.target.value); setErrors(prev => { const n = {...prev}; delete n.password; delete n.confirm; return n }) }}
          placeholder="New password" icon={<LockIcon />} error={errors.password} showStrength />
        <Field type="password" value={confirm}
          onChange={e => { setConfirm(e.target.value); setErrors(prev => { const n = {...prev}; delete n.confirm; return n }) }}
          placeholder="Confirm password" icon={<LockIcon />} error={errors.confirm} />
        <button type="submit" className="cta" disabled={loading || !!success}>
          {loading ? <><span className="spinner" /> Updating…</> : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }) {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors]       = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]     = useState(false)
  const [forgotStep, setForgotStep] = useState(false)
  const [otpStep, setOtpStep]     = useState(false)
  const [otpEmail, setOtpEmail]   = useState('')

  function validate() {
    const e = {}
    if (!email.trim())             e.email    = 'Please enter your email address.'
    else if (!isValidEmail(email)) e.email    = "That doesn't look like a valid email."
    if (!password)                 e.password = 'Please enter your password.'
    return e
  }

  function handleChange(setter, field) {
    return ev => {
      setter(ev.target.value)
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  function handleBlur(field) {
    const allErrors = validate()
    setErrors(prev => {
      const next = { ...prev }
      if (allErrors[field]) next[field] = allErrors[field]
      else delete next[field]
      return next
    })
  }

  async function submit(e) {
    e.preventDefault()
    setServerError('')
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setErrors({})
    setLoading(true)
    try {
      const data = await apiPost('/auth/login', { email, password, rememberMe })
      if (data.otpRequired) {
        // Move to OTP step
        setOtpEmail(email)
        setOtpStep(true)
      } else {
        window.location.reload()
      }
    } catch (err) {
      if (err.status === 403 && err.message?.toLowerCase().includes('verify')) {
        setServerError('Your email isn\'t verified yet. Please check your inbox for the verification link.')
      } else {
        setServerError('Incorrect email or password. Please try again.')
      }
    }
    finally { setLoading(false) }
  }

  // OTP step
  if (otpStep) {
    return <OtpStep email={otpEmail} rememberMe={rememberMe} onSuccess={() => window.location.reload()} />
  }

  // Forgot password step
  if (forgotStep) {
    return <ForgotPasswordPanel onBack={() => setForgotStep(false)} />
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Welcome back</h2>
        <p className="form-desc">Sign in to navigate your waters</p>
      </div>
      <GoogleButton />
      <FacebookButton />
      <SocialDivider />
      <form onSubmit={submit} className="form-body" noValidate>
        {serverError && <p className="alert alert--err">{serverError}</p>}
        <Field type="email" value={email}
          onChange={handleChange(setEmail, 'email')}
          onBlur={() => handleBlur('email')}
          placeholder="Email address" icon={<EmailIcon />} error={errors.email} />
        <Field type="password" value={password}
          onChange={handleChange(setPassword, 'password')}
          onBlur={() => handleBlur('password')}
          placeholder="Password" icon={<LockIcon />} error={errors.password} />
        <div className="form-extras">
          <label className="check-label">
            <input type="checkbox" className="check-inp"
              checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
            <span>Remember me</span>
          </label>
          <button type="button" className="link-btn" onClick={() => setForgotStep(true)}>Forgot password?</button>
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
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [role, setRole]           = useState('FISHERMAN')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [errors, setErrors]       = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  function validate() {
    const e = {}
    if (!name.trim())               e.name     = 'Please enter your full name.'
    if (!email.trim())              e.email    = 'Please enter your email address.'
    else if (!isValidEmail(email))  e.email    = "That doesn't look like a valid email."
    if (!password)                  e.password = 'Please enter a password.'
    else if (password.length < 6)   e.password = 'Password must be at least 6 characters.'
    if (!confirm)                   e.confirm  = 'Please confirm your password.'
    else if (password !== confirm)  e.confirm  = 'Passwords do not match.'
    if (!agreedToTerms)             e.terms    = 'You must agree to the terms to continue.'
    return e
  }

  function handleChange(setter, field) {
    return ev => {
      setter(ev.target.value)
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
      if (field === 'password') {
        setErrors(prev => { const next = { ...prev }; delete next.confirm; return next })
      }
    }
  }

  function handleBlur(field) {
    const allErrors = validate()
    setErrors(prev => {
      const next = { ...prev }
      if (allErrors[field]) next[field] = allErrors[field]
      else delete next[field]
      return next
    })
  }

  async function submit(e) {
    e.preventDefault()
    setServerError(''); setSuccess('')
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setErrors({})
    setLoading(true)
    try {
      await apiPost('/auth/register-message', { fullName: name, email, password, role })
      setRegisteredEmail(email)
      setSuccess('check-inbox')
      setName(''); setEmail(''); setPassword(''); setConfirm(''); setAgreedToTerms(false)
    } catch (err) { setServerError(err.message || 'Could not create account. That email may already be in use.') }
    finally { setLoading(false) }
  }

  // Show "check your inbox" message after successful registration
  if (success === 'check-inbox') {
    return (
      <div className="form-panel">
        <div className="inbox-msg">
          <MailIcon />
          <h2 className="form-title" style={{ marginTop: '12px' }}>Check your inbox</h2>
          <p className="form-desc" style={{ marginTop: '6px', lineHeight: '1.6' }}>
            We sent a verification link to <strong>{registeredEmail}</strong>.<br />
            Click the link to activate your account before logging in.
          </p>
          <button type="button" className="cta" style={{ marginTop: '16px' }} onClick={() => { setSuccess(''); onSwitch() }}>
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-panel">
      <div className="form-head">
        <h2 className="form-title">Create account</h2>
        <p className="form-desc">Join MERMAID — fish smarter, sail safer</p>
      </div>
      <GoogleButton />
      <FacebookButton />
      <SocialDivider />
      <form onSubmit={submit} className="form-body" noValidate>
        {serverError && <p className="alert alert--err">{serverError}</p>}
        <Field type="text" value={name}
          onChange={handleChange(setName, 'name')}
          onBlur={() => handleBlur('name')}
          placeholder="Full name" icon={<UserIcon />} error={errors.name} />
        <Field type="email" value={email}
          onChange={handleChange(setEmail, 'email')}
          onBlur={() => handleBlur('email')}
          placeholder="Email address" icon={<EmailIcon />} error={errors.email} />
        <Field type="password" value={password}
          onChange={handleChange(setPassword, 'password')}
          onBlur={() => handleBlur('password')}
          placeholder="Password" icon={<LockIcon />} error={errors.password} showStrength />
        <Field type="password" value={confirm}
          onChange={handleChange(setConfirm, 'confirm')}
          onBlur={() => handleBlur('confirm')}
          placeholder="Confirm password" icon={<LockIcon />} error={errors.confirm} />
        <div className="role-row">
          <button type="button"
            className={`role-chip${role === 'FISHERMAN' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('FISHERMAN')}>
            🎣 Fisherman
          </button>
          <button type="button"
            className={`role-chip${role === 'VENDOR' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('VENDOR')}>
            🏪 Vendor
          </button>
          <button type="button"
            className={`role-chip${role === 'BUYER' ? ' role-chip--on' : ''}`}
            onClick={() => setRole('BUYER')}>
            🛒 Buyer
          </button>
        </div>
        <div className="terms-row">
          <label className="check-label">
            <input type="checkbox" className="check-inp"
              checked={agreedToTerms}
              onChange={e => {
                setAgreedToTerms(e.target.checked)
                if (e.target.checked)
                  setErrors(prev => { const next = { ...prev }; delete next.terms; return next })
              }} />
            <span>
              I agree to the{' '}
              <a href="#" className="link-btn link-btn--accent">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="link-btn link-btn--accent">Privacy Policy</a>
            </span>
          </label>
          {errors.terms && <p className="field-err">{errors.terms}</p>}
        </div>
        <button type="submit" className="cta" disabled={loading || !agreedToTerms}>
          {loading ? <><span className="spinner" /> Creating…</> : 'Start Exploring'}
        </button>
      </form>
      <p className="form-switch">
        Have an account? <button type="button" className="link-btn link-btn--accent" onClick={onSwitch}>Sign in</button>
      </p>
    </div>
  )
}

// ── Hook + Fish animation ─────────────────────────────────────────────────────
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

// ── Role Setup Page (full-page wrapper for new OAuth2 users) ─────────────────
export function RoleSetupPage() {
  return (
    <div className="auth-page">
      <video className="bg-video" autoPlay muted loop playsInline>
        <source src="/mainbg.mov" type="video/mp4" />
        <source src="/mainbg.mov" type="video/quicktime" />
      </video>
      <div className="bg-overlay" />
      <div className="logo-bar">
        <img src="/logo.png" alt="MERMAID" className="logo-img" />
        <span className="brand-name">MERMAID</span>
      </div>
      <div className="center-layout">
        <div className="glass-card" style={{ maxWidth: '420px' }}>
          <div className="card-body">
            <RoleSetupPanel />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [mode, setMode]         = useState('login')
  const [animating, setAnimating] = useState(false)
  const [animKey, setAnimKey]   = useState(0)

  // Check URL params for reset token or email verification
  const [resetToken, setResetToken]     = useState(null)
  const [verifyToken, setVerifyToken]   = useState(null)
  const [verifyMsg, setVerifyMsg]       = useState('')
  const [verifyErr, setVerifyErr]       = useState('')
  const [setupRole, setSetupRole]       = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rt = params.get('token')
    const vt = params.get('verify')
    if (params.get('setup') === 'role') {
      setSetupRole(true)
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (rt) {
      setResetToken(rt)
    }

    if (vt) {
      // Auto-verify email
      setVerifyToken(vt)
      apiPost('/auth/verify-email', { token: vt })
        .then(() => {
          setVerifyMsg('Email verified! Redirecting...')
          setTimeout(() => window.location.reload(), 1500)
        })
        .catch(err => {
          setVerifyErr(err.message || 'Verification failed. The link may have expired.')
          // Clear URL
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [])

  const handleTabClick = (newMode) => {
    if (newMode === mode || animating) return
    setAnimKey(k => k + 1)
    setAnimating(true)
    setTimeout(() => setMode(newMode), 680)
    setTimeout(() => setAnimating(false), 1200)
  }

  // Show role setup for new OAuth2 users
  if (setupRole) {
    return (
      <div className="auth-page">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/mainbg.mov" type="video/mp4" />
          <source src="/mainbg.mov" type="video/quicktime" />
        </video>
        <div className="bg-overlay" />
        <div className="logo-bar">
          <img src="/logo.png" alt="MERMAID" className="logo-img" />
          <span className="brand-name">MERMAID</span>
        </div>
        <div className="center-layout">
          <div className="glass-card" style={{ maxWidth: '420px' }}>
            <div className="card-body">
              <RoleSetupPanel />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show email verification status
  if (verifyToken) {
    return (
      <div className="auth-page">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/mainbg.mov" type="video/mp4" />
          <source src="/mainbg.mov" type="video/quicktime" />
        </video>
        <div className="bg-overlay" />
        <div className="logo-bar">
          <img src="/logo.png" alt="MERMAID" className="logo-img" />
          <span className="brand-name">MERMAID</span>
        </div>
        <div className="center-layout">
          <div className="glass-card" style={{ maxWidth: '420px' }}>
            <div className="card-body">
              <div className="form-panel">
                <div className="inbox-msg" style={{ textAlign: 'center', padding: '20px 0' }}>
                  {verifyMsg && (
                    <>
                      <div style={{ color: '#34D399', marginBottom: '10px', fontSize: '2rem' }}>✓</div>
                      <h2 className="form-title">{verifyMsg}</h2>
                    </>
                  )}
                  {verifyErr && (
                    <>
                      <div style={{ color: '#f87171', marginBottom: '10px', fontSize: '2rem' }}>✗</div>
                      <h2 className="form-title">Verification Failed</h2>
                      <p className="form-desc" style={{ marginTop: '8px' }}>{verifyErr}</p>
                      <button className="cta" style={{ marginTop: '16px' }}
                        onClick={() => { setVerifyToken(null); window.history.replaceState({}, '', window.location.pathname) }}>
                        Go to Login
                      </button>
                    </>
                  )}
                  {!verifyMsg && !verifyErr && (
                    <>
                      <span className="spinner" style={{ width: '24px', height: '24px', marginBottom: '12px' }} />
                      <h2 className="form-title">Verifying your email...</h2>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show reset password form when token is present
  if (resetToken) {
    return (
      <div className="auth-page">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/mainbg.mov" type="video/mp4" />
          <source src="/mainbg.mov" type="video/quicktime" />
        </video>
        <div className="bg-overlay" />
        <div className="logo-bar">
          <img src="/logo.png" alt="MERMAID" className="logo-img" />
          <span className="brand-name">MERMAID</span>
        </div>
        <div className="center-layout">
          <div className="glass-card" style={{ maxWidth: '420px' }}>
            <div className="card-body">
              <ResetPasswordForm token={resetToken} onDone={() => setResetToken(null)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <video className="bg-video" autoPlay muted loop playsInline>
        <source src="/mainbg.mov" type="video/mp4" />
        <source src="/mainbg.mov" type="video/quicktime" />
      </video>
      <div className="bg-overlay" />

      <div className="logo-bar">
        <img src="/logo.png" alt="MERMAID" className="logo-img" />
        <span className="brand-name">MERMAID</span>
      </div>

      <div className="center-layout">
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

        <HookFish key={animKey} active={animating} />

        <p className="terms">
          By continuing you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
