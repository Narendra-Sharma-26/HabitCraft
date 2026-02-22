
const User = require("../models/User");
const HabitLog = require("../models/HabitLog");


// @desc   Get streak heatmap (last 30 days)
const getHeatmap = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 29); // last 30 days

    const startStr = startDate.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const logs = await HabitLog.find({
      userId,
      completed: true,
      date: { $gte: startStr, $lte: todayStr },
    });

    // Initialize map with 0
    const heatmapMap = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().split("T")[0];
      heatmapMap[key] = 0;
    }

    // Count completions per day
    logs.forEach(log => {
      const date =
        typeof log.date === "string"
          ? log.date
          : new Date(log.date).toISOString().split("T")[0];

      if (heatmapMap[date] !== undefined) {
        heatmapMap[date] += 1;
      }
    });

    const heatmap = Object.keys(heatmapMap).map(date => ({
      date,
      completed: heatmapMap[date],
    }));

    res.json({ heatmap });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get discipline leaderboard
// @route  GET /api/analytics/leaderboard
// @access Private
const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get top 10 users sorted by disciplineScore
    const topUsers = await User.find({})
      .sort({ disciplineScore: -1 })
      .limit(10)
      .select("name disciplineScore");

    // Find current user's rank
    const allUsers = await User.find({})
      .sort({ disciplineScore: -1 })
      .select("_id");

    const myRank =
      allUsers.findIndex(user => user._id.toString() === userId.toString()) + 1;

    // Format leaderboard
    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      disciplineScore: user.disciplineScore,
    }));

    res.json({
      leaderboard,
      myRank,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHeatmap, getLeaderboard };

