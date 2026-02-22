const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const User = require("../models/User");
const { calculateWeeklyAnalytics } = require("../utils/analytics");
const { calculateDisciplineScore } = require("../utils/disciplineScore");



// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;

        const today = new Date().toISOString().split("T")[0];

        // 1️⃣ Get active habits
        const habits = await Habit.find({ userId, isActive: true });

        // 2️⃣ Get today's completion logs
        const logs = await HabitLog.find({ userId, date: today });

        // Map completion status
        const habitsWithStatus = habits.map(habit => {
            const completedLog = logs.find(
                log => log.habitId.toString() === habit._id.toString()
            );

            return {
                ...habit.toObject(),
                completedToday: !!completedLog,
            };
        });

        // 3️⃣ Calculate discipline score dynamically
        const disciplineScore = await calculateDisciplineScore(userId);


        // 4️⃣ Weekly analytics
        const weeklyAnalytics = await calculateWeeklyAnalytics(userId);

        res.json({
            disciplineScore,
            totalHabits: habits.length,
            habits: habitsWithStatus,
            weeklyAnalytics, // ⭐ NEW FIELD
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dashboard insights (weekly analytics summary)
// @route   GET /api/dashboard/insights
// @access  Private
const getDashboardInsights = async (req, res) => {
  try {
    const userId = req.user._id;

    const { calculateWeeklyAnalytics } = require("../utils/analytics");

    const analytics = await calculateWeeklyAnalytics(userId);

    const consistency = analytics.overall.consistencyPercent;

    // 🧠 AI-style interpretation logic
    let riskLevel = "low";
    let summary = "";
    let nudge = "";

    if (consistency >= 75) {
      riskLevel = "low";
      summary = `Excellent consistency! You're dominating with ${analytics.bestHabit}.`;
      nudge = "Stay consistent and push for perfection 🔥";
    } 
    else if (consistency >= 40) {
      riskLevel = "medium";
      summary = `You're doing well in ${analytics.bestHabit}, but ${analytics.weakHabit} needs attention.`;
      nudge = `Focus on ${analytics.weakHabit} today to balance discipline ⚖️`;
    } 
    else {
      riskLevel = "high";
      summary = `Your habit consistency is dropping, especially in ${analytics.weakHabit}.`;
      nudge = `Start small: complete ${analytics.weakHabit} today to rebuild momentum 💪`;
    }

    res.json({
      overallConsistency: consistency,
      bestHabit: analytics.bestHabit,
      weakHabit: analytics.weakHabit,
      totalCompleted: analytics.overall.completed,
      totalPossible: analytics.overall.total,
      riskLevel,
      summary,
      nudge,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



module.exports = { getDashboard, getDashboardInsights };
