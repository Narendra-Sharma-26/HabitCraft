const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { getTodayIST, getPastISTDate } = require("./dateHelper"); // ⭐ Added IST helpers

// @desc    Get AI Coach Insights
// @route   GET /api/dashboard/insights
// @access  Private
const getInsights = async (req, res) => {
  try {
    const userId = req.user._id;

    // ⭐ THE FIX: Use exact IST date strings
    const todayStr = getTodayIST();
    const sevenDaysAgoStr = getPastISTDate(6); // 6 days ago + today = 7 days

    // Get active habits
    const habits = await Habit.find({
      userId,
      isActive: true,
      $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    });

    if (habits.length === 0) {
      return res.json({
        message: "No active habits found",
        insights: [],
      });
    }

    // Fetch logs of last 7 days
    const logs = await HabitLog.find({
      userId,
      completed: true,
      date: { $gte: sevenDaysAgoStr, $lte: todayStr },
    });

    let bestHabit = null;
    let weakHabit = null;
    let max = -1;
    let min = 8;

    const habitInsights = [];

    for (let habit of habits) {
      const habitLogs = logs.filter(
        (log) => log.habitId.toString() === habit._id.toString()
      );

      // ⭐ Fix: Use a Set to ensure we only count unique days
      const uniqueDays = new Set(habitLogs.map(log => {
        return typeof log.date === 'string' ? log.date.split("T")[0] : log.date.toISOString().split("T")[0];
      })).size;

      const consistency = Math.round((uniqueDays / 7) * 100);

      if (uniqueDays > max) {
        max = uniqueDays;
        bestHabit = habit.title;
      }

      if (uniqueDays < min) {
        min = uniqueDays;
        weakHabit = habit.title;
      }

      habitInsights.push({
        habitId: habit._id,
        title: habit.title,
        completedDays: uniqueDays,
        consistencyPercent: consistency,
      });
    }

    // Smart AI message
    let message = "You're building discipline steadily. Keep going! 💪";

    if (max >= 5) {
      message = `Amazing consistency on "${bestHabit}"! You're unstoppable 🔥`;
    } else if (min <= 2) {
      message = `Focus more on "${weakHabit}". Small steps daily will help 📈`;
    }

    res.json({
      message,
      bestHabit,
      weakHabit,
      insights: habitInsights,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getInsights };