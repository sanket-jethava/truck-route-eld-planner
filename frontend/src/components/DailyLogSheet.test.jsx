import React from 'react'
import { render, screen } from '@testing-library/react'
import DailyLogSheet from './DailyLogSheet'

describe('DailyLogSheet', () => {
  it('renders daily log headers and status bars', () => {
    const logs = [
      {
        day: 1,
        date: '2026-01-01',
        events: [
          { status: 3, type: 'drive', start: '2026-01-01T08:00:00', end: '2026-01-01T12:00:00', duration_hours: 4 },
          { status: 1, type: 'break', start: '2026-01-01T12:00:00', end: '2026-01-01T12:30:00', duration_hours: 0.5 },
        ],
      },
    ]

    render(<DailyLogSheet logs={logs} />)

    expect(screen.getByText(/day 1/i)).toBeInTheDocument()
    expect(screen.getByText('2026-01-01')).toBeInTheDocument()
    expect(screen.getByText(/off duty/i)).toBeInTheDocument()
    expect(screen.getByText(/driving/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
  })
})
