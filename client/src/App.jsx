import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Create from './pages/Create.jsx'
import Admin from './pages/Admin.jsx'

// charts library is heavy, load it only when the analytics page is opened
const Analytics = lazy(() => import('./pages/Analytics.jsx'))

function Protected({ children, admin }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center muted">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (admin && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return children
}

function Guest({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center muted">Loading…</div>
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="center muted">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Guest><AuthPage mode="login" /></Guest>} />
        <Route path="/signup" element={<Guest><AuthPage mode="signup" /></Guest>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/create" element={<Protected><Create /></Protected>} />
        <Route path="/links/:id" element={<Protected><Analytics /></Protected>} />
        <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
        <Route path="*" element={<div className="center muted">Page not found</div>} />
      </Routes>
      </Suspense>
    </Layout>
  )
}
