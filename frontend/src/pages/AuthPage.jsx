import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import { IconSmartphone } from '../components/icons'

export default function AuthPage({ mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isRegister = mode === 'register'
  const justRegistered = Boolean(location.state?.registered)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (auth.isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  function validate() {
    const errors = {}
    if (isRegister) {
      const usernameValue = username.trim()
      if (usernameValue.length < 3 || usernameValue.length > 50) {
        errors.username = 'Username must be 3–50 characters.'
      }
      const displayName = name.trim()
      if (!displayName) {
        errors.name = 'Name is required.'
      } else if (displayName.length > 100) {
        errors.name = 'Name must be at most 100 characters.'
      }
      const mail = email.trim()
      if (!mail) {
        errors.email = 'Email is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        errors.email = 'Enter a valid email address.'
      }
    } else {
      const id = identifier.trim()
      if (!id) {
        errors.identifier = 'Enter your username or email.'
      } else if (id.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
        errors.identifier = 'Enter a valid email address or username.'
      }
    }
    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }
    if (isRegister && confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!validate()) return

    setLoading(true)
    try {
      if (isRegister) {
        await auth.register(username.trim(), password, email.trim(), name.trim())
        navigate('/login', { replace: true, state: { registered: true } })
      } else {
        await auth.login(identifier.trim(), password)
        navigate('/', { replace: true })
      }
    } catch (err) {
      if (err.status === 409) {
        setError('This username is already taken. Please choose another.')
      } else {
        setError(err.message || (isRegister ? 'Registration failed.' : 'Login failed.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[radial-gradient(1200px_500px_at_50%_-10%,var(--color-primary-light),transparent_70%)] min-[481px]:gap-6 min-[481px]:pb-6">
      <div className="w-full max-w-[400px] rounded-lg border border-border bg-surface p-5 shadow-lg min-[481px]:p-8">
        <div className="mb-5 flex justify-center min-[481px]:mb-8">
          <img
            src="/logo.png"
            alt="ShopManager logo"
            className="h-[84px] w-auto max-w-full object-contain [filter:drop-shadow(0_4px_12px_rgba(15,23,42,0.15))] min-[481px]:h-[100px]"
          />
        </div>
        <h1 className="mb-2 text-[22px]">
          {isRegister ? 'Create your shop account' : 'Sign in to your shop'}
        </h1>
        <p className="mb-6 text-sm text-secondary">
          {isRegister
            ? 'Register once and manage your shop’s products, stock and sales.'
            : 'Welcome back. Sign in with your username or email.'}
        </p>

        {error && (
          <div className="mb-4 rounded-sm border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
            {error}
          </div>
        )}

        {justRegistered && !isRegister && (
          <div className="mb-4 rounded-sm border border-[#bbf7d0] bg-primary-light px-4 py-3 text-sm text-[#166534]">
            Account created successfully. Please sign in.
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {isRegister ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="min-h-10 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="e.g. mohan_sweets"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(fieldErrors.username)}
              />
              {fieldErrors.username && (
                <span className="text-[13px] text-danger">{fieldErrors.username}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" htmlFor="identifier">
                Email or username
              </label>
              <input
                id="identifier"
                className="min-h-10 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="you@shop.com or username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                aria-invalid={Boolean(fieldErrors.identifier)}
              />
              {fieldErrors.identifier && (
                <span className="text-[13px] text-danger">{fieldErrors.identifier}</span>
              )}
            </div>
          )}

          {isRegister && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="min-h-10 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                type="text"
                autoComplete="name"
                placeholder="e.g. Mohan"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && (
                <span className="text-[13px] text-danger">{fieldErrors.name}</span>
              )}
            </div>
          )}

          {isRegister && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="min-h-10 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                type="email"
                autoComplete="email"
                placeholder="e.g. you@shop.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && (
                <span className="text-[13px] text-danger">{fieldErrors.email}</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                className="min-h-10 w-full rounded-sm border border-border bg-surface py-2 pr-16 pl-3 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-sm border-none bg-transparent px-2 py-1 text-[13px] font-semibold text-primary hover:bg-primary-light"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-[13px] text-danger">{fieldErrors.password}</span>
            )}
          </div>

          {isRegister && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                className="min-h-10 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
              {fieldErrors.confirmPassword && (
                <span className="text-[13px] text-danger">{fieldErrors.confirmPassword}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="mt-2 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (isRegister ? 'Creating account…' : 'Signing in…') : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to ShopManager?{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <a
          href="https://expo.dev/artifacts/eas/kJDJzOW5ygAF9ZjPusBt9ZmGMuyAY54TByBNY44KZSQ.apk"
          download="ShopManager.apk"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-800 shadow-sm transition-all hover:bg-emerald-100 hover:shadow"
        >
          <IconSmartphone size={16} />
          Direct Download Android App (.apk)
        </a>
        <p className="text-center text-[13px] text-muted">
          Your shop data is private to your account.
        </p>
      </div>
    </div>
  )
}