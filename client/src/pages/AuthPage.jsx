import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { login, signup } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isSignup) await signup(form)
      else await login({ email: form.email, password: form.password })
      nav('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">{isSignup ? 'Start shortening and tracking links.' : 'Log in to manage your links.'}</p>
        {error && <div className="alert">{error}</div>}
        {isSignup && (
          <label>Full name
            <input required value={form.name} onChange={set('name')} placeholder="Ada Lovelace" autoComplete="name" />
          </label>
        )}
        <label>Email
          <input required type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label>Password
          <input required type="password" minLength={isSignup ? 8 : 1} value={form.password} onChange={set('password')}
            placeholder={isSignup ? 'At least 8 characters' : '••••••••'} autoComplete={isSignup ? 'new-password' : 'current-password'} />
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}</button>
        <p className="muted center-text">
          {isSignup ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Create an account</Link></>}
        </p>
      </form>
    </div>
  )
}
