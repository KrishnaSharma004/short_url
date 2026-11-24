import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <span className="logo">🔗</span> Snip
          </Link>
          <nav className="nav-links">
            {user ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/create">New link</NavLink>
                {user.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
                <span className="muted hide-sm">{user.name}</span>
                <button className="btn ghost sm" onClick={async () => { await logout(); nav('/login') }}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <NavLink to="/signup" className="btn primary sm">Sign up</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  )
}
