import { Link } from 'react-router-dom'
import { api } from '../api'
import CopyButton from './CopyButton.jsx'

export default function LinkTable({ urls, onChange, showOwner }) {
  const toggle = async (u) => {
    await api.updateUrl(u.id, { isActive: !u.isActive })
    onChange()
  }
  const remove = async (u) => {
    if (!confirm(`Delete /${u.shortCode}? Its click history is deleted too.`)) return
    await api.deleteUrl(u.id)
    onChange()
  }

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Short link</th>
            <th>Destination</th>
            <th>Category</th>
            {showOwner && <th>Owner</th>}
            <th className="num">Clicks</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {urls.map((u) => (
            <tr key={u.id}>
              <td>
                <a href={u.shortUrl} target="_blank" rel="noreferrer" className="mono">/{u.shortCode}</a>
                {u.isCustomAlias && <span className="tag">alias</span>}
              </td>
              <td className="dest" title={u.originalUrl}>{u.originalUrl}</td>
              <td><span className="tag">{u.category}</span></td>
              {showOwner && <td className="muted">{u.owner?.email}</td>}
              <td className="num">{u.clickCount}</td>
              <td>
                {u.riskLevel === 'suspicious' && <span className="pill warn" title={`AI risk score ${Math.round(u.riskScore * 100)}%`}>Suspicious</span>}{' '}
                {u.expired ? <span className="pill warn">Expired</span>
                  : u.isActive ? <span className="pill ok">Active</span>
                  : <span className="pill off">Disabled</span>}
              </td>
              <td className="actions">
                <CopyButton text={u.shortUrl} />
                <Link className="btn ghost sm" to={`/links/${u.id}`}>Analytics</Link>
                <button className="btn ghost sm" onClick={() => toggle(u)}>{u.isActive ? 'Disable' : 'Enable'}</button>
                <button className="btn danger sm" onClick={() => remove(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
