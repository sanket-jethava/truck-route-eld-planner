# Frontend (Vite + React)

This folder contains the React frontend for the Spotter Truck Route Planner.

## Local setup

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment

If the backend is running on a different port than `8000`, set the API base URL before starting Vite:

```bash
set VITE_API_BASE_URL=http://127.0.0.1:8001
npm run dev
```

## Docker

```bash
docker build -t spotter-frontend .
```

## Vercel

The frontend is configured for Vercel deployment using `vercel.json`.

The frontend uses TailwindCSS and React Leaflet for the map and dashboard.

## Theme

- Supports light/dark mode with a toggle button in the app header.
