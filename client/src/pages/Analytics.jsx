import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import CopyButton from '../components/CopyButton.jsx'
import { Stat } from './Dashboard.jsx'

const ACCENT = '#818cf8'
const GRID = 'rgba(148,163,184,.18)'
const TICK = { fill: '#94a3b8', fontSize: 12 }

function Breakdown({ title, rows }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {rows.length === 0 ? <div className="muted">No data yet</div> : (
        <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 38)}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={96} tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgba(148,163,184,.08)' }} contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }} />
            <Bar isAnimationActive={false} dataKey="count" name="Clicks" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

const EXAMPLES = ['Which referrer sends the most clicks?', 'How did traffic change over the period?', 'Which device and browser do visitors use?']

// Natural-language questions about this link's analytics, answered by the LLM from the aggregated numbers only.
function AskAI({ id }) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ask = async (question) => {
    if (question.trim().length < 3) return
    setBusy(true)
    setError('')
    setAnswer('')
    try {
      setAnswer((await api.askAI(id, question.trim())).answer)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card">
      <h3>✨ Ask AI about this link</h3>
      <form className="ask-row" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
        <input value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Where do most of my visitors come from?" />
        <button className="btn primary" disabled={busy || q.trim().length < 3}>{busy ? 'Thinking…' : 'Ask'}</button>
      </form>
      <div className="chips">
        {EXAMPLES.map((x) => <button key={x} type="button" className="chip" onClick={() => { setQ(x); ask(x) }}>{x}</button>)}
      </div>
      {error && <div className="alert">{error}</div>}
      {answer && <p className="ai-answer">{answer}</p>}
    </div>
  )
}

export default function Analytics() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [days, setDays] = useState(14)
  const [error, setError] = useState('')

  useEffect(() => {
    api.analytics(id, days).then(setData).catch((e) => setError(e.message))
  }, [id, days])

  if (error) return <div className="alert">{error} · <Link to="/dashboard">Back</Link></div>
  if (!data) return <div className="muted">Loading…</div>
  const { url, analytics: a } = data

  return (
    <>
      <Link to="/dashboard" className="muted">← All links</Link>
      <div className="page-head">
        <div>
          <h1 className="mono">/{url.shortCode}</h1>
          <div className="muted dest-long">{url.originalUrl}</div>
        </div>
        <CopyButton text={url.shortUrl} label="Copy short link" />
      </div>

      <div className="stats">
        <Stat label="Total clicks" value={a.totalClicks} />
        <Stat label={`Last ${days} days`} value={a.clicksPerDay.reduce((s, d) => s + d.clicks, 0)} />
        <Stat label="Status" value={url.expired ? 'Expired' : url.isActive ? 'Active' : 'Disabled'} />
        <Stat label="Category" value={url.category} />
        <Stat label="AI risk score" value={`${Math.round(url.riskScore * 100)}%`} />
      </div>

      <div className="card">
        <div className="page-head tight">
          <h3>Clicks per day</h3>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={a.clicksPerDay} margin={{ left: -16, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }} />
            <Area isAnimationActive={false} type="monotone" dataKey="clicks" name="Clicks" stroke={ACCENT} strokeWidth={2} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <AskAI id={url.id} />

      <div className="grid-2">
        <Breakdown title="Top referrers" rows={a.referrers} />
        <Breakdown title="Devices" rows={a.devices} />
        <Breakdown title="Browsers" rows={a.browsers} />
        <Breakdown title="Operating systems" rows={a.os} />
      </div>

      <div className="card table-wrap">
        <h3>Recent clicks</h3>
        {a.recent.length === 0 ? <div className="muted">No clicks yet. Open the short link to see it appear here.</div> : (
          <table>
            <thead><tr><th>When</th><th>Referrer</th><th>Device</th><th>Browser</th><th>OS</th></tr></thead>
            <tbody>
              {a.recent.map((c, i) => (
                <tr key={i}>
                  <td>{new Date(c.timestamp).toLocaleString()}</td>
                  <td>{c.referrer}</td><td>{c.device}</td><td>{c.browser}</td><td>{c.os}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
