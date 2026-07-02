# =============================================================================
# EduGrade Server — Production Multi-stage Dockerfile
# =============================================================================

# ---- Stage 1: Install dependencies ---------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# ---- Stage 2: Runtime ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 edugrade

# Copy only production node_modules and source code
COPY --from=deps --chown=edugrade:nodejs /app/node_modules ./node_modules
COPY --chown=edugrade:nodejs . .

# Create uploads directory
RUN mkdir -p ./uploads && chown edugrade:nodejs ./uploads

USER edugrade

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "index.js"]
