const express = require("express");
const router = express.Router();

const { 
  addHabit, 
  getHabits, 
  toggleHabit, 
  archiveHabit,
  editHabit,      // <-- New
  deleteHabit     // <-- New
} = require("../controllers/habitController");

const { completeHabit, undoHabitComplete } = require("../controllers/habitLogController");
const { getHabitHealthScores } = require("../controllers/habitHealthController");
const { protect } = require("../middleware/authMiddleware");

// Add habit
router.post("/", protect, addHabit);

// Get all habits
router.get("/", protect, getHabits);

// Toggle active/pause
router.patch("/:id/toggle", protect, toggleHabit);

// Archive habit
router.patch("/:id/archive", protect, archiveHabit);

// Mark habit complete
router.patch("/:id/complete", protect, completeHabit);

// Undo habit completion
router.delete("/:id/complete", protect, undoHabitComplete);

// Get health scores
router.get("/health", protect, getHabitHealthScores);

// Edit habit (Update title, duration, or manually override scheduled time)
router.put("/:id", protect, editHabit);

// Delete habit permanently
router.delete("/:id", protect, deleteHabit);

module.exports = router;