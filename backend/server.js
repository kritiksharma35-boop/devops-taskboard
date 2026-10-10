const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
const { createClient } = require("redis");

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
});

const redis = createClient({
  url: process.env.REDIS_URL,
});

const validCategories = ["Work", "Learning", "Personal", "Health"];
const validPriorities = ["Low", "Medium", "High"];
const validStatuses = ["Pending", "In Progress", "Completed"];

async function clearTaskCache() {
  await redis.del("tasks");
  await redis.del("stats");
}

async function startServer() {
  await db.connect();
  await redis.connect();

  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) DEFAULT 'Personal',
      priority VARCHAR(20) DEFAULT 'Medium',
      status VARCHAR(50) DEFAULT 'Pending',
      due_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Personal',
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS due_date DATE
  `);

  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "focusflow-backend"
    });
  });

  app.get("/api/tasks", async (req, res) => {
    const cachedTasks = await redis.get("tasks");

    if (cachedTasks) {
      return res.json({
        source: "redis-cache",
        tasks: JSON.parse(cachedTasks)
      });
    }

    const result = await db.query(`
      SELECT *
      FROM tasks
      ORDER BY
        CASE WHEN status = 'Completed' THEN 1 ELSE 0 END,
        due_date NULLS LAST,
        id DESC
    `);

    await redis.setEx("tasks", 60, JSON.stringify(result.rows));

    res.json({
      source: "postgresql",
      tasks: result.rows
    });
  });

  app.post("/api/tasks", async (req, res) => {
    const {
      title,
      category = "Personal",
      priority = "Medium",
      due_date = null
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required"
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        message: "Invalid category"
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority"
      });
    }

    const result = await db.query(
      `INSERT INTO tasks (title, category, priority, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), category, priority, due_date || null]
    );

    await clearTaskCache();

    res.status(201).json(result.rows[0]);
  });

  app.put("/api/tasks/:id", async (req, res) => {
    const taskId = Number(req.params.id);
    const { title, category, priority, status, due_date } = req.body;

    const existingTask = await db.query(
      "SELECT * FROM tasks WHERE id = $1",
      [taskId]
    );

    if (existingTask.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    const task = existingTask.rows[0];

    const newTitle = title === undefined ? task.title : title.trim();
    const newCategory = category === undefined ? task.category : category;
    const newPriority = priority === undefined ? task.priority : priority;
    const newStatus = status === undefined ? task.status : status;
    const newDueDate =
      due_date === undefined ? task.due_date : due_date || null;

    if (!newTitle) {
      return res.status(400).json({
        message: "Task title cannot be empty"
      });
    }

    if (!validCategories.includes(newCategory)) {
      return res.status(400).json({
        message: "Invalid category"
      });
    }

    if (!validPriorities.includes(newPriority)) {
      return res.status(400).json({
        message: "Invalid priority"
      });
    }

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const updatedTask = await db.query(
      `UPDATE tasks
       SET title = $1,
           category = $2,
           priority = $3,
           status = $4,
           due_date = $5
       WHERE id = $6
       RETURNING *`,
      [newTitle, newCategory, newPriority, newStatus, newDueDate, taskId]
    );

    await clearTaskCache();

    res.json(updatedTask.rows[0]);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const taskId = Number(req.params.id);

    const deletedTask = await db.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [taskId]
    );

    if (deletedTask.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    await clearTaskCache();

    res.json({
      message: "Task deleted successfully"
    });
  });

  app.get("/api/stats", async (req, res) => {
    const cachedStats = await redis.get("stats");

    if (cachedStats) {
      return res.json({
        source: "redis-cache",
        stats: JSON.parse(cachedStats)
      });
    }

    const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (
          WHERE due_date < CURRENT_DATE
          AND status != 'Completed'
        ) AS overdue
      FROM tasks
    `);

    await redis.setEx("stats", 60, JSON.stringify(result.rows[0]));

    res.json({
      source: "postgresql",
      stats: result.rows[0]
    });
  });

  app.listen(port, () => {
    console.log(`FocusFlow backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Application failed to start:", error);
  process.exit(1);
});
