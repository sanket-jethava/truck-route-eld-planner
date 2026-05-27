import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TripForm from './TripForm'

describe('TripForm', () => {
  it('renders input fields and submit button', () => {
    render(<TripForm onSubmit={() => {}} loading={false} />)

    expect(screen.getByLabelText(/current location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/pickup location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dropoff location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/current cycle used/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate route/i })).toBeInTheDocument()
  })

  it('submits the form data', () => {
    const handleSubmit = vi.fn()
    render(<TripForm onSubmit={handleSubmit} loading={false} />)

    fireEvent.change(screen.getByLabelText(/current location/i), { target: { value: 'Dallas, TX' } })
    fireEvent.change(screen.getByLabelText(/pickup location/i), { target: { value: 'Atlanta, GA' } })
    fireEvent.change(screen.getByLabelText(/dropoff location/i), { target: { value: 'Los Angeles, CA' } })
    fireEvent.change(screen.getByLabelText(/current cycle used/i), { target: { value: 45 } })
    fireEvent.click(screen.getByRole('button', { name: /generate route/i }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
    expect(handleSubmit).toHaveBeenCalledWith({
      current_location: 'Dallas, TX',
      pickup_location: 'Atlanta, GA',
      dropoff_location: 'Los Angeles, CA',
      current_cycle_used: 45,
    })
  })
})
