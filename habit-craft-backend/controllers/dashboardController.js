const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const User = require("../models/User");
const Schedule = require("../models/Schedule"); // ⭐ Required for the onboarding check
const { calculateWeeklyAnalytics } = require("../utils/analytics");

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const schedule = await Schedule.findOne({ userId });
        const hasSchedule = !!schedule;
        
        // ⭐ THE MIDNIGHT TIMEZONE FIX ⭐
        // standard .toISOString() uses UTC time. 
        // This helper forces the date string into your local timezone so streaks don't reset at midnight!
        const getLocalDateString = (d) => {
            const offset = d.getTimezoneOffset() * 60000; 
            return new Date(d.getTime() - offset).toISOString().split("T")[0];
        };

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayStr = getLocalDateString(today);
        const yesterdayStr = getLocalDateString(yesterday);

        // 1️⃣ Get active habits
        const habits = await Habit.find({ userId, isActive: true });
        
        const recentLogs = await HabitLog.find({
            userId,
            date: { $in: [todayStr, yesterdayStr] },
            completed: true
        });

        // Safely format the log date to prevent Date Object crashes
        const formatLogDate = (log) => {
            if (typeof log.date === 'string') return log.date.split("T")[0];
            return getLocalDateString(new Date(log.date));
        };

        const todayLogs = recentLogs.filter(log => formatLogDate(log) === todayStr);
        const aliveHabitIds = new Set(recentLogs.map(log => log.habitId.toString()));

        const habitsWithStatus = await Promise.all(habits.map(async (habit) => {
            const completedToday = todayLogs.some(log => log.habitId.toString() === habit._id.toString());
            
            // If the streak is alive today OR yesterday, keep it. Otherwise, it's 0.
            const actualStreak = aliveHabitIds.has(habit._id.toString()) ? (habit.streak || 0) : 0;

            // ⭐ SELF-HEAL DB: Silently fix frozen streaks, but safely ignore timezone hiccups
            if ((habit.streak || 0) > 0 && actualStreak === 0 && !completedToday) {
                habit.streak = 0;
                await habit.save();
            }

            return {
                ...habit.toObject(),
                streak: completedToday ? habit.streak : actualStreak, 
                completedToday,
            };
        }));

        // 2️⃣ Calculate Best Streak & XP
        const bestStreak = habitsWithStatus.reduce((max, habit) => Math.max(max, habit.streak || 0), 0);
        const user = await User.findById(userId).select("disciplineScore");

        // 3️⃣ CALCULATE 30-DAY CONSISTENCY
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const thirtyDaysAgoStr = getLocalDateString(thirtyDaysAgo);

        const logsLast30Days = await HabitLog.find({
            userId,
            date: { $gte: thirtyDaysAgoStr },
            completed: true
        });

        let thirtyDayConsistency = 0;
        if (habits.length > 0) {
            const totalPossibleLogs = habits.length * 30; 
            thirtyDayConsistency = Math.round((logsLast30Days.length / totalPossibleLogs) * 100);
        }

        res.json({
            hasSchedule, 
            disciplineScore: user.disciplineScore || 0,
            bestStreak,
            thirtyDayConsistency,
            totalHabits: habits.length,
            habits: habitsWithStatus,
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