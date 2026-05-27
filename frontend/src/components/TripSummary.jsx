import React from 'react'

export default function TripSummary({ route, logs }) {
  const fuelStops = route?.distance_miles ? Math.floor(route.distance_miles / 1000) : 0
  const totalDays = logs?.length || 0
  
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Distance</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{route?.distance_miles?.toFixed(0) ?? '--'} mi</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Drive Time</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{ route?.duration_hours ? route?.duration_hours?.toFixed(1) : (route?.drive_time_hours ? route?.drive_time_hours?.toFixed(1) : '--') } hr</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Fuel Stops</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{fuelStops}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Approximate</p>
      </div>
      <div className="sm:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Days Required</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{totalDays}</p>
      </div>
    </div>
  )
}
