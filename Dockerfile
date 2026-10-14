# Stage 1: Build Frontend
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder
WORKDIR /app
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend ./
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY src/api/package*.json ./
RUN npm ci --omit=dev

COPY --from=frontend-builder /app/dist ./frontend/dist
COPY src/api ./api

RUN chown -R node:node /app
USER node

WORKDIR /app/api
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]