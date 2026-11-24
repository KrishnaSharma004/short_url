import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import LinkTable from '../components/LinkTable.jsx'

export default function Dashboard() {
  const [urls, setUrls] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.listUrls().then((r) => setUrls(r.urls)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const total = urls?.reduce((s, u) => s + u.clickCount, 0) ?? 0
  const active = urls?.filter((u) => u.isActive && !u.expired).length ?? 0

  return (
    <>
      <div className="page-head">
        <h1>Your links</h1>
        <Link className="btn primary" to="/create">+ New link</Link>
      </div>
      {error && <div className="alert">{error}</div>}
      {urls && (
        <div className="stats">
          <Stat label="Total links" value={urls.length} />
          <Stat label="Active" value={active} />
          <Stat label="Total clicks" value={total} />
        </div>
      )}
      {!urls ? <div className="muted">Loading…</div> : urls.length === 0 ? (
        <div className="card empty">
          <p>No links yet.</p>
          <Link className="btn primary" to="/create">Create your first link</Link>
        </div>
      ) : (
        <LinkTable urls={urls} onChange={load} />
      )}
    </>
  )
}

export function Stat({ label, value }) {
  return (
    <div className="card stat">
      <div className="stat-value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  )
}
