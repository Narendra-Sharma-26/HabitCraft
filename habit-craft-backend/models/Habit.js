const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
    },
    difficulty: {
      type: String,
      enum: ["Light", "Medium", "Hard"],
      default: "Medium",
    },
    preferredTime: {
      type: String, // optional
    },
    scheduledTime: {
      type: String, // assigned by system/AI later
    },
    duration: {
      type: Number, // minutes
      default: 15,
    },
    streak: {
      type: Number,
      default: 0,
    },
    totalCompleted: {
      type: Number,
      default: 0,
    },
    totalMissed: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    pauseCount: {
      type: Number,
      default: 0,
    },
    pauseMonth: {
      type: String, // format: "2026-02"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);
