const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { getTodayIST } = require("./dateHelper"); // ⭐ Import your IST helper

const difficultyPoints = {
  Easy: 5,
  Medium: 10,
  Hard: 15,
};

const calculateDisciplineScore = async (userId) => {
  // ⭐ Fix: Enforce exact IST date string
  const today = getTodayIST();

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