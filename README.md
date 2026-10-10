# TaskForge

**TaskForge** is a fast, lightweight, and modern task management platform built with **React**, **Node.js (Express)**, **PostgreSQL**, and **Redis**.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          React 19 Frontend             │
                      │        (Task Management UI)            │
                      └──────────────────┬─────────────────────┘
                                         │
                                    HTTP / REST
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          Node.js / Express 5           │
                      │            (REST API Server)           │
                      └──────────┬──────────────────┬──────────┘
                                 │                  │
                          SQL Connection       Redis Protocol
                                 │                  │
                                 ▼                  ▼
                    ┌──────────────────┐  ┌──────────────────┐
                    │  PostgreSQL 16   │  │     Redis 7      │
                    │   (Database)     │  │  (TTL Cache 30s) │
                    └──────────────────┘  └──────────────────┘
```

- **Frontend (React 19 / Vite)**: Clean, responsive dark-mode task manager with priority filtering, task completion toggles, and live counters.
- **Backend (Express 5)**: REST API handling CRUD operations with database persistence and caching.
- **Database (PostgreSQL 16)**: Persistent storage for tasks with schema auto-initialized via `init.sql`.
- **Cache (Redis 7)**: 30-second TTL read-through cache for the tasks list with automated invalidation upon updates.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) v18+ & `npm` (for local native development)

---

## How to Run the Project

### Option 1: Docker Deployment (Recommended)

Start the entire application stack (Web, PostgreSQL, Redis) with a single command:

```bash
docker compose up -d --build
```

Access the app in your browser:
👉 **[http://localhost:3000](http://localhost:3000)**

To stop all containers:
```bash
docker compose down
```

---

### Option 2: Hybrid Local Development (Docker DB + Native Node)

Run database and cache containers in Docker while developing the frontend and backend natively:

#### 1. Start Infrastructure Containers
```bash
docker compose up -d postgres redis
```
*(PostgreSQL is mapped to port `5433` by default to avoid local port 5432 conflicts).*

#### 2. Install Dependencies
```bash
# API dependencies
cd src/api && npm install

# Frontend dependencies
cd ../frontend && npm install
```

#### 3. Run Backend API
```bash
cd src/api
POSTGRES_PORT=5433 npm run dev
```
API runs on `http://localhost:3000`.

#### 4. Run React Frontend (Vite Dev Server)
In a separate terminal:
```bash
cd src/frontend
npm run dev
```
Open **`http://localhost:5173`** (Vite automatically proxies `/api` requests to port 3000).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health probe checking DB & Redis connectivity |
| `GET` | `/api/tasks` | Fetches tasks (Redis cache-backed) |
| `POST` | `/api/tasks` | Creates a new task and invalidates cache |
| `PATCH` | `/api/tasks/:id` | Toggles task completion and invalidates cache |
| `DELETE` | `/api/tasks/:id` | Deletes a task and invalidates cache |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the Express server |
| `POSTGRES_PORT` | `5433` | Host port for PostgreSQL container |
| `DATABASE_URL` | `postgres://taskforge:taskforge@localhost:5433/taskforge` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

---

## License & Credits

&copy; 2026 TaskForge. Developed by Shubham Bhavsar. Runs 100% locally.
