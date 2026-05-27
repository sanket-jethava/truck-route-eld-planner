import React from 'react'
import { MapContainer, Polyline, TileLayer, Tooltip, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const STATUS_COLORS = {
  current: '#0f172a',
  pickup: '#2563eb',
  dropoff: '#1d4ed8',
  fuel: '#f97316',
}

function normalizeRouteCoordinates(route) {
  const coords = route?.coordinates || []
  if (coords.length) return coords

  const geometry = route?.geometry
  if (!geometry) return []

  if (Array.isArray(geometry.coordinates)) return geometry.coordinates
  if (geometry.type === 'Feature' && Array.isArray(geometry.geometry?.coordinates)) return geometry.geometry.coordinates
  return []
}

export default function RouteMap({ route }) {
  const coordinates = normalizeRouteCoordinates(route)
  const path = coordinates.map(([lon, lat]) => [lat, lon])
  const currentLocation = route?.start ? [route.start[0], route.start[1]] : path[0]
  const pickupLocation = route?.pickup ? [route.pickup[0], route.pickup[1]] : null
  const dropoffLocation = route?.end ? [route.end[0], route.end[1]] : path[path.length - 1]
  const fuelLocations = route?.fuel_stop_coords?.map(([lat, lon]) => [lat, lon]) || []
  const center = path.length ? path[Math.floor(path.length / 2)] : [39.5, -98.35]

  return (
    <div className="h-64 sm:h-[420px] rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%', borderRadius: '24px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {path.length > 0 && (
          <Polyline positions={path} pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.82 }} />
        )}

        {currentLocation && (
          <CircleMarker center={currentLocation} pathOptions={{ color: STATUS_COLORS.current, fillColor: STATUS_COLORS.current }} radius={10}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
              Current Location
            </Tooltip>
          </CircleMarker>
        )}
        {pickupLocation && (
          <CircleMarker center={pickupLocation} pathOptions={{ color: STATUS_COLORS.pickup, fillColor: STATUS_COLORS.pickup }} radius={10}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
              Pickup
            </Tooltip>
          </CircleMarker>
        )}
        {dropoffLocation && (
          <CircleMarker center={dropoffLocation} pathOptions={{ color: STATUS_COLORS.dropoff, fillColor: STATUS_COLORS.dropoff }} radius={10}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
              Dropoff
            </Tooltip>
          </CircleMarker>
        )}
        {fuelLocations.map((loc, index) => (
          <CircleMarker key={`fuel-${index}`} center={loc} pathOptions={{ color: STATUS_COLORS.fuel, fillColor: STATUS_COLORS.fuel }} radius={8}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
              Fuel Stop
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
