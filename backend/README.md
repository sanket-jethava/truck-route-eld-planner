# Backend (Django)

This folder contains the Django project, apps, and service modules.

Quick start (local virtualenv):

```bash
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Docker:

```bash
docker build -t spotter-backend .
```

Environment variables are read from the root `.env` file.
