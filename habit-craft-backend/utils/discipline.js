const HabitLog = require("../models/HabitLog");

const calculateDisciplineScore = async (userId) => {
  const today = new Date();
  const last7Days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }

  const logs = await HabitLog.find({
    userId,
    date: { $in: last7Days },
    completed: true,
  });

  const completedDays = logs.length;
  const score = Math.round((completedDays / 7) * 100);

  return score;
};

module.exports = { calculateDisciplineScore };
