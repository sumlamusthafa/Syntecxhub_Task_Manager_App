const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// Every task route requires a valid JWT
router.use(protect);

router.route("/").get(listTasks).post(createTask);
router.route("/:id").get(getTask).put(updateTask).delete(deleteTask);

module.exports = router;
