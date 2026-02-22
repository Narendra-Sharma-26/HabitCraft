const express = require("express");
const router = express.Router();
const { getDashboard } = require("../controllers/dashboardController");
const { getDashboardInsights } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

// Get dashboard data
router.get("/", protect, getDashboard);

router.get("/insights", protect, getDashboardInsights);

module.exports = router;
