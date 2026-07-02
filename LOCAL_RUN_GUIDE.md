# EduGrade — Local Run Guide

A step-by-step guide to run the EduGrade platform locally on **Mac/Linux** or **Windows**.

---

## Prerequisites

### All platforms

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Comes with Node.js |
| Python | 3.10+ | [python.org](https://python.org) |
| PostgreSQL | 13+ | See platform-specific below |

### Mac

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Verify
psql --version
pg_isready
```

### Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-client

# Start PostgreSQL
sudo systemctl start postgresql

# Verify
psql --version
pg_isready
```

### Windows

1. Download PostgreSQL from [postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer. Recommended options:
   - Components: ✅ PostgreSQL Server, ✅ pgAdmin 4, ✅ Command Line Tools
   - Password: Set `postgres` (to match the project defaults)
   - Port: 5432 (default)
3. After install, restart PowerShell to pick up the PATH
4. Verify:
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version
   ```
   (Adjust version number as needed)

---

## Database Setup

### Mac / Linux

```bash
# Create the database
createdb -U postgres edugrade
```

### Windows (PowerShell)

```powershell
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres edugrade
```

You'll be prompted for the password you set during installation.

---

## Environment Configuration

### 1. Server

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and fill in at minimum:

```env
# Database (adjust if your PostgreSQL password differs)
PGPASSWORD=postgres

# Auth — use a long random string
JWT_SECRET=your-super-secret-key-change-this-in-production

# Anthropic API key (required for AI grading)
# Get one at: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OCR service URL (leave as default for local dev)
OCR_SERVICE_URL=http://localhost:8001
```

### 2. Client

```bash
cd client
cp .env.example .env
```

The default `client/.env` is fine for local development:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. OCR Service (optional — no .env needed)

The OCR service uses no environment variables — it runs on port 8001 by default.

---

## Install Dependencies

### All-in-one (root project)

```bash
cd edugrade    # ensure you're in the project root

# Install root tools (concurrently)
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### OCR service (Python)

```bash
cd ocr_service

# Create a virtual environment (recommended)
python -m venv venv

# Activate it:
#   Mac/Linux:  source venv/bin/activate
#   Windows:    venv\Scripts\activate

# Install Python deps
pip install -r requirements.txt
```

> **Note:** The OCR service downloads a ~1.5 GB TrOCR model on first run.
> Ensure you have at least 4 GB of free RAM.

---

## Apply Schema & Seed Admin

### Option A — Node.js (recommended, no psql needed)

```bash
# From project root
npm run db:init
npm run db:seed
```

### Option B — psql CLI

```bash
# From project root
cd server
psql -U postgres -d edugrade -f db/schema.sql
node db/seed.js
cd ..
```

Default admin credentials:
- **Email:** `admin@edugrade.com`
- **Password:** `Admin@123`

---

## Start the Services

You need **3 terminals**.

### Terminal 1 — Server (Express API)

```bash
cd edugrade/server
npm run dev
```

Expected output:
```
[nodemon] 3.x.x
[nodemon] starting `node index.js`
[edugrade-api] Listening on http://localhost:5000
[edugrade-api] CORS allowed origin: http://localhost:5173
```

**Verify:**
```bash
curl http://localhost:5000/api/health
# => {"status":"ok","service":"edugrade-api",...}
```

### Terminal 2 — Client (React + Vite)

```bash
cd edugrade/client
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in XXXms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser.

### Terminal 3 — OCR Service (Python FastAPI)

Make sure dependencies are installed first (one-time):
```bash
cd edugrade/ocr_service
pip install -r requirements.txt
```

Then start the service:
```bash
cd edugrade/ocr_service

# Activate virtual environment (if using one):
#   Mac/Linux:  source venv/bin/activate
#   Windows:    venv\Scripts\activate

uvicorn main:app --host 0.0.0.0 --port 8001
```

Expected output (after model loads):
```
[pipeline] Loading TrOCR on cpu ...
[pipeline] Ready.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**Verify:**
```bash
curl http://localhost:8001/health
# => {"status":"ok"}
```

---

## Quick-Start (Single Command)

### Path A — Docker (all 3 services)

```bash
docker compose up --build -d
```

This starts server (5000), client (3000), OCR service (8001), PostgreSQL, and Redis.

### Path B — npm (server + client only, no OCR)

```bash
npm start    # starts server (port 5000) + client (port 5173) in one terminal
```

> `npm start` does **not** start the OCR service. You'll still need **Terminal 3** below to run OCR separately.

---

## First-Time User Flow

1. **Open** http://localhost:5173
2. **Login as admin:** `admin@edugrade.com` / `Admin@123`
3. **Navigate to** the Admin dashboard → Users
4. **Create a teacher account:**
   - Go to `/register`
   - Fill in name, email, password, role: Teacher
   - Add at least one class (name + subject)
   - Submit
5. **Approve the teacher:** In Admin → Users, change status from "Pending" to "Approved"
6. **Create a student account:**
   - Go to `/register`
   - Fill in name, email, password, role: Student
   - Submit
7. **Approve the student** in Admin → Users
8. **Login as teacher**, go to Exams → Create Exam
   - Pick your class, set a title, deadline
   - Add an answer key or toggle "AI generate answer key"
9. **Login as student**, go to My Exams
   - You should see the exam. Click "Submit Answer"
   - Upload an image or PDF of a handwritten answer
10. **Wait for grading** — the page polls for completion
11. **View results** in My Results

---

## How to Verify Each Service

| Service | URL | Expected Response |
|---------|-----|-------------------|
| Server | `http://localhost:5000/api/health` | `{"status":"ok","service":"edugrade-api",...}` |
| Client | `http://localhost:5173` | EduGrade landing page |
| OCR | `http://localhost:8001/health` | `{"status":"ok"}` |
| DB | `psql -U postgres -d edugrade -c "\\dt"` | List of 6 tables |

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `psql: command not found` | PostgreSQL CLI not on PATH | Install PostgreSQL or use `npm run db:init` instead |
| `password authentication failed for user "postgres"` | Wrong password in `server/.env` | Set `PGPASSWORD` to the password you chose during PostgreSQL install |
| `ECONNREFUSED :8001` | OCR service not running | Start it: `cd ocr_service && uvicorn main:app --port 8001` |
| `ECONNREFUSED :5000` | Server not running | Start it: `cd server && npm run dev` |
| `Cannot find module 'express'` | Dependencies not installed | Run `cd server && npm install` |
| `VITE_API_URL env var mismatch` | Wrong env var name | Ensure `client/.env` has `VITE_API_URL` (not `VITE_API_BASE_URL`) |
| `429 Too Many Requests` | Rate limit hit | Wait 15 minutes or adjust `max` in `server/index.js` |
| Grading returns `score: null` | OCR or Claude API unavailable | Check `OCR_SERVICE_URL` and `ANTHROPIC_API_KEY` in `server/.env` |
| `CUDA out of memory` | GPU running TrOCR | OCR falls back to CPU automatically (slower but works) |
| `[grader] WARNING: CLAUDE_API_KEY is not set` | Missing Anthropic API key | Add `ANTHROPIC_API_KEY` to `server/.env` |
| `npm install` installs to wrong directory | Running from wrong folder | Ensure you're in `edugrade/` (look for root `package.json`) |

---

## Quick Reference — Key Files

| File | Purpose |
|------|---------|
| `server/.env` | Database, API keys, CORS config |
| `client/.env` | API base URL for the frontend |
| `server/db/schema.sql` | Database schema (6 tables) |
| `server/db/seed.js` | Creates default admin account |
| `server/db/init.js` | Applies schema via Node.js (no psql) |
| `docker-compose.yml` | Full-stack Docker deployment |
| `scripts/setup.sh` | Automated local setup |
