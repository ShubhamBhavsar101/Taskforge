const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Redis = require("ioredis");
const path = require("path");
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
app.use(cors());
app.use(express.json());

// Serve frontend
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

// --- GET /api/tasks ---
app.get("/api/tasks", async (_req, res) => {
  try {
    // Check cache
    const cached = await redis.get("tasks:list");
    if (cached) {
      return res.json(JSON.parse(cached));
    }

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
