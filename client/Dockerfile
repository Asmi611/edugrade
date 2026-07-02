# =============================================================================
# EduGrade Client — Production Multi-stage Dockerfile (Nginx)
# =============================================================================

# ---- Stage 1: Build -------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Nginx runtime -----------------------------------------------
FROM nginx:1.27-alpine AS runner

# Copy custom nginx config (proxies /api to server, handles SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
