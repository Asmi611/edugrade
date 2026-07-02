# EduGrade 🎓

**EduGrade** is an academic answer-sheet evaluation platform that automates grading using OCR and AI. It supports role-based workflows for **students**, **teachers**, and **admins**: exam scheduling, file-based answer submission, hybrid OCR handwritten-text extraction, and AI-powered grading via **Claude**.

---

## Features

- **Role-based dashboards** — Three portals: Admin, Teacher, Student
- **Smart exam scheduling** — Set scheduled and deadline times, auto-status (upcoming / open / closed)
- **File submission** — Upload images or PDFs (drag-and-drop on client), up to 10 MB
- **Hybrid OCR pipeline** — Microsoft TrOCR (handwriting) + OpenCV preprocessing (deskew, denoise, segmentation)
- **AI grading** — Claude API grades answers against a teacher-provided answer key (or auto-generates one)
- **Detailed feedback** — Score, grade letter, matched/missed key points, constructive feedback
- **Analytics** — Per-student score trends, improvement tracking, class-wide averages
- **Rate-limited API** — 100 requests per 15 minutes per IP
- **Docker Compose** — One-command production deployment

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Comes with Node.js |
| Python | 3.10+ | For OCR service |
| PostgreSQL | 13+ | [postgresql.org](https://www.postgresql.org/download/) |
| Docker | 24+ | *(Optional — for Docker Compose)* |

---

## Option A — Run Without Docker

### 1. Clone and install

```bash
git clone <your-repo-url> edugrade
cd edugrade

# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your own values (database creds, Anthropic API key, etc.)

# Client
cp client/.env.example client/.env
```

Key variables in `server/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/edugrade` |
| `JWT_SECRET` | Secret key for signing JWT tokens | *required — change in production* |
| `ANTHROPIC_API_KEY` | API key for Claude AI grading | *required for grading* |
| `OCR_SERVICE_URL` | URL of the OCR microservice | `http://localhost:8001` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

### 3. Set up the database

```bash
# Create the database
createdb -U postgres edugrade

# Apply schema — pick one:
#   Option A (recommended — no psql needed):
npm run db:init
#   Option B (if psql is available):
psql -U postgres -d edugrade -f server/db/schema.sql

# Seed admin account
cd server && node db/seed.js && cd ..
```

> **💡 Tip:** If `psql` is not on your PATH (common on Windows), use `npm run db:init` instead — it applies `schema.sql` through Node.js and doesn't need the `psql` CLI.

Or use the setup script (see [Automation](#automation) below).

### 4. Start the OCR service

```bash
cd ocr_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

> **Note:** The OCR service needs about 4 GB of RAM to load the TrOCR model. On first run it downloads `microsoft/trocr-large-handwritten` (~1.5 GB).

### 5. Start the application

Open **two terminals**:

**Terminal 1 — Server:**
```bash
cd server
npm run dev
```

**Terminal 2 — Client:**
```bash
cd client
npm run dev
```

Or one command from the root:
```bash
npm start
```

Then open **http://localhost:5173** and log in with:
- **Admin:** `admin@edugrade.com` / `Admin@123`
- **Teachers/Students:** Register via the UI (accounts require admin approval)

---

## Option B — Run With Docker Compose

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose)
- 8 GB+ RAM allocated to Docker (the OCR service loads a large model)
- An Anthropic API key for AI grading

### Start everything

```bash
# Set your Anthropic API key as an environment variable
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Start all services in the background
docker compose up --build -d

# Watch logs
docker compose logs -f
```

This starts five services:

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 15 database |
| `redis` | 6379 | Redis 7 (optional, for future job queue) |
| `ocr_service` | 8001 | Python FastAPI OCR microservice |
| `server` | 5000 | Node.js Express backend |
| `client` | 3000 | React frontend (served by Nginx) |

**Seed the admin account (first time only):**
```bash
docker compose exec server node db/seed.js
```

**Stop everything:**
```bash
docker compose down

# Remove volumes (destroys database data):
docker compose down -v
```

---

## Automation

A setup script automates the local development setup:

```bash
bash scripts/setup.sh
```

This will:
1. Check prerequisites (Node.js, npm, psql)
2. Install all npm dependencies
3. Copy `.env.example` → `.env` for server and client (if not already present)
4. Create the PostgreSQL database (if it doesn't exist)
5. Apply `schema.sql`
6. Seed the admin account

---

## Project Structure

```
edugrade/
├── client/                         # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── App.jsx                 # Route definitions (lazy-loaded)
│   │   ├── components/             # Shared components (ProtectedRoute)
│   │   ├── context/                # AuthContext (JWT management)
│   │   ├── lib/                    # API client (Axios), JWT helpers
│   │   └── pages/
│   │       ├── admin/              # Admin dashboard
│   │       ├── dashboards/         # Dashboard shells (AdminHome, TeacherHome, StudentHome)
│   │       ├── student/            # Student dashboard (exams, submit, results, analytics)
│   │       └── teacher/            # Teacher dashboard (exams, submissions, students)
│   ├── Dockerfile                  # Multi-stage Nginx build
│   ├── nginx.conf                  # Production Nginx config with /api proxy
│   └── .env.example
│
├── ocr_service/                    # Python FastAPI OCR microservice
│   ├── main.py                     # FastAPI app (POST /extract, GET /health)
│   ├── pipeline.py                 # Hybrid OCR pipeline (OpenCV + TrOCR)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
│
├── server/                         # Node.js Express backend
│   ├── index.js                    # Express app entry point
│   ├── routes/
│   │   ├── auth.js                 # Register/login/me
│   │   ├── admin.js                # User management, stats, platform oversight
│   │   ├── teacher.js              # Class/exam CRUD, grading trigger
│   │   └── student.js              # Exam listing, file submission, results, analytics
│   ├── services/
│   │   └── grader.js               # OCR + Claude grading engine
│   ├── middleware/
│   │   └── auth.js                 # JWT verification + role guard
│   ├── db/
│   │   ├── pool.js                 # PostgreSQL connection pool
│   │   ├── schema.sql              # Database schema (DDL)
│   │   ├── seed.js                 # Admin account seeder
│   │   └── init.js                 # Node.js schema runner (no psql needed)
│   ├── Dockerfile                  # Multi-stage production build
│   └── .env.example
│
├── scripts/
│   └── setup.sh                    # One-command local development setup
│
├── docker-compose.yml              # Full-stack Docker Compose
├── package.json                    # Root monorepo scripts (concurrently)
└── README.md
```

---

## API Reference

### Authentication

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | Public | Register student or teacher account |
| POST | `/api/auth/login` | Public | Log in, receive JWT |
| GET | `/api/auth/me` | JWT | Current user profile |

### Admin

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/users` | Admin | List users (filterable by `role`, `status`) |
| PATCH | `/api/admin/users/:id/status` | Admin | Approve/reject/pending user |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |
| DELETE | `/api/admin/users/:id` | Admin | Delete user (cannot delete self) |
| GET | `/api/admin/stats` | Admin | Platform-wide statistics |
| GET | `/api/admin/exams` | Admin | All exams with creator info |
| GET | `/api/admin/submissions` | Admin | All submissions with student/exam info |
| POST | `/api/admin/exams` | Admin | Create an exam |

### Teacher

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/teacher/classes` | Teacher | Teacher's classes with student counts |
| GET | `/api/teacher/students` | Teacher | Students in teacher's classes with avg scores |
| POST | `/api/exams` | Teacher | Create a new exam |
| GET | `/api/exams` | Teacher | List teacher's exams with submission stats |
| GET | `/api/exams/:id/submissions` | Teacher | Submissions for an exam |
| POST | `/api/exams/:id/grade-all` | Teacher | Trigger AI grading for all ungraded submissions |

### Student

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/student/exams` | Student | Exams for enrolled classes (with status) |
| POST | `/api/student/exams/:id/submit` | Student | Upload answer file (multipart, image/PDF) |
| GET | `/api/student/submissions` | Student | All submissions with exam title, score, status |
| GET | `/api/student/submissions/:id` | Student | Full detail: OCR text, score, feedback, key points |
| GET | `/api/student/analytics` | Student | Average score, trend, score breakdown |

### OCR Service

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| POST | `/extract` | Upload image/PDF, returns extracted text + confidence |

### Health

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | Public | API health + uptime |

---

## Testing the OCR Service

```bash
curl -X POST http://localhost:8001/extract \
  -F "file=@path/to/handwritten-answer.jpg"
```

Response:
```json
{
  "extracted_text": "The mitochondria is the powerhouse of the cell...",
  "confidence": 0.8723,
  "page_count": 1,
  "low_confidence_regions": []
}
```

---

## Deployment Guide

### Client → Vercel

```bash
# 1. Build the client
cd client
npm run build

# 2. Install Vercel CLI and deploy
npm i -g vercel
vercel --prod

# 3. Set environment variable in Vercel dashboard
#    VITE_API_URL = https://your-api.railway.app/api
```

### Server → Railway

```bash
# 1. Install Railway CLI or use GitHub integration
npm i -g @railway/cli

# 2. Deploy from the server directory
cd server
railway up

# 3. Set environment variables in Railway dashboard:
#    DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, OCR_SERVICE_URL, CLIENT_ORIGIN
```

### OCR Service → Railway (separate service)

```bash
# Deploy as a separate Railway service from ocr_service/
cd ocr_service
railway up

# Set the OCR_SERVICE_URL in the server's Railway dashboard to this service's URL
```

### Database → Supabase

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string**
3. Copy the URI connection string
4. Set `DATABASE_URL` and `PGSSL=true` in your server's environment
5. Run schema.sql against the Supabase database:
   ```bash
   psql "$SUPABASE_CONNECTION_STRING" -f server/db/schema.sql
   ```

---

## Troubleshooting

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `psql: command not found` | PostgreSQL CLI not installed | Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/) |
| `password authentication failed for user "postgres"` | Wrong password in `.env` | Set `PGPASSWORD` in `server/.env` to match your PostgreSQL install password |
| `ECONNREFUSED :8001` | OCR service not running | Start OCR service: `cd ocr_service && uvicorn main:app --port 8001` |
| `429 Too Many Requests` | Rate limit exceeded | Wait 15 minutes or increase `max` in `server/index.js` |
| Grading returns `score: null` | OCR service not reachable or Claude API key missing | Check `OCR_SERVICE_URL` and `ANTHROPIC_API_KEY` in `server/.env` |
| `JWT_SECRET is not set` warning | Missing `JWT_SECRET` in `.env` | Add a long random string to `server/.env` |
| TrOCR model download fails | Insufficient disk space or network | Ensure 2 GB+ free space; check internet connection |
| Docker build fails for `ocr_service` | Out of memory | Increase Docker memory to 8 GB+ in Docker Desktop settings |
| `npm install` installs to wrong directory | Running from wrong folder | Ensure you're in `edugrade/` (contains root `package.json`) |

