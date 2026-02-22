const express = require("express");
const router = express.Router();
const { addHabit, getHabits, toggleHabit, archiveHabit } = require("../controllers/habitController");
const { completeHabit } = require("../controllers/habitLogController");
const { protect } = require("../middleware/authMiddleware");
const { getHabitHealthScores } = require("../controllers/habitHealthController");


// Add habit
router.post("/", protect, addHabit);

// Get all habits
router.get("/", protect, getHabits);

router.patch("/:id/toggle", protect, toggleHabit);

router.patch("/:id/archive", protect, archiveHabit);

// Mark habit complete
router.patch("/:id/complete", protect, completeHabit);

router.get("/health", protect, getHabitHealthScores);

module.exports = router;
