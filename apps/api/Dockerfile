# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package
RUN npm run build --workspace=packages/shared

# Build API
RUN npm run build --workspace=apps/api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy scripts
COPY apps/api/scripts ./apps/api/scripts

WORKDIR /app/apps/api

EXPOSE 3101

CMD ["sh", "-c", "node scripts/migrate.js && node dist/apps/api/src/main.js"]
