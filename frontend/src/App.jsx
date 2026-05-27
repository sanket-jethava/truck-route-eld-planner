import { useEffect, useState } from 'react'
import TripForm from './components/TripForm'
import TripHistory from './components/TripHistory'
import RouteMap from './components/RouteMap'
import TripSummary from './components/TripSummary'
import Timeline from './components/Timeline'
import DailyLogSheet from './components/DailyLogSheet'
import AuthPanel from './components/AuthPanel'
import { calculateTrip, fetchTripHistory, fetchTripDetails, logoutUser } from './services/api'
import { loginUser, registerUser } from './services/api'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [defaultCycleUsed, setDefaultCycleUsed] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem('spotter-access-token') || '')
  const [refreshToken, setRefreshToken] = useState(() => window.localStorage.getItem('spotter-refresh-token') || '')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const storedMode = window.localStorage.getItem('spotter-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = storedMode ? storedMode === 'dark' : prefersDark
    setIsDarkMode(initialDark)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    window.localStorage.setItem('spotter-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const getWeekKey = (date) => {
    const target = new Date(date)
    const utcTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()))
    const dayOfWeek = utcTarget.getUTCDay() || 7
    utcTarget.setUTCDate(utcTarget.getUTCDate() + 4 - dayOfWeek)
    const yearStart = new Date(Date.UTC(utcTarget.getUTCFullYear(), 0, 1))
    const weekNumber = Math.ceil((((utcTarget - yearStart) / 86400000) + 1) / 7)
    return `${utcTarget.getUTCFullYear()}-W${weekNumber}`
  }

  const calculateDefaultCycleUsed = (trips) => {
    const currentWeek = getWeekKey(new Date())
    return trips.reduce((sum, trip) => {
      if (!trip.start_datetime || typeof trip.drive_time_hours !== 'number') {
        return sum
      }
      const tripWeek = getWeekKey(new Date(trip.start_datetime))
      return tripWeek === currentWeek ? sum + trip.drive_time_hours : sum
    }, 0)
  }

  const loadHistory = async () => {
    if (!authToken) {
      setHistory([])
      setDefaultCycleUsed(0)
      return
    }
    setHistoryLoading(true)
    setHistoryError('')

    try {
      const data = await fetchTripHistory()
      setHistory(data)
      setDefaultCycleUsed(calculateDefaultCycleUsed(data))
    } catch (err) {
      setHistoryError(err.message || 'Unable to load trip history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSelectHistoryTrip = async (tripId) => {
    setDetailLoading(true)
    setError('')

    try {
      const data = await fetchTripDetails(tripId)
      setSelectedTripId(tripId)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Unable to load trip details')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    if (authToken) {
      loadHistory()
    }
  }, [])

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError('')
    setResult(null)
    setSelectedTripId(null)

    try {
      const payload = {
        ...formData,
        start_datetime: new Date(formData.start_datetime).toISOString(),
      }
      const response = await calculateTrip(payload)
      setResult(response)
      await loadHistory()
    } catch (err) {
      setError(err.message || 'Failed to generate route')
    } finally {
      setLoading(false)
    }
  }

  const saveAuthTokens = ({ access, refresh }) => {
    window.localStorage.setItem('spotter-access-token', access)
    window.localStorage.setItem('spotter-refresh-token', refresh)
    setAuthToken(access)
    setRefreshToken(refresh)
    setAuthError('')
  }

  const handleLogin = async (credentials) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await loginUser(credentials)
      saveAuthTokens(data)
      await loadHistory()
    } catch (err) {
      setAuthError(err.message || 'Login failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async (credentials) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      await registerUser(credentials)
      await handleLogin({ username: credentials.username, password: credentials.password })
    } catch (err) {
      setAuthError(err.message || 'Registration failed')
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutUser(refreshToken)
      }
    } catch (err) {
      // ignore server-side errors during logout
      console.warn('Logout API failed', err)
    }

    window.localStorage.removeItem('spotter-access-token')
    window.localStorage.removeItem('spotter-refresh-token')
    setAuthToken('')
    setRefreshToken('')
    setHistory([])
    setResult(null)
    setSelectedTripId(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Spotter</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Truck Route Planner & ELD Generator</h1>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
                Enter route details to calculate distance, required breaks, fuel stops, and FMCSA-compliant daily ELD logs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {isDarkMode ? 'Light mode' : 'Dark mode'}
              </button>
              {authToken ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:bg-slate-800 dark:text-red-400"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {!authToken ? (
          <AuthPanel onLogin={handleLogin} onRegister={handleRegister} loading={authLoading} error={authError} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <TripForm onSubmit={handleSubmit} loading={loading} defaultCycleUsed={defaultCycleUsed} history={history} />
            <div className="space-y-6">
              {error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-700 dark:bg-slate-900 dark:text-red-300">{error}</div>
              ) : null}
              <TripHistory
                trips={history}
                loading={historyLoading}
                error={historyError}
                selectedTripId={selectedTripId}
                onSelectTrip={handleSelectHistoryTrip}
              />
              

              {result ? (
                <div className="space-y-6">
                  <TripSummary route={result.route} logs={result.logs} />
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <RouteMap route={result.route} />
                  </div>
                  <Timeline timeline={result.timeline} />
                  <DailyLogSheet logs={result.logs} />
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-slate-600 dark:text-slate-400">Enter your route details and click Generate to view the map, timeline, and ELD logs.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
