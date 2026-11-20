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
    // ⭐ PROOF OF COMPLETION FIELDS
    proofType: {
      type: String,
      enum: ["photo", "text", "none"],
      default: "none",
    },
    proofText: { type: String },        // User's text description
    proofImageUrl: { type: String },    // Base64 image string
    proofVerified: { type: Boolean, default: false },
    proofReason: { type: String },      // AI's reason for accept/reject
  },
  { timestamps: true }
);

// Prevent duplicate logs per day
habitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("HabitLog", habitLogSchema);
