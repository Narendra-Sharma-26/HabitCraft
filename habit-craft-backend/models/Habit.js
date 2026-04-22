const mongoose = require("mongoose");

// Helper function to convert "HH:MM" to total minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "General" },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    
    preferredTime: { type: String }, // Legacy/General preference (Morning, Afternoon, Evening)
    
    // ⭐ NEW: Specific time bounds requested by the user
    timeWindow: {
      start: { type: String }, // e.g., "09:00"
      end: { type: String },   // e.g., "12:00"
    },
    
    scheduledTime: { type: String }, // Assigned by the AI Rescheduler
    duration: { type: Number, default: 15 }, // in minutes
    
    streak: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalMissed: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    pauseCount: { type: Number, default: 0 },
    pauseMonth: { type: String },
  },
  { timestamps: true }
);

// ⭐ Modern Validation Hook (No 'next' callback needed)
habitSchema.pre("save", function () {
  if (this.timeWindow && this.timeWindow.start && this.timeWindow.end) {
    const startMins = timeToMinutes(this.timeWindow.start);
    const endMins = timeToMinutes(this.timeWindow.end);
    
    // Check if end time is after start time
    if (endMins <= startMins) {
      throw new Error("timeWindow.end must be after timeWindow.start");
    }

    // Check if the duration fits within the window
    const windowDuration = endMins - startMins;
    if (this.duration > windowDuration) {
      throw new Error(`Duration (${this.duration}m) exceeds the available time window (${windowDuration}m).`);
    }
  }
});

module.exports = mongoose.model("Habit", habitSchema);