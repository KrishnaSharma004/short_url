import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import CopyButton from '../components/CopyButton.jsx'

export default function Create() {
  const [form, setForm] = useState({ url: '', alias: '', expiresAt: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const [risk, setRisk] = useState(null) // ML verdict for the URL in the form
  const [errorDetails, setErrorDetails] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Ask the server's ML model about the URL as soon as the user leaves the field.
  const checkRisk = async () => {
    setRisk(null)
    if (!/^https?:\/\//i.test(form.url.trim())) return
    try {
      setRisk((await api.checkUrl(form.url.trim())).risk)
    } catch {
      /* the submit handler reports validation problems */
    }
  }

  const suggest = async () => {
    setSuggesting(true)
    setSuggestions(null)
    try {
      setSuggestions(await api.suggestAlias(form.url.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setSuggesting(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setErrorDetails(null)
    setBusy(true)
    try {
      const body = { url: form.url }
      if (form.alias) body.alias = form.alias
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString()
      const { url, warning } = await api.createUrl(body)
      setCreated({ ...url, warning })
      setForm({ url: '', alias: '', expiresAt: '' })
      setRisk(null)
      setSuggestions(null)
    } catch (err) {
      setError(err.message)
      setErrorDetails(err.details || null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="narrow">
      <h1>Create a short link</h1>
      <form className="card stack" onSubmit={submit}>
        {error && (
          <div className="alert">
            {error}
            {errorDetails?.reasons?.length > 0 && (
              <ul className="reasons">{errorDetails.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            )}
          </div>
        )}
        <label>Destination URL
          <input required value={form.url} onChange={set('url')} onBlur={checkRisk} placeholder="https://example.com/a/very/long/link" />
        </label>
        {risk && risk.level !== 'safe' && (
          <div className={`alert ${risk.level === 'suspicious' ? 'warn' : ''}`}>
            <b>{risk.level === 'blocked' ? 'This link will be blocked' : 'This link looks suspicious'}</b>
            {' '}(AI risk score {Math.round(risk.score * 100)}%)
            {risk.reasons.length > 0 && <ul className="reasons">{risk.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          </div>
        )}
        {risk && risk.level === 'safe' && <div className="muted small">✓ AI safety check passed</div>}
        <div className="row-2">
          <label>Custom alias <span className="muted">(optional)</span>
            <input value={form.alias} onChange={set('alias')} placeholder="my-link" />
            <button type="button" className="btn ghost sm suggest" disabled={suggesting || !form.url} onClick={suggest}>
              {suggesting ? 'Thinking…' : '✨ Suggest aliases'}
            </button>
          </label>
          <label>Expires <span className="muted">(optional)</span>
            <input type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
          </label>
        </div>
        {suggestions && (
          <div className="chips">
            <span className="muted small">{suggestions.source === 'ai' ? 'AI suggestions:' : 'Suggestions:'}</span>
            {suggestions.suggestions.length === 0 && <span className="muted small">none available</span>}
            {suggestions.suggestions.map((a) => (
              <button type="button" key={a} className="chip" onClick={() => setForm({ ...form, alias: a })}>{a}</button>
            ))}
          </div>
        )}
        <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Shorten'}</button>
      </form>

      {created && (
        <div className="card success">
          <div className="muted">Your short link is ready</div>
          {created.warning && (
            <div className="alert warn">Flagged as suspicious by the AI safety check: visitors will see a warning before being redirected.</div>
          )}
          <div className="short-big">
            <a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a>
            <CopyButton text={created.shortUrl} />
          </div>
          <Link to={`/links/${created.id}`}>View analytics →</Link>
        </div>
      )}
    </div>
  )
}
