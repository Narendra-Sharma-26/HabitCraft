const express = require("express");
const router = express.Router();
const { getHeatmap, getLeaderboard } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");
const { getInsights } = require("../controllers/insightsController");


router.get("/heatmap", protect, getHeatmap);

router.get("/leaderboard", protect, getLeaderboard);

router.get("/dashboard/insights", protect, getInsights);

module.exports = router;
