const express = require("express");
const router = express.Router();
const { saveSchedule } = require("../controllers/scheduleController");
const { protect } = require("../middleware/authMiddleware");

// Create or update schedule
router.post("/", protect, saveSchedule);

module.exports = router;
