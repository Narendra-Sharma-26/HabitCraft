const express = require("express");
const router = express.Router();
const { getHeatmap, getLeaderboard } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");



router.get("/heatmap", protect, getHeatmap);

router.get("/leaderboard", protect, getLeaderboard);

module.exports = router;
