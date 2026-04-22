const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

// @desc    Get health score of all habits
// @route   GET /api/habits/health
// @access  Private
const getHabitHealthScores = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 1. Fetch only active habits for this user
    const habits = await Habit.find({ userId, isActive: true });

    // 2. Define the 30-day rolling window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // 3. Calculate health for each habit concurrently
    const healthData = await Promise.all(habits.map(async (habit) => {
      
      // Fetch completed logs for this specific habit within the 30-day window
      const logs = await HabitLog.find({
        habitId: habit._id,
        completed: true,
        date: { $gte: thirtyDaysAgoStr }
      });

      // Calculate how many days the habit has actually existed (max 30)
      const habitCreationDate = new Date(habit.createdAt);
      const daysSinceCreation = Math.floor((new Date() - habitCreationDate) / (1000 * 60 * 60 * 24)) + 1;
      const expectedDays = Math.max(1, Math.min(daysSinceCreation, 30)); // Ensure we never divide by 0

      // The Health Formula: (Actual Completions / Expected Completions) * 100
      let healthScore = 0;
      if (expectedDays > 0) {
        healthScore = Math.round((logs.length / expectedDays) * 100);
      }

      return {
        _id: habit._id,
        title: habit.title,
        healthScore: Math.min(healthScore, 100) // Hard cap at 100% just in case
      };
    }));

    // 4. Send the perfectly formatted payload to the frontend
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