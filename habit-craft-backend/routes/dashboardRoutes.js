const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");
const { getInsights } = require("../controllers/insightsController");

// Get dashboard data
router.get("/", protect, getDashboard);

// Get dashboard insights
router.get("/insights", protect, getInsights);

module.exports = router;