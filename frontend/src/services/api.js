const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

function getStoredToken() {
  return window.localStorage.getItem('spotter-access-token')
}

function getStoredRefresh() {
  return window.localStorage.getItem('spotter-refresh-token')
}

function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function refreshAccessToken() {
  const refresh = getStoredRefresh()
  if (!refresh) throw new Error('No refresh token available')

  const resp = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!resp.ok) {
    const payload = await resp.json().catch(() => null)
    throw new Error(payload?.detail || 'Unable to refresh token')
  }

  const data = await resp.json()
  if (data.access) {
    window.localStorage.setItem('spotter-access-token', data.access)
  }
  if (data.refresh) {
    window.localStorage.setItem('spotter-refresh-token', data.refresh)
  }
  return data.access
}

async function fetchWithAuth(url, opts = {}) {
  const options = { ...opts }
  options.headers = { ...(options.headers || {}), ...authHeaders() }

  let resp = await fetch(url, options)
  if (resp.status === 401) {
    try {
      await refreshAccessToken()
      options.headers = { ...(options.headers || {}), ...authHeaders() }
      resp = await fetch(url, options)
    } catch (e) {
      // refresh failed
      throw e
    }
  }
  return resp
}

export async function calculateTrip(body) {
  const response = await fetchWithAuth(`${BASE_URL}/api/trips/calculate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = payload?.detail || 'Unable to calculate trip'
    throw new Error(error)
  }
  return response.json()
}

export async function fetchTripHistory() {
  const response = await fetchWithAuth(`${BASE_URL}/api/trips/`, {})
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = payload?.detail || 'Unable to load trip history'
    throw new Error(error)
  }
  const data = await response.json()
  return data.results || []
}

export async function loginUser(body) {
  const response = await fetch(`${BASE_URL}/api/auth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = payload?.detail || 'Unable to log in'
    throw new Error(error)
  }
  return response.json()
}

export async function registerUser(body) {
  const response = await fetch(`${BASE_URL}/api/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = payload?.detail || 'Unable to register'
    throw new Error(error)
  }
  return response.json()
}

export async function fetchTripDetails(tripId) {
  const response = await fetchWithAuth(`${BASE_URL}/api/trips/${tripId}/`, {})
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = payload?.detail || 'Unable to load trip details'
    throw new Error(error)
  }
  return response.json()
}

export async function logoutUser(refreshToken) {
  const response = await fetch(`${BASE_URL}/api/auth/logout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = payload?.detail || 'Unable to logout'
    throw new Error(error)
  }
  return response.json()
}
