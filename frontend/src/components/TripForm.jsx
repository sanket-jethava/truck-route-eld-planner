import React, { useEffect, useState } from 'react'

const pad = (value) => value.toString().padStart(2, '0')
const formatLocalDateTime = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getInitialFormState = (defaultCycleUsed) => ({
  current_location: '',
  pickup_location: '',
  dropoff_location: '',
  current_cycle_used: defaultCycleUsed,
  start_datetime: formatLocalDateTime(new Date()),
})

export default function TripForm({ onSubmit, loading, defaultCycleUsed, history = [] }) {
  const [form, setForm] = useState(() => getInitialFormState(defaultCycleUsed))
  const minStartDateTime = formatLocalDateTime(new Date())
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const getWeekKey = (dateString) => {
    const target = new Date(dateString)
    const utcTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()))
    const dayOfWeek = utcTarget.getUTCDay() || 7
    utcTarget.setUTCDate(utcTarget.getUTCDate() + 4 - dayOfWeek)
    const yearStart = new Date(Date.UTC(utcTarget.getUTCFullYear(), 0, 1))
    const weekNumber = Math.ceil((((utcTarget - yearStart) / 86400000) + 1) / 7)
    return `${utcTarget.getUTCFullYear()}-W${weekNumber}`
  }

  const calculateWeekCycleUsed = (startDateTime) => {
    const targetWeek = getWeekKey(startDateTime)
    return history.reduce((sum, trip) => {
      if (!trip.start_datetime || typeof trip.drive_time_hours !== 'number') {
        return sum
      }
      const tripWeek = getWeekKey(trip.start_datetime)
      return tripWeek === targetWeek ? sum + trip.drive_time_hours : sum
    }, 0)
  }

  useEffect(() => {
    setForm((current) => ({ ...current, current_cycle_used: defaultCycleUsed }))
  }, [defaultCycleUsed])

  const selectedWeek = getWeekKey(form.start_datetime)

  useEffect(() => {
    const cycleUsed = calculateWeekCycleUsed(form.start_datetime)
    setForm((current) => ({ ...current, current_cycle_used: cycleUsed }))
  }, [form.start_datetime, history])

  const updateField = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: key === 'current_cycle_used' ? Number(event.target.value) : event.target.value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Enter trip details</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Calculate FMCSA-aware route, timeline, fuel stops, and ELD logs.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Current Location</span>
          <input
            type="text"
            value={form.current_location}
            onChange={updateField('current_location')}
            placeholder="Dallas, TX"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Pickup Location</span>
          <input
            type="text"
            value={form.pickup_location}
            onChange={updateField('pickup_location')}
            placeholder="Atlanta, GA"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Dropoff Location</span>
          <input
            type="text"
            value={form.dropoff_location}
            onChange={updateField('dropoff_location')}
            placeholder="Los Angeles, CA"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Trip Start Date & Time</span>
          <input
            type="datetime-local"
            value={form.start_datetime}
            onChange={updateField('start_datetime')}
            min={minStartDateTime}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Time is captured in your local timezone ({userTimeZone}) and normalized to UTC on submit.</p>
          <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">Selected week: {selectedWeek}</p>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Current Cycle Used (hours)</span>
          <input
            type="number"
            min="0"
            value={form.current_cycle_used}
            onChange={updateField('current_cycle_used')}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-700"
            required
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? 'Calculating...' : 'Generate Route & ELD'}
      </button>
    </form>
  )
}
