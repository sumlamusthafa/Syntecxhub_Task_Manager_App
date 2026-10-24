const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [1, "Title is required"],
      maxlength: [100, "Title must be at most 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["todo", "in-progress", "done"],
        message: "Status must be todo, in-progress or done",
      },
      default: "todo",
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Priority must be low, medium or high",
      },
      default: "medium",
    },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    return ret;
  },
});

module.exports = mongoose.model("Task", taskSchema);
