import React, { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const STATUS_META = {
  1: { label: 'Off Duty', color: '#94a3b8' },
  2: { label: 'Sleeper', color: '#4338ca' },
  3: { label: 'Driving', color: '#2563eb' },
  4: { label: 'On Duty', color: '#f59e0b' },
}

function minutesFromMidnight(timestamp) {
  const date = new Date(timestamp)
  return date.getHours() * 60 + date.getMinutes()
}

export default function DailyLogSheet({ logs }) {
  const sheetRef = useRef(null)
  const width = 720
  const height = 140
  const pixelsPerMinute = width / 1440

  const normalizedLogs = Array.isArray(logs)
    ? logs.map((day) => ({
        day: day.day ?? day.day_number,
        date: day.date,
        events: day.events ?? day.log_data_json?.events ?? [],
      }))
    : []

  const handleExportPdf = async () => {
    if (!sheetRef.current) return
    const canvas = await html2canvas(sheetRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save('eld-log-sheet.pdf')
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daily ELD Log Sheets</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">FMCSA-style daily status bars for each duty day.</p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={!normalizedLogs.length}
          className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600"
        >
          Download PDF
        </button>
      </div>
      <div className="space-y-6" ref={sheetRef}>
        {normalizedLogs.map((day) => (
          <div key={`day-${day.day}`} className="rounded-3xl border border-slate-200 p-3 sm:p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Day {day.day}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{day.date}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_META).map(([status, meta]) => (
                  <div key={status} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-h-[140px] rounded-3xl bg-slate-50">
                <g>
                  {day.events.map((event, index) => {
                    const start = minutesFromMidnight(event.start)
                    const duration = event.duration_hours * 60
                    const x = start * pixelsPerMinute
                    const w = Math.max(duration * pixelsPerMinute, 2)
                    const color = STATUS_META[event.status]?.color || '#cbd5e1'
                    return (
                      <rect
                        key={`${event.type}-${index}`}
                        x={x}
                        y={24}
                        width={w}
                        height={32}
                        fill={color}
                        rx={8}
                      />
                    )
                  })}
                  {[0, 6, 12, 18, 24].map((hour) => (
                    <g key={hour} transform={`translate(${hour * 60 * pixelsPerMinute}, 0)`}>
                      <line x1={0} y1={0} x2={0} y2={72} stroke="#cbd5e1" strokeWidth="1" />
                      <text x={2} y={92} fontSize="10" fill="#475569">{hour.toString().padStart(2, '0')}:00</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
