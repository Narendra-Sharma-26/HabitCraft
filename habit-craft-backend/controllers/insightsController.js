const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

// @desc    Get AI Coach Insights
// @route   GET /api/dashboard/insights
// @access  Private
const getInsights = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get last 7 days range
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

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

      const completedDays = habitLogs.length;
      const consistency = Math.round((completedDays / 7) * 100);

      if (completedDays > max) {
        max = completedDays;
        bestHabit = habit.title;
      }

      if (completedDays < min) {
        min = completedDays;
        weakHabit = habit.title;
      }

      habitInsights.push({
        habitId: habit._id,
        title: habit.title,
        completedDays,
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
