const Task = require("../models/Task");

const FIELDS = ["title", "description", "status", "priority", "dueDate"];

function pick(body) {
  const out = {};
  for (const key of FIELDS) {
    if (body && body[key] !== undefined) out[key] = body[key];
  }
  if (out.dueDate === "") out.dueDate = null;
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Every query below is scoped to req.user._id, so users only ever see their own tasks.

// GET /api/tasks?status=&priority=&search=&page=&limit=
exports.listTasks = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.search) {
      filter.title = { $regex: escapeRegex(String(req.query.search).trim()), $options: "i" };
    }

    const [tasks, total, grouped] = await Promise.all([
      Task.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(filter),
      Task.aggregate([
        { $match: { user: req.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = { todo: 0, "in-progress": 0, done: 0 };
    for (const g of grouped) counts[g._id] = g.count;

    res.json({
      tasks,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      counts,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...pick(req.body), user: req.user._id });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
};
