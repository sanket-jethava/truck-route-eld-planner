import React from 'react'

const ICONS = {
  drive: '🚛',
  break: '☕',
  rest: '🛌',
  fuel: '⛽',
  pickup: '📦',
  delivery: '📦',
}

const LABELS = {
  drive: 'Driving',
  break: 'Mandatory Break',
  rest: 'Off Duty / Rest',
  fuel: 'Fuel Stop',
  pickup: 'Pickup',
  delivery: 'Delivery',
}

export default function Timeline({ timeline }) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trip Timeline</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Chronological HOS events, breaks, and stops.</p>
      </div>
      <div className="space-y-3">
        {timeline.map((event, index) => (
          <div key={`${event.type}-${index}`} className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[auto_1fr_auto] dark:border-slate-700 dark:bg-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm dark:bg-slate-700">{ICONS[event.type] || '📌'}</div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{LABELS[event.type] || event.type}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{new Date(event.start).toLocaleString()} — {new Date(event.end).toLocaleString()}</p>
            </div>
            <div className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">{event.duration_hours?.toFixed(1)} hr</div>
          </div>
        ))}
      </div>
    </div>
  )
}
