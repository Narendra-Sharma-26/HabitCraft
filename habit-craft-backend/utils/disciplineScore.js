const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

const difficultyPoints = {
  Easy: 5,
  Medium: 10,
  Hard: 15,
};

const calculateDisciplineScore = async (userId) => {
  const today = new Date().toISOString().split("T")[0];

  // Get all active habits
  const habits = await Habit.find({ userId, isActive: true });

  let totalScore = 0;
  let maxPossibleScore = 0;

  for (let habit of habits) {
    const log = await HabitLog.findOne({
      habitId: habit._id,
      date: today,
      completed: true,
    });

    const points = difficultyPoints[habit.difficulty] || 0;

    maxPossibleScore += points;

    if (log) {
      totalScore += points;
    }
  }

  // Convert to percentage score (0–100)
  const finalScore =
    maxPossibleScore === 0
      ? 0
      : Math.round((totalScore / maxPossibleScore) * 100);

  return finalScore;
};

module.exports = { calculateDisciplineScore };
