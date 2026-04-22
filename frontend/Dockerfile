# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files (for monorepo context if needed)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Use pnpm for faster installation (if available)
RUN npm install -g pnpm || true

# Copy frontend app
COPY apps/web-lume ./apps/web-lume

# Copy shared configs
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm install

# Build frontend
WORKDIR /app/apps/web-lume
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

WORKDIR /app

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built frontend from builder
COPY --from=builder /app/apps/web-lume/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/index.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
