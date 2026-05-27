# Truck Route Planner & ELD Log Generator

This repository contains a scaffold for the Truck Route Planner & ELD Log Generator.

Structure
- `backend/` — Django backend and services
- `frontend/` — Vite + React frontend
- `docs/` — project notes and FMCSA references

## Quick start

Backend:
```bash
cd backend
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
python manage.py check
python manage.py runserver
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

See the `backend/README.md` and `frontend/README.md` for more details.

## Deployment

### Docker Compose

```bash
docker-compose up --build
```

This starts:
- backend on `http://localhost:8000`
- frontend on `http://localhost:4173`

### Render + Vercel

- Backend: `render.yaml`
- Frontend: `vercel.json`

Configure Render environment variables: `DATABASE_URL`, `ORS_BASE_URL`, `ORS_API_KEY`, `SECRET_KEY`, `DEBUG`
