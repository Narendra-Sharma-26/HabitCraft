const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

const getLast7DaysRange = () => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  return { todayStr, sevenDaysAgoStr };
};

const calculateHabitHealthScores = async (userId) => {
  const { todayStr, sevenDaysAgoStr } = getLast7DaysRange();

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

    const consistencyPercent = (habitLogs.length / 7) * 100;

    // Streak weight capped at 100
    const streakWeight = Math.min(habit.streak * 10, 100);

    const healthScore =
      consistencyPercent * 0.6 + streakWeight * 0.4;

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