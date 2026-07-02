#!/usr/bin/env bash
# =============================================================================
# EduGrade — Local Setup Script
# =============================================================================
# Run this script from the project root to:
#   1. Install all dependencies (root + client + server)
#   2. Copy .env.example → .env for client and server
#   3. Apply schema.sql to a local PostgreSQL database
#   4. Seed the default admin account
#
# Usage:
#   bash scripts/setup.sh
#
# Prerequisites:
#   - Node.js 18+
#   - npm 9+
#   - Python 3.10+ (for OCR service)
#   - PostgreSQL 13+ running locally
#   - psql CLI available on PATH
# =============================================================================

set -euo pipefail

# Colours for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

info()  { echo -e "${CYAN}[setup]${NC} $1"; }
ok()    { echo -e "${GREEN}[setup] ✓${NC} $1"; }
warn()  { echo -e "${YELLOW}[setup] ⚠${NC} $1"; }
fail()  { echo -e "${RED}[setup] ✗${NC} $1"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
info "Checking prerequisites ..."

command -v node  >/dev/null 2>&1 || fail "Node.js is required. Install from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || fail "npm is required (comes with Node.js)"
command -v psql  >/dev/null 2>&1 || fail "psql is required. Install PostgreSQL from https://www.postgresql.org/download/"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    fail "Node.js 18+ required (found $(node -v)). Upgrade from https://nodejs.org"
fi
ok "Node.js $(node -v), npm $(npm -v)"

# ---------------------------------------------------------------------------
# 2. Install root dependencies (concurrently)
# ---------------------------------------------------------------------------
info "Installing root dependencies ..."
npm install
ok "Root dependencies installed"

# ---------------------------------------------------------------------------
# 3. Install server dependencies
# ---------------------------------------------------------------------------
info "Installing server dependencies ..."
cd server
npm install
cd ..
ok "Server dependencies installed"

# ---------------------------------------------------------------------------
# 4. Install client dependencies
# ---------------------------------------------------------------------------
info "Installing client dependencies ..."
cd client
npm install
cd ..
ok "Client dependencies installed"

# ---------------------------------------------------------------------------
# 5. Copy .env.example → .env (if not already present)
# ---------------------------------------------------------------------------
info "Setting up environment files ..."

if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    ok "server/.env created from server/.env.example"
    warn "   → Edit server/.env to set your actual DATABASE_URL and ANTHROPIC_API_KEY"
else
    ok "server/.env already exists — keeping your configuration"
fi

if [ ! -f client/.env ]; then
    cp client/.env.example client/.env
    ok "client/.env created from client/.env.example"
else
    ok "client/.env already exists — keeping your configuration"
fi

# ---------------------------------------------------------------------------
# 6. Create database and apply schema
# ---------------------------------------------------------------------------
info "Setting up PostgreSQL database ..."

DB_NAME="${PGDATABASE:-edugrade}"
DB_USER="${PGUSER:-postgres}"

# Create the database if it doesn't exist
psql -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null \
    | grep -q 1 \
    && ok "Database '$DB_NAME' already exists" \
    || {
        createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null \
            && ok "Database '$DB_NAME' created" \
            || warn "Could not create database. You may need to create it manually: createdb -U $DB_USER $DB_NAME"
    }

# Apply schema (try psql first, fall back to Node.js)
info "Applying schema.sql ..."

schema_applied=false

if command -v psql &>/dev/null; then
    info "Trying psql..."
    psql -U "$DB_USER" -d "$DB_NAME" -f server/db/schema.sql 2>&1 && schema_applied=true
fi

if [ "$schema_applied" = false ]; then
    info "Trying Node.js fallback (npm run db:init)..."
    (cd server && node db/init.js 2>&1) && schema_applied=true
fi

if [ "$schema_applied" = true ]; then
    ok "Schema applied successfully"
else
    warn "Could not apply schema. Check your PostgreSQL connection in server/.env"
    echo "  To retry manually: npm run db:init"
fi

# ---------------------------------------------------------------------------
# 7. Seed admin account
# ---------------------------------------------------------------------------
info "Seeding default admin account ..."
cd server
node db/seed.js 2>/dev/null \
    && ok "Admin seeded" \
    || warn "Seed failed. You can retry later with: cd server && node db/seed.js"
cd ..

# ---------------------------------------------------------------------------
# 8. Done
# ---------------------------------------------------------------------------
echo ""
info "===================================================="
info "  EduGrade setup complete!"
info "===================================================="
echo ""
echo -e "  ${CYAN}Start the development servers:${NC}"
echo "    npm start"
echo ""
echo -e "  ${CYAN}Or run each service individually:${NC}"
echo "    Terminal 1 (server):  cd server && npm run dev"
echo "    Terminal 2 (client):  cd client && npm run dev"
echo ""
echo -e "  ${CYAN}Default admin login:${NC}"
echo "    Email:    admin@edugrade.com"
echo "    Password: Admin@123"
echo ""
echo -e "  ${CYAN}API health check:${NC}"
echo "    curl http://localhost:5000/api/health"
echo ""
