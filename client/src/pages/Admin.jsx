import { useEffect, useState } from 'react'
import { api } from '../api'
import LinkTable from '../components/LinkTable.jsx'
import { Stat } from './Dashboard.jsx'

export default function Admin() {
  const [urls, setUrls] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    api.adminUrls().then((r) => setUrls(r.urls)).catch((e) => setError(e.message))
    api.adminStats().then(setStats).catch(() => {})
  }
  useEffect(load, [])

  return (
    <>
      <div className="page-head"><h1>Admin · all links</h1></div>
      {error && <div className="alert">{error}</div>}
      {stats && (
        <div className="stats">
          <Stat label="Users" value={stats.users} />
          <Stat label="Links" value={stats.urls} />
          <Stat label="Clicks" value={stats.clicks} />
        </div>
      )}
      {!urls ? <div className="muted">Loading…</div> : <LinkTable urls={urls} onChange={load} showOwner />}
    </>
  )
}
