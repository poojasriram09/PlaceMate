import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || '/api'

async function getAuthHeaders() {
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : null
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function request(path, options = {}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'Request failed')
  }
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  // File upload (no JSON content-type)
  upload: async (path, formData) => {
    const user = auth.currentUser
    const token = user ? await user.getIdToken() : null
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Upload failed' }))
      throw new Error(error.message || 'Upload failed')
    }
    return res.json()
  },
}
