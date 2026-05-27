import { useState } from 'react'

export default function AuthPanel({ onLogin, onRegister, loading, error }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (mode === 'login') {
      onLogin({ username: form.username, password: form.password })
    } else {
      onRegister({ username: form.username, email: form.email, password: form.password })
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900" style={{ width: '400px', margin: '40px auto' }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Account Access</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Log in or register to secure the Spotter API and access saved trips.
          </p>
        </div>
        <div className="flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {['login', 'register'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === tab ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
            >
              {tab === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Username</span>
          <input
            type="text"
            value={form.username}
            onChange={updateField('username')}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
        </label>

        {mode === 'register' ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
              required
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={updateField('password')}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
        </label>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-slate-900 dark:text-red-300">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:inline-flex items-center justify-center rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Submitting...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
