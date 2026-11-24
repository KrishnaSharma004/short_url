// Thin fetch wrapper. The JWT lives in an httpOnly cookie, so we only need credentials: 'include'.
const BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong', data.details)
  return data
}

export const api = {
  signup: (b) => request('POST', '/auth/signup', b),
  login: (b) => request('POST', '/auth/login', b),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),
  listUrls: () => request('GET', '/urls'),
  createUrl: (b) => request('POST', '/urls', b),
  checkUrl: (url) => request('POST', '/urls/check', { url }),
  suggestAlias: (url) => request('POST', '/urls/suggest-alias', { url }),
  askAI: (id, question) => request('POST', `/urls/${id}/ask`, { question }),
  updateUrl: (id, b) => request('PATCH', `/urls/${id}`, b),
  deleteUrl: (id) => request('DELETE', `/urls/${id}`),
  analytics: (id, days = 14) => request('GET', `/urls/${id}/analytics?days=${days}`),
  adminUrls: () => request('GET', '/admin/urls'),
  adminStats: () => request('GET', '/admin/stats'),
}
