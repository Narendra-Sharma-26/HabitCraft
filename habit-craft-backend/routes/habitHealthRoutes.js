const express = require("express");
const router = express.Router();
const { getHabitHealthScores } = require("../controllers/habitHealthController");
const { protect } = require("../middleware/authMiddleware");

router.get("/health", protect, getHabitHealthScores);

module.exports = router;