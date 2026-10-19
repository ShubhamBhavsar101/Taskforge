# TaskForge

**TaskForge** is a fast, lightweight, and modern task management platform built with **React**, **Node.js (Express)**, **PostgreSQL**, and **Redis**.

![TaskForge UI](screenshots/Screenshot%202026-10-18%20at%208.06.30%E2%80%AFAM.png)

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

## DevOps & Infrastructure Architecture

TaskForge implements a production-grade GitOps and CI/CD lifecycle across isolated Kubernetes clusters with automated SemVer, gated approvals, and zero-downtime rollouts.

```
[ Feature PR ] ──► Semantic PR Check & Unit Tests
       │
   (Merge)
       ▼
 [ main Branch ]
       │
       ▼
 1. 📦 Build Once & SemVer Release (Docker Hub: vX.Y.Z-dev-sha)
       │
       ├─► 🧪 Dev Deployment (Namespace: taskforge-dev)
       │
       ├─► 🎲 TST Deployment (Namespace: taskforge-tst)
       │
       ├─► 🎯 Staging Deployment (Approval Gate: approval-staging)
       │         │
       │         ▼ (Rollout Verified)
       ├─► ✈️ Publish Pre-Release Candidate (GitHub Release RC)
       │         │
       │         ▼ (Auto-Dispatch)
       └─► 🚀 Production Release Pipeline
                 │
                 ├─► 🛡️ Preflight Checks (Verify RC Eligibility)
                 ├─► 🔒 Production Approval Gate (approval-prod)
                 ├─► 🚢 Deploy to Prod (Namespace: taskforge-prod)
                 ├─► 🔄 Rollout Health Check & Auto-Rollback
                 └─► 🌟 Promote to Official Latest Release
```

### 1. Branching & Release Strategy
- **Conventional Commits**: Enforced on PR titles via GitHub Actions (`semantic-pull-request.yaml`).
- **Build Once, Deploy Everywhere**: Container images are built and tagged once per commit (`shubhszone/taskforge:vX.Y.Z`). The exact same verified artifact is promoted across all stages without recompilation.
- **Release Gating**: Merges to `main` initially create a **Pre-Release Candidate**. Only after successful Staging verification and Production sign-off is the release promoted to **Official Latest**.

### 2. Multi-Cluster KinD Architecture
Workloads are separated across isolated local KinD clusters to mirror enterprise staging/production network isolation:

| Cluster | Environments | Ingress Ports | Context / Kubeconfig | Dedicated Runner |
|---|---|---|---|---|
| **`lower-cluster`** | Dev, TST, Staging | `4000:80`, `4435:443` | `kind-lower-cluster` (`~/.kube/config-lower-cluster`) | `infra` |
| **`prod-cluster`** | Production | `8000:80`, `4430:443` | `kind-prod-cluster` (`~/.kube/config-prod-cluster`) | `infra-prod` |

### 3. Ingress & Traffic Routing
Host-based routing is managed by **Ingress-NGINX** controllers on both clusters:
- **Dev**: `http://dev.taskforge.local:4000`
- **TST**: `http://tst.taskforge.local:4000`
- **Staging**: `http://staging.taskforge.local:4000`
- **Production**: `http://taskforge.local:8000`

*(Resolve hostnames to VM IP via Mac `/etc/hosts` or wildcard DNS like `dev.<VM_IP>.nip.io`).*

### 4. Kubernetes Manifests (Kustomize)
- **Base (`k8s/base/`)**: Shared Deployment, StatefulSet, Services, PVC, ConfigMap, and Ingress templates.
- **Overlays (`k8s/overlays/`)**: Environment-specific patches:
  - `dev`: Default replica count, dynamic commit image tags.
  - `tst`: Isolated namespace, host routing patch.
  - `staging`: Replica overrides, approval validation.
  - `prod`: 3 web replicas, production secrets, isolated cluster target.

### 5. CI/CD Reliability & Rollback Safeguards
- **Dry-Run Planning**: Every deployment job previews manifests (`kustomize edit set image` + `kubectl kustomize .`) before applying.
- **Secret Propagation**: Pods automatically reload secrets via triggered rolling restarts (`kubectl rollout restart`).
- **Automated Rollback**: Deployments monitor `kubectl rollout status --timeout=180s`. If pod readiness fails, the pipeline immediately triggers `kubectl rollout undo` to restore the last known good state.

### 6. Cluster Automation Scripts
Pre-configured shell utilities located in `scripts/kind/`:
- `create-cluster.sh --name <name>`: Boots KinD cluster with host port mappings and exports isolated kubeconfig.
- `install-nginx-ingress-controller.sh --context <ctx>`: Deploys Ingress-NGINX controller and waits for pod readiness.
- `start-stop-clusters.sh [start|stop|status]`: Gracefully controls cluster containers to optimize local machine memory.

---

## License & Credits

&copy; 2026 TaskForge. Developed by Shubham Bhavsar. Runs 100% locally.
