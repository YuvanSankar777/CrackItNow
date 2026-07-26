<h1 align="center">CrackItNow</h1>
<p align="center"><b>AI-powered mock technical interview platform</b></p>
<p align="center">Pick a company, sit a voice-led interview with an AI panelist, solve problems in a live in-browser IDE, and get an instant, scored report.</p>

---

## Overview

CrackItNow simulates a real technical interview end to end. You choose a target
company and difficulty, then an AI interviewer asks questions by voice, listens to
your spoken answers, and adapts as you go. Coding questions open a Monaco editor with
a real code runner and sample test cases. When you finish, Google Gemini produces a
full performance report — overall score, per-skill breakdown, strengths, areas for
growth, and a recommendation — and your dashboard tracks streaks and per-company
progress over time.

The interface uses a custom **Soft Clay** design language: light, tactile, molded
surfaces with a warm lavender palette.

## Features

- **Voice interview** — speak your answers (Web Speech API); the AI panelist speaks back
- **Adaptive AI engine** — Gemini generates questions, evaluates answers, and tunes difficulty live
- **In-browser IDE** — Monaco editor + real code execution (Judge0) across 10+ languages
- **Company-tuned prompts** — Google, Amazon, Microsoft, Meta, Apple, Netflix, Oracle, Salesforce, IBM, Adobe
- **Dashboard** — streaks, 365-day activity heatmap, per-company stats, scored reports
- **JWT auth** with automatic token refresh

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, React Router 7, Monaco Editor, Axios, Tailwind CSS v4 |
| Backend | Django 4.2, Django REST Framework, SimpleJWT |
| AI | Google Gemini |
| Code execution | Judge0 CE |
| Database | SQLite (dev) / PostgreSQL (prod) |

## Getting Started

### Prerequisites
- Python 3.10+ · Node.js 18+
- A **Gemini API key** — https://aistudio.google.com/app/apikey

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then add your keys
python manage.py migrate
python manage.py runserver     # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

The frontend talks to `http://localhost:8000/api` by default; override with
`VITE_API_URL` in `frontend/.env`.

> **Code execution** uses a public Judge0 instance out of the box, so the "Run" button
> works with no extra setup. For production, set your own `JUDGE0_API_*` values in
> `backend/.env` (see `.env.example`).

## Deployment (Render)

A `render.yaml` blueprint provisions the Django backend, the static React frontend, and
a PostgreSQL database in one step:

1. Push to GitHub.
2. Render → **New +** → **Blueprint** → select this repo.
3. Fill in the prompted env vars: `GEMINI_API_KEY` (backend) and `VITE_API_URL` (frontend
   → your backend URL + `/api`).
4. After the first deploy, set the backend's `FRONTEND_ORIGINS` to the frontend URL and redeploy.

## Project Structure

```
backend/
  config/            Django project (settings, urls, wsgi/asgi)
  apps/accounts/     Custom user + JWT auth
  apps/interviews/   Interview engine, Gemini + Judge0 services, dashboard
frontend/
  src/pages/         Landing, Auth, Companies, Setup, Interview, Results, Dashboard
  src/components/     Avatar, camera, charts, stat cards
  src/clay.css        Soft Clay design system
  src/api/client.js  Axios client with JWT auto-refresh
render.yaml          One-click Render deploy blueprint
```
