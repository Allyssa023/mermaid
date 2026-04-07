import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState('login');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'FISHERMAN',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        if (!form.email.trim() || !form.password) {
          setFormError('Email and password are required.');
          return;
        }
        await login(form.email.trim(), form.password);
      } else {
        if (!form.email.trim() || !form.password || !form.fullName.trim()) {
          setFormError('Email, password, and full name are required.');
          return;
        }
        if (form.password.length < 6) {
          setFormError('Password must be at least 6 characters.');
          return;
        }
        await register({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
        });
      }
    } catch {
      // Error shown via context
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setFormError('');
    clearError();
  };

  const displayError = formError || error;

  return (
    <div className="login-page">
      <header className="login-page__header">
        <div className="login-page__logo">
          <span className="login-page__logo-icon" aria-hidden />
          <span className="login-page__logo-text">MERMAID</span>
        </div>
        <nav className="login-page__nav">
          <a href="#home" className="login-page__nav-link">Home</a>
          <a href="#about" className="login-page__nav-link">About Us</a>
          <a href="#contact" className="login-page__nav-link">Contact</a>
          <a href="#shop" className="login-page__nav-link">Shop</a>
        </nav>
      </header>

      <div className="login-page__layout">
        <div className="login-page__scene">
          <img src="/boat.png" alt="Fishing boat" className="login-page__boat" />
        </div>

        <section className="login-page__content">
          <h1 className="login-page__title">
            Explore the underwater
          </h1>
          <p className="login-page__tagline">
            Sign in or create an account to access marine advisories, marketplace listings, and trip tools for safer, smarter fishing.
          </p>

          <form className="login-page__form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <div className="login-page__field">
                <label htmlFor="fullName" className="login-page__label">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="login-page__input"
                  placeholder="Juan Dela Cruz"
                  value={form.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="login-page__field">
              <label htmlFor="email" className="login-page__label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="login-page__input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
            <div className="login-page__field">
              <label htmlFor="password" className="login-page__label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="login-page__input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && (
                <span className="login-page__hint">At least 6 characters</span>
              )}
            </div>
            {mode === 'signup' && (
              <div className="login-page__field">
                <label className="login-page__label">Role</label>
                <div className="login-page__role-options">
                  <label className="login-page__role-option">
                    <input
                      type="radio"
                      name="role"
                      value="FISHERMAN"
                      checked={form.role === 'FISHERMAN'}
                      onChange={handleChange}
                    />
                    <span>Fisherman</span>
                  </label>
                  <label className="login-page__role-option">
                    <input
                      type="radio"
                      name="role"
                      value="VENDOR"
                      checked={form.role === 'VENDOR'}
                      onChange={handleChange}
                    />
                    <span>Vendor</span>
                  </label>
                </div>
              </div>
            )}
            {displayError && (
              <div className="login-page__error" role="alert">
                {displayError}
              </div>
            )}
            <button
              type="submit"
              className="login-page__submit"
              disabled={submitting}
            >
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Join now'}
            </button>
            <button
              type="button"
              className="login-page__switch"
              onClick={switchMode}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
