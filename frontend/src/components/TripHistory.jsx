export default function TripHistory({ trips, loading, error, selectedTripId, onSelectTrip }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Trips</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">View the latest generated routes and ELD summaries.</p>
        </div>
        {loading ? <span className="text-sm text-slate-500 dark:text-slate-400">Loading…</span> : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">{error}</div>
      ) : null}

      {trips.length > 0 ? (
        <ul className="space-y-3">
          {trips.map((trip) => {
            const isSelected = trip.id === selectedTripId
            return (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => onSelectTrip(trip.id)}
                  className={`w-full rounded-3xl border p-3 sm:p-4 text-left transition ${isSelected ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700'}`}
                >
                    <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-100">{trip.current_location} → {trip.pickup_location} → {trip.dropoff_location}</p>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Cycle used: {trip.current_cycle_used}h</p>
                    {trip.start_datetime ? (
                      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Start: {new Date(trip.start_datetime).toLocaleString()}</p>
                    ) : null}
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Created: {new Date(trip.created_at).toLocaleString()}</p>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No recent trips yet. Generate a trip to see history.</p>
      )}
    </section>
  )
}
