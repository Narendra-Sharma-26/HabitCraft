const express = require("express");
const router = express.Router();
// IMPORT BOTH FUNCTIONS HERE
const { saveSchedule, getSchedule } = require("../controllers/scheduleController");
const { protect } = require("../middleware/authMiddleware");

// Get existing schedule
router.get("/", protect, getSchedule);

// Create or update schedule
router.post("/", protect, saveSchedule);

module.exports = router;