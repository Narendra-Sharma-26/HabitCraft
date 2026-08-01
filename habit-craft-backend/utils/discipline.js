const HabitLog = require("../models/HabitLog");
const { getPastISTDate } = require("./dateHelper"); // Import your IST helper

const calculateDisciplineScore = async (userId) => {
  const last7Days = [];

  // ⭐ Fix: Use the IST helper to generate the last 7 days (0 = today, up to 6 days ago)
  for (let i = 0; i < 7; i++) {
    last7Days.push(getPastISTDate(i));
  }

  const logs = await HabitLog.find({
    userId,
    date: { $in: last7Days },
    completed: true,
  });

  // ⭐ Protect against duplicate daily logs artificially inflating the score
  const uniqueDays = new Set(logs.map(log => {
    return typeof log.date === 'string' ? log.date.split("T")[0] : log.date.toISOString().split("T")[0];
  })).size;

  const score = Math.round((uniqueDays / 7) * 100);

  return score;
};

module.exports = { calculateDisciplineScore };