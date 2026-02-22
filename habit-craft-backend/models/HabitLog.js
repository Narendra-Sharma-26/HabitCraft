const mongoose = require("mongoose");

const habitLogSchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // "2026-02-12"
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Prevent duplicate logs per day
habitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("HabitLog", habitLogSchema);
