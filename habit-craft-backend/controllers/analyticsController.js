const User = require("../models/User");
const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

// ⭐ THE MIDNIGHT TIMEZONE FIX ⭐
// Standard .toISOString() uses UTC time. 
// This helper forces the date string into your local timezone.
const getLocalDateString = (d) => {
    const offset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offset).toISOString().split("T")[0];
};

// @desc    Get streak heatmap (last 30 days)
// @route   GET /api/analytics/heatmap
// @access  Private
const getHeatmap = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29); // last 30 days

    // ⭐ Fix: Use local date strings for the query boundary
    const startStr = getLocalDateString(startDate);
    const todayStr = getLocalDateString(today);

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
      // ⭐ Fix: Ensure the key is in local time
      const key = getLocalDateString(d); 
      heatmapMap[key] = 0;
    }

    // Count completions per day
    logs.forEach(log => {
      // Safely parse the date, ensuring it matches our local string format
      const date = typeof log.date === "string" ? log.date.split("T")[0] : getLocalDateString(new Date(log.date));
      if (heatmapMap[date] !== undefined) {
        heatmapMap[date] += 1;
      }
    });

    // Convert to ordered array
    const heatmap = Object.keys(heatmapMap).sort().map(date => ({
      date,
      completed: heatmapMap[date],
    }));

    res.json({ heatmap });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get discipline leaderboard
// @route   GET /api/analytics/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const allUsers = await User.find({}).select("name disciplineScore");
    const allHabits = await Habit.find({ isActive: true }).select("userId streak totalCompleted _id");

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // ⭐ Fix: Use local timezone for the "Alive" streak check
    const todayStr = getLocalDateString(today);
    const yesterdayStr = getLocalDateString(yesterday);

    const recentLogs = await HabitLog.find({
      date: { $in: [todayStr, yesterdayStr] },
      completed: true
    }).select("habitId");

    const aliveHabitIds = new Set(recentLogs.map(log => log.habitId.toString()));

    const usersWithStats = allUsers.map(user => {
      const userHabits = allHabits.filter(h => h.userId.toString() === user._id.toString());
      
      const bestStreak = userHabits.reduce((max, h) => {
        const actualStreak = aliveHabitIds.has(h._id.toString()) ? (h.streak || 0) : 0;
        return Math.max(max, actualStreak);
      }, 0);

      const totalCompleted = userHabits.reduce((sum, h) => sum + (h.totalCompleted || 0), 0);

      return {
        _id: user._id.toString(),
        name: user.name,
        disciplineScore: user.disciplineScore || 0,
        bestStreak,
        totalCompleted
      };
    });

    // Tie-Breaker Logic
    usersWithStats.sort((a, b) => {
      if (b.disciplineScore !== a.disciplineScore) return b.disciplineScore - a.disciplineScore;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return b.totalCompleted - a.totalCompleted;
    });

    const rankedUsers = usersWithStats.map((u, index) => ({ ...u, rank: index + 1 }));
    const leaderboard = rankedUsers.slice(0, 10);
    const myRankData = rankedUsers.find(u => u._id === userId.toString());

    res.json({ leaderboard, myRank: myRankData ? myRankData.rank : null, myStats: myRankData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHeatmap, getLeaderboard };