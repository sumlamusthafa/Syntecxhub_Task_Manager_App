import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/auth-context.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import TaskDialog from "../components/TaskDialog.jsx";

const PAGE_SIZE = 6;

const TABS = [
  { value: "", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const STATUS_LABEL = { todo: "To do", "in-progress": "In progress", done: "Done" };

function formatDue(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isOverdue(task) {
  if (!task.dueDate || task.status === "done") return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.dueDate.slice(0, 10) < today;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Tasks() {
  const { user } = useAuth();

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: "", data: null, error: "" });
  const [notice, setNotice] = useState(null); // { type, text }
  const [dialog, setDialog] = useState({ open: false, task: null });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Wait a moment after typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const key = `${status}|${priority}|${query}|${page}|${reload}`;

  useEffect(() => {
    let active = true;
    api
      .listTasks({ page, limit: PAGE_SIZE, status, priority, search: query })
      .then((data) => {
        if (active) setResult({ key, data, error: "" });
      })
      .catch((err) => {
        if (active) setResult({ key, data: null, error: err.message });
      });
    return () => {
      active = false;
    };
  }, [key, page, status, priority, query]);

  const loading = result.key !== key;
  const data = result.data;
  const tasks = data?.tasks ?? [];
  const counts = data?.counts ?? { todo: 0, "in-progress": 0, done: 0 };
  const total = counts.todo + counts["in-progress"] + counts.done;
  const filtered = status !== "" || priority !== "" || query !== "";

  function refresh() {
    setReload((n) => n + 1);
  }

  function pickStatus(value) {
    setStatus(value);
    setPage(1);
  }

  async function saveTask(values) {
    if (dialog.task) {
      await api.updateTask(dialog.task.id, values);
      setNotice({ type: "success", text: "Task updated." });
    } else {
      await api.createTask(values);
      setNotice({ type: "success", text: "Task added." });
      setPage(1);
    }
    setDialog({ open: false, task: null });
    refresh();
  }

  async function toggleDone(task) {
    setNotice(null);
    try {
      await api.updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
    refresh();
  }

  async function confirmDelete() {
    const target = pendingDelete;
    setDeleting(true);
    try {
      await api.deleteTask(target.id);
      setNotice({ type: "success", text: `“${target.title}” was deleted.` });
      if (tasks.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
    setDeleting(false);
    setPendingDelete(null);
    refresh();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="muted">
            {data
              ? total === 0
                ? "Nothing on your list yet."
                : `${counts.done} of ${total} tasks done`
              : "Loading your tasks…"}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ open: true, task: null })}>
          + New task
        </button>
      </div>

      <section className="stats" aria-label="Task summary">
        <div className="stat stat-todo">
          <span className="stat-num">{counts.todo}</span>
          <span className="stat-label">To do</span>
        </div>
        <div className="stat stat-progress">
          <span className="stat-num">{counts["in-progress"]}</span>
          <span className="stat-label">In progress</span>
        </div>
        <div className="stat stat-done">
          <span className="stat-num">{counts.done}</span>
          <span className="stat-label">Done</span>
        </div>
      </section>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Filter by status">
          {TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              className={`tab${status === t.value ? " is-active" : ""}`}
              onClick={() => pickStatus(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label htmlFor="priority" className="sr-only">
            Filter by priority
          </label>
          <select
            id="priority"
            className="select"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label htmlFor="search" className="sr-only">
            Search tasks
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {notice && (
        <div className={`banner banner-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.text}
        </div>
      )}

      {result.error && !loading ? (
        <div className="banner banner-error" role="alert">
          {result.error}{" "}
          <button type="button" className="link-button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : (
        <ul className={`tasklist${loading ? " is-loading" : ""}`} aria-busy={loading}>
          {tasks.map((task) => {
            const done = task.status === "done";
            const overdue = isOverdue(task);
            return (
              <li key={task.id} className={`task priority-${task.priority}${done ? " is-done" : ""}`}>
                <button
                  type="button"
                  className={`check${done ? " is-checked" : ""}`}
                  onClick={() => toggleDone(task)}
                  aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
                  aria-pressed={done}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </button>
                <div className="task-main">
                  <strong className="task-title">{task.title}</strong>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  <div className="task-meta">
                    <span className={`pill pill-${task.priority}`}>{task.priority}</span>
                    <span className={`state state-${task.status}`}>{STATUS_LABEL[task.status]}</span>
                    {task.dueDate && (
                      <span className={`due${overdue ? " is-overdue" : ""}`}>
                        {overdue ? "Overdue · " : "Due "}
                        {formatDue(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setDialog({ open: true, task })}
                    aria-label={`Edit “${task.title}”`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => setPendingDelete(task)}
                    aria-label={`Delete “${task.title}”`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}

          {!loading && tasks.length === 0 && (
            <li className="empty">
              {filtered ? (
                "No tasks match these filters."
              ) : (
                <>
                  <strong>Your list is empty.</strong>
                  <span>Add your first task to get started.</span>
                </>
              )}
            </li>
          )}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <nav className="pager" aria-label="Pagination">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <span className="muted">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
          >
            Next
          </button>
        </nav>
      )}

      <TaskDialog
        open={dialog.open}
        task={dialog.task}
        onSave={saveTask}
        onCancel={() => setDialog({ open: false, task: null })}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this task?"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed permanently.` : ""}
        confirmLabel="Delete task"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
