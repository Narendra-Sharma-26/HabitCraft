const mongoose = require("mongoose");

const busySlotSchema = new mongoose.Schema({
  start: {
    type: String, // e.g., "09:00"
    required: true,
  },
  end: {
    type: String, // e.g., "17:00"
    required: true,
  },
});

const scheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one schedule per user
    },
    wakeUpTime: {
      type: String, // "06:30"
      required: true,
    },
    sleepTime: {
      type: String, // "23:00"
      required: true,
    },
    busySlots: [busySlotSchema],
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
