const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { getTodayIST, getPastISTDate } = require("./dateHelper"); // ⭐ Import your IST helpers

const calculateHabitHealthScores = async (userId) => {
  // ⭐ Fix: Use exact IST date strings
  const todayStr = getTodayIST();
  const sevenDaysAgoStr = getPastISTDate(6); // 6 days ago + today = 7 days

  const habits = await Habit.find({
    userId,
    isActive: true,
    $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
  });

  if (habits.length === 0) return [];

  const logs = await HabitLog.find({
    userId,
    completed: true,
    date: { $gte: sevenDaysAgoStr, $lte: todayStr },
  });

  const habitHealth = habits.map((habit) => {
    const habitLogs = logs.filter(
      (log) => log.habitId.toString() === habit._id.toString()
    );

    // ⭐ Fix: Use a Set to ensure we only count unique days, preventing >100% scores
    const uniqueDays = new Set(habitLogs.map(log => {
      return typeof log.date === 'string' ? log.date.split("T")[0] : log.date.toISOString().split("T")[0];
    })).size;

    const consistencyPercent = (uniqueDays / 7) * 100;

    // Streak weight capped at 100
    const streakWeight = Math.min(habit.streak * 10, 100);

    const healthScore = consistencyPercent * 0.6 + streakWeight * 0.4;

    return {
      habitId: habit._id,
      title: habit.title,
      consistencyPercent: Math.round(consistencyPercent),
      streak: habit.streak,
      healthScore: Math.round(healthScore),
    };
  });

  return habitHealth.sort((a, b) => b.healthScore - a.healthScore);
};

module.exports = { calculateHabitHealthScores };