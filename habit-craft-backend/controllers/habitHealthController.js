const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { getPastISTDate } = require("../utils/dateHelper");

// @desc    Get health score of all habits (dynamic timeframe)
// @route   GET /api/habits/health?range=week|month|6months|year
// @access  Private
const getHabitHealthScores = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // ⭐ Extract dynamic range
    const range = req.query.range || 'month';
    let days = 30;
    if (range === 'week') days = 7;
    else if (range === '6months') days = 180;
    else if (range === 'year') days = 365;

    // 1. Fetch active habits
    const habits = await Habit.find({ userId, isActive: true });

    // 2. Dynamic start date based on selected timeframe
    const startDateStr = getPastISTDate(days); 

    // 3. Calculate health concurrently
    const healthData = await Promise.all(habits.map(async (habit) => {
      const uniqueDates = await HabitLog.distinct("date", {
        habitId: habit._id,
        completed: true,
        date: { $gte: startDateStr }
      });

      const habitCreationDate = new Date(habit.createdAt);
      const daysSinceCreation = Math.floor((new Date() - habitCreationDate) / (1000 * 60 * 60 * 24)) + 1;
      const expectedDays = Math.max(1, Math.min(daysSinceCreation, days)); 

      let healthScore = 0;
      if (expectedDays > 0) {
        healthScore = Math.round((uniqueDates.length / expectedDays) * 100);
      }

      return {
        _id: habit._id,
        title: habit.title,
        icon: habit.icon, 
        healthScore: Math.min(healthScore, 100) 
      };
    }));

    // 4. Send payload to frontend
    res.json({
      count: healthData.length,
      habits: healthData,
    });

  } catch (error) {
    console.error("Habit Health Calculation Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHabitHealthScores };