import { useEffect, useRef, useState } from "react";

const EMPTY = { title: "", description: "", status: "todo", priority: "medium", dueDate: "" };

function toForm(task) {
  if (!task) return EMPTY;
  return {
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
  };
}

// Add / edit form shown in a modal dialog
export default function TaskDialog({ open, task, onSave, onCancel }) {
  const ref = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setForm(toForm(task));
      setError("");
      setSaving(false);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, task]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Give your task a title.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog-form"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !saving) onCancel();
      }}
    >
      <form className="dialog-body" onSubmit={handleSubmit} noValidate>
        <h2>{task ? "Edit task" : "New task"}</h2>

        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="t-title">Title</label>
          <input
            id="t-title"
            name="title"
            value={form.title}
            onChange={handleChange}
            maxLength={100}
            placeholder="What needs to be done?"
          />
        </div>

        <div className="field">
          <label htmlFor="t-desc">Notes (optional)</label>
          <textarea
            id="t-desc"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            maxLength={500}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="t-status">Status</label>
            <select id="t-status" name="status" value={form.status} onChange={handleChange}>
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-priority">Priority</label>
            <select id="t-priority" name="priority" value={form.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="field field-wide">
            <label htmlFor="t-due">Due date (optional)</label>
            <input id="t-due" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : task ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
