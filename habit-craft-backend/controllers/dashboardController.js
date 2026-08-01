const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const User = require("../models/User");
const Schedule = require("../models/Schedule"); 
const { calculateWeeklyAnalytics } = require("../utils/analytics");
const { getTodayIST, getPastISTDate } = require("../utils/dateHelper");

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const schedule = await Schedule.findOne({ userId });
        const hasSchedule = !!schedule;
        
        const todayStr = getTodayIST();
        const yesterdayStr = getPastISTDate(1);

        const habits = await Habit.find({ userId, isActive: true });
        
        // ⭐ THE FIX: Changed $in to $gte. 
        // This safely captures both string ("2026-08-02") and Date objects ("2026-08-02T10:30Z") 
        // from yesterday midnight onwards, preventing the logs from coming back empty.
        const recentLogs = await HabitLog.find({
            userId,
            date: { $gte: yesterdayStr },
            completed: true
        });

        // Safely format the log date 
        const formatLogDate = (log) => {
            return typeof log.date === 'string' ? log.date.split("T")[0] : log.date.toISOString().split("T")[0];
        };

        const todayLogs = recentLogs.filter(log => formatLogDate(log) === todayStr);
        const aliveHabitIds = new Set(recentLogs.map(log => log.habitId.toString()));

        const habitsWithStatus = await Promise.all(habits.map(async (habit) => {
            const completedToday = todayLogs.some(log => log.habitId.toString() === habit._id.toString());
            
            const actualStreak = aliveHabitIds.has(habit._id.toString()) ? (habit.streak || 0) : 0;

            // ⭐ SELF-HEAL DB: Will now evaluate correctly because recentLogs is accurate
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

        const bestStreak = habitsWithStatus.reduce((max, habit) => Math.max(max, habit.streak || 0), 0);
        const user = await User.findById(userId).select("disciplineScore");

        const thirtyDaysAgoStr = getPastISTDate(29); 

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