# TaskForge

**TaskForge** is a distributed, high-performance task management platform backed by **React**, **Express.js**, **PostgreSQL**, and **Redis**. It features a real-time **Infrastructure Telemetry & Container Routing Panel** that maps every request across service tiers and displays container identity, process metrics, and cache statuses.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          React 19 Frontend             │
                      │   (Container Telemetry & Task App)     │
                      └──────────────────┬─────────────────────┘
                                         │
                                   HTTP / REST
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          Node.js / Express 5           │
                      │  (Telemetry Headers & REST Endpoints)  │
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

- **Web Tier (Express.js / React)**: Serves static assets, manages CRUD endpoints, and attaches `X-Served-By-Web`, `X-Served-By-DB`, and `X-Served-By-Redis` headers.
- **Left Telemetry Column**: Displays live container hostnames/IDs, process PIDs, PostgreSQL server IP/port, Redis instance `run_id`, response latencies, and an active tri-service container routing trace.
- **Database Tier (PostgreSQL 16)**: Persistent storage for tasks with automated schema initialization via `init.sql`.
- **Cache Tier (Redis 7)**: 30-second TTL read caching for tasks list with instant invalidation upon mutations (`POST`, `PATCH`, `DELETE`).

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) v18+ & `npm` (for local native development)

---

## How to Run the Project

### Option 1: Complete Docker Deployment (All Services Containerized)

Run the full cluster (Web API, PostgreSQL, and Redis) using Docker Compose:

```bash
docker compose up -d --build
```

#### Multi-Replica Scaling Demo
To demonstrate multi-container awareness (e.g. 3 container replicas per service), scale the web service:

```bash
docker compose up -d --scale web=3
```

Open **`http://localhost:3000`** in your browser. As you add or toggle tasks, the left-hand column will stream live traces showing which container replica handled the request!

To stop containers:
```bash
docker compose down
```

---

### Option 2: Hybrid Local Development (Docker Infra + Local Node)

Use Docker for the databases while running the API and frontend natively for rapid iteration:

#### 1. Start Database & Cache Containers
```bash
docker compose up -d postgres redis
```
> **Note**: PostgreSQL is mapped to port `5433` (`5433:5432`) by default to prevent conflicts with any pre-existing local PostgreSQL service on `5432`.

#### 2. Install Dependencies
```bash
# Backend
cd src/api
npm install

# Frontend
cd ../frontend
npm install
```

#### 3. Start the Backend API
```bash
# Run with local port configuration
POSTGRES_PORT=5433 npm run dev
# (or from the project root: POSTGRES_PORT=5433 node src/api/server.js)
```
The API starts on `http://localhost:3000`.

#### 4. Start the React Frontend (Vite Dev Server)
In a separate terminal:
```bash
cd src/frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser. Vite automatically proxies `/api` calls to `http://localhost:3000`.

---

### Option 3: Unified Local Production Server

Build the React frontend bundle and serve everything through the Express backend:

```bash
# 1. Build React frontend
cd src/frontend
npm run build

# 2. Start unified server
cd ../api
POSTGRES_PORT=5433 node server.js
```

Open **`http://localhost:3000`** in your browser.

---

## API & Telemetry Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health probe checking DB & Redis connectivity |
| `GET` | `/api/infra` | Infrastructure telemetry (container ID, PID, IP, port, Redis run_id) |
| `GET` | `/api/tasks` | Fetches tasks (Redis cache-backed, returns `X-Cache: HIT/MISS`) |
| `POST` | `/api/tasks` | Creates a new task and invalidates Redis cache |
| `PATCH` | `/api/tasks/:id` | Toggles task completion and invalidates Redis cache |
| `DELETE` | `/api/tasks/:id` | Deletes a task and invalidates Redis cache |

### Custom Response Headers
Every API response returns:
- `X-Served-By-Web`: Name/ID of the Web container handling the request
- `X-Served-By-DB`: PostgreSQL server host/address
- `X-Served-By-Redis`: Redis server host/address
- `X-Response-Time`: Request execution time in milliseconds
- `X-Cache`: `HIT` or `MISS` (on `/api/tasks`)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the Express server |
| `POSTGRES_PORT` | `5433` | Host port for PostgreSQL container |
| `DATABASE_URL` | `postgres://taskforge:taskforge@localhost:5433/taskforge` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `CONTAINER_NAME` | `os.hostname()` | Optional custom container identifier |

---

## License & Credits

&copy; 2026 TaskForge. Developed by Shubham Bhavsar. Runs 100% locally.
