import { useEffect, useMemo, useState } from "react";
import "./App.css";

const categories = ["All", "Work", "Learning", "Personal", "Health"];

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  });
  const [filter, setFilter] = useState("All");
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Personal",
    priority: "Medium",
    due_date: ""
  });

  const loadData = async () => {
    try {
      const [tasksResponse, statsResponse] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/stats")
      ]);

      const tasksData = await tasksResponse.json();
      const statsData = await statsResponse.json();

      setTasks(tasksData.tasks || []);
      setStats(statsData.stats || {});
      setSource(tasksData.source || "");
    } catch {
      setMessage("Unable to load tasks. Please refresh the page.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTasks = useMemo(() => {
    if (filter === "All") return tasks;
    return tasks.filter((task) => task.category === filter);
  }, [tasks, filter]);

  const progress = stats.total
    ? Math.round((Number(stats.completed) / Number(stats.total)) * 100)
    : 0;

  const addTask = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Please enter a task title.");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error("Task creation failed");
      }

      setForm({
        title: "",
        category: "Personal",
        priority: "Medium",
        due_date: ""
      });

      setMessage("Task added successfully.");
      loadData();
    } catch {
      setMessage("Unable to add the task.");
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      setMessage("Task updated.");
      loadData();
    } catch {
      setMessage("Unable to update the task.");
    }
  };

  const deleteTask = async (taskId) => {
    const shouldDelete = window.confirm("Delete this task?");

    if (!shouldDelete) return;

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });

      setMessage("Task deleted.");
      loadData();
    } catch {
      setMessage("Unable to delete the task.");
    }
  };

  const formatDueDate = (date) => {
    if (!date) return "No due date";

    const today = new Date();
    const dueDate = new Date(`${date}T00:00:00`);

    if (dueDate.toDateString() === today.toDateString()) {
      return "Today";
    }

    return dueDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    });
  };

  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">PERSONAL PRODUCTIVITY</p>
          <h1>FocusFlow</h1>
          <p className="hero-text">
            A calm place to plan your day and finish meaningful work.
          </p>
        </div>

        <div className="today-card">
          <span>Today</span>
          <strong>{currentDate}</strong>
          <small>
            {source === "redis-cache"
              ? "Fast view from Redis cache"
              : "Live data from PostgreSQL"}
          </small>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total tasks</span>
          <strong>{stats.total || 0}</strong>
        </article>

        <article className="stat-card">
          <span>In progress</span>
          <strong>{stats.in_progress || 0}</strong>
        </article>

        <article className="stat-card">
          <span>Completed</span>
          <strong>{stats.completed || 0}</strong>
        </article>

        <article className="progress-card">
          <div
            className="progress-ring"
            style={{ "--progress": `${progress * 3.6}deg` }}
          >
            <span>{progress}%</span>
          </div>
          <div>
            <span>Daily progress</span>
            <strong>Keep moving forward</strong>
          </div>
        </article>
      </section>

      <section className="planner-grid">
        <article className="glass-card add-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">NEW TASK</p>
              <h2>Plan something meaningful</h2>
            </div>
          </div>

          <form onSubmit={addTask}>
            <label>
              Task title
              <input
                type="text"
                placeholder="For example, learn Docker networking"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>

            <div className="form-row">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  <option>Work</option>
                  <option>Learning</option>
                  <option>Personal</option>
                  <option>Health</option>
                </select>
              </label>

              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({ ...form, priority: event.target.value })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </div>

            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm({ ...form, due_date: event.target.value })
                }
              />
            </label>

            <button className="primary-button" type="submit">
              Add to FocusFlow
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </article>

        <article className="glass-card insight-card">
          <p className="eyebrow">TODAY'S FOCUS</p>
          <h2>{stats.overdue || 0} overdue task{Number(stats.overdue) === 1 ? "" : "s"}</h2>
          <p>
            Complete one important task before adding more. Small progress
            becomes consistent progress.
          </p>
          <div className="insight-line">
            <span>Pending</span>
            <strong>{stats.pending || 0}</strong>
          </div>
          <div className="insight-line">
            <span>Completed</span>
            <strong>{stats.completed || 0}</strong>
          </div>
        </article>
      </section>

      <section className="tasks-section">
        <div className="tasks-header">
          <div>
            <p className="eyebrow">YOUR TASKS</p>
            <h2>Make today count</h2>
          </div>

          <select
            className="filter-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks here yet</h3>
              <p>Add a task above and begin your day with clarity.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <article className="task-row" key={task.id}>
                <div className="task-main">
                  <div>
                    <span className={`category-tag ${task.category.toLowerCase()}`}>
                      {task.category}
                    </span>
                    <h3>{task.title}</h3>
                    <p>Due: {formatDueDate(task.due_date)}</p>
                  </div>
                </div>

                <div className="task-actions">
                  <span className={`priority ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>

                  <select
                    className="status-select"
                    value={task.status}
                    onChange={(event) =>
                      updateStatus(task.id, event.target.value)
                    }
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
