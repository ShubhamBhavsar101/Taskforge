FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY src/api/package*.json ./
RUN npm install --omit=dev

COPY --from=frontend-builder /app/dist ./frontend/dist
COPY src/api ./api

WORKDIR /app/api
EXPOSE 3000
CMD ["node", "server.js"]