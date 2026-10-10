const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Redis = require("ioredis");
const path = require("path");
const os = require("os");
const fs = require("fs");

// --- Config ---
const PORT = process.env.PORT || 3000;
const DB_PORT = process.env.POSTGRES_PORT || "5432";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://taskforge:taskforge@localhost:${DB_PORT}/taskforge`;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_TTL = 30; // seconds

// --- Connections ---
const db = new Pool({ connectionString: DATABASE_URL });
const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 100, 2000),
});

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: [
      "X-Served-By-Web",
      "X-Served-By-DB",
      "X-Served-By-Redis",
      "X-Response-Time",
      "X-Cache",
    ],
  })
);
app.use(express.json());

// --- Helper Functions for Infrastructure Details ---
function parseHostFromUrl(urlStr, defaultHost) {
  try {
    const parsed = new URL(urlStr);
    return { host: parsed.hostname, port: parsed.port || defaultHost };
  } catch {
    return { host: "localhost", port: defaultHost };
  }
}

const dbConfig = parseHostFromUrl(DATABASE_URL, "5432");
const redisConfig = parseHostFromUrl(REDIS_URL, "6379");

function getWebContainer() {
  const containerId =
    process.env.CONTAINER_NAME ||
    process.env.HOSTNAME ||
    os.hostname();
  return {
    container: containerId,
    hostname: os.hostname(),
    pid: process.pid,
    platform: `${os.platform()} (${os.arch()})`,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    nodeVersion: process.version,
  };
}

async function getDbContainer() {
  try {
    const res = await db.query(
      "SELECT inet_server_addr() AS ip, inet_server_port() AS port, pg_backend_pid() AS pid, current_database() AS db_name, version() AS version"
    );
    const row = res.rows[0] || {};
    return {
      status: "connected",
      container: process.env.POSTGRES_CONTAINER_NAME || dbConfig.host,
      host: dbConfig.host,
      ip: row.ip ? row.ip.toString() : dbConfig.host,
      port: row.port || dbConfig.port,
      backendPid: row.pid || null,
      database: row.db_name || "taskforge",
      version: row.version ? row.version.split(" ")[1] : "16",
    };
  } catch (err) {
    return {
      status: "error",
      container: dbConfig.host,
      host: dbConfig.host,
      port: dbConfig.port,
      error: err.message,
    };
  }
}

async function getRedisContainer() {
  try {
    const rawInfo = await redis.info("server");
    const runIdMatch = rawInfo.match(/run_id:([^\r\n]+)/);
    const versionMatch = rawInfo.match(/redis_version:([^\r\n]+)/);
    const tcpPortMatch = rawInfo.match(/tcp_port:([^\r\n]+)/);
    const runId = runIdMatch ? runIdMatch[1] : "unknown";
    const shortRunId = runId.length > 8 ? runId.slice(0, 8) : runId;

    return {
      status: "connected",
      container:
        process.env.REDIS_CONTAINER_NAME ||
        (redis.options.host ? redis.options.host : redisConfig.host),
      host: redis.options.host || redisConfig.host,
      port: tcpPortMatch ? tcpPortMatch[1] : (redis.options.port || redisConfig.port),
      runId: runId,
      shortRunId: shortRunId,
      version: versionMatch ? versionMatch[1] : "7.x",
    };
  } catch (err) {
    return {
      status: "error",
      container: redisConfig.host,
      host: redisConfig.host,
      port: redisConfig.port,
      error: err.message,
    };
  }
}

// --- Middleware: Track per-request infra serving headers ---
app.use((req, res, next) => {
  const start = Date.now();
  const web = getWebContainer();
  res.setHeader("X-Served-By-Web", web.container);
  res.setHeader("X-Served-By-DB", dbConfig.host);
  res.setHeader("X-Served-By-Redis", redisConfig.host);

  const originalEnd = res.end;
  res.end = function (...args) {
    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${Date.now() - start}ms`);
    }
    return originalEnd.apply(this, args);
  };
  next();
});

// Serve frontend: dist if built, otherwise static root
const frontendDist = path.join(__dirname, "../frontend/dist");
const frontendStatic = path.join(__dirname, "../frontend");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  app.use(express.static(frontendStatic));
}

// --- Health Check ---
app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", db: "ok", redis: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// --- GET /api/infra: Infrastructure & Container Details ---
app.get("/api/infra", async (_req, res) => {
  const web = getWebContainer();
  const [dbData, redisData] = await Promise.all([
    getDbContainer(),
    getRedisContainer(),
  ]);

  res.json({
    web,
    db: dbData,
    redis: redisData,
    timestamp: new Date().toISOString(),
  });
});

// --- GET /api/tasks ---
app.get("/api/tasks", async (_req, res) => {
  try {
    // Check cache
    const cached = await redis.get("tasks:list");
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cached));
    }

    res.setHeader("X-Cache", "MISS");
    const { rows } = await db.query(
      "SELECT * FROM tasks ORDER BY created_at DESC"
    );

    // Store in cache
    await redis.setex("tasks:list", CACHE_TTL, JSON.stringify(rows));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/tasks ---
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, priority } = req.body;
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const { rows } = await db.query(
      "INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING *",
      [title, priority || "medium"]
    );

    await redis.del("tasks:list"); // invalidate cache

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PATCH /api/tasks/:id ---
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      "UPDATE tasks SET completed = NOT completed WHERE id = $1 RETURNING *",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    await redis.del("tasks:list");

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE /api/tasks/:id ---
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query("DELETE FROM tasks WHERE id = $1", [
      id,
    ]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    await redis.del("tasks:list");

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA routes
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  const indexPath = fs.existsSync(path.join(frontendDist, "index.html"))
    ? path.join(frontendDist, "index.html")
    : path.join(frontendStatic, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`[TaskForge] API running on http://localhost:${PORT}`);
});
