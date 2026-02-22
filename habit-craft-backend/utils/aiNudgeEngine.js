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

const generateAINudge = async (userId) => {
  const { todayStr, sevenDaysAgoStr } = getLast7DaysRange();

  const habits = await Habit.find({
    userId,
    isActive: true,
    $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
  });

  if (habits.length === 0) return null;

  const logs = await HabitLog.find({
    userId,
    completed: true,
    date: { $gte: sevenDaysAgoStr, $lte: todayStr },
  });

  let weakestHabit = null;
  let lowestConsistency = 101;

  for (let habit of habits) {
    const habitLogs = logs.filter(
      log => log.habitId.toString() === habit._id.toString()
    );

    const consistency = (habitLogs.length / 7) * 100;

    if (consistency < lowestConsistency) {
      lowestConsistency = consistency;
      weakestHabit = habit;
    }
  }

  if (!weakestHabit) return null;

  // Generate smart message
  let message = "";

  if (lowestConsistency < 30) {
    message = `⚠️ Your habit "${weakestHabit.title}" is at high risk. Let’s restart strong tomorrow!`;
  } else if (lowestConsistency < 60) {
    message = `💡 Stay consistent with "${weakestHabit.title}". You're doing okay but can improve!`;
  } else {
    message = `🔥 Great job! Maintain your streak for "${weakestHabit.title}".`;
  }

  return {
    habitId: weakestHabit._id,
    title: weakestHabit.title,
    consistency: Math.round(lowestConsistency),
    message,
  };
};

module.exports = { generateAINudge };
