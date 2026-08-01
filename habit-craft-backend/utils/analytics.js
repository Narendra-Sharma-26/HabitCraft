const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { getTodayIST, getPastISTDate } = require("./dateHelper"); 

const calculateWeeklyAnalytics = async (userId) => {
    // ⭐ Use exact IST date strings
    const todayStr = getTodayIST();
    const sevenDaysAgoStr = getPastISTDate(6); // 6 days ago + today = 7 days

    // 1️⃣ Get all active habits
    const habits = await Habit.find({
        userId,
        isActive: true,
        $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    });

    if (habits.length === 0) {
        return {
            overall: { completed: 0, total: 0, consistencyPercent: 0 },
            habits: [],
            bestHabit: null,
            weakHabit: null,
        };
    }

    // 2️⃣ Fetch ALL logs in one query (optimized 🚀)
    const logs = await HabitLog.find({
        userId,
        completed: true,
        date: { $gte: sevenDaysAgoStr, $lte: todayStr },
    });

    let overallCompleted = 0;
    const overallTotal = habits.length * 7;

    const habitStats = [];
    let bestHabit = null;
    let weakHabit = null;
    let max = -1;
    let min = 8;

    for (let habit of habits) {
        const habitLogs = logs.filter(
            log => log.habitId.toString() === habit._id.toString()
        );

        // ⭐ Protect against duplicate daily logs inflating the score
        const uniqueDays = new Set(habitLogs.map(log => {
            return typeof log.date === 'string' ? log.date.split("T")[0] : log.date.toISOString().split("T")[0];
        })).size;

        const consistencyPercent = (uniqueDays / 7) * 100;

        overallCompleted += uniqueDays;

        // Track best & weakest habit
        if (uniqueDays > max) {
            max = uniqueDays;
            bestHabit = habit.title;
        }

        if (uniqueDays < min) {
            min = uniqueDays;
            weakHabit = habit.title;
        }

        habitStats.push({
            habitId: habit._id,
            title: habit.title,
            completedDays: uniqueDays,
            consistencyPercent: Number(consistencyPercent.toFixed(0)),
            streak: habit.streak,
        });
    }

    // 📅 Daily completion trend for last 7 days
    const dailyTrendMap = {};

    // ⭐ Fix: Initialize last 7 days using exact IST strings to avoid UTC Date math
    for (let i = 0; i < 7; i++) {
        // 6-0=6 days ago, 6-1=5 days ago... 6-6=0 days ago (today)
        const key = getPastISTDate(6 - i); 
        dailyTrendMap[key] = 0;
    }

    // Count logs per day
    logs.forEach(log => {
        // Safely extract just the YYYY-MM-DD
        const logDate = typeof log.date === "string"
            ? log.date.split("T")[0]
            : log.date.toISOString().split("T")[0];

        if (dailyTrendMap[logDate] !== undefined) {
            dailyTrendMap[logDate] += 1;
        }
    });

    const dailyTrend = Object.keys(dailyTrendMap).sort().map(date => ({
        date,
        completed: dailyTrendMap[date],
    }));

    const overallConsistency =
        overallTotal === 0 ? 0 : (overallCompleted / overallTotal) * 100;

    return {
        overall: {
            completed: overallCompleted,
            total: overallTotal,
            consistencyPercent: Number(overallConsistency.toFixed(0)),
        },
        habits: habitStats,
        bestHabit,
        weakHabit,
        dailyTrend,
    };
};

module.exports = { calculateWeeklyAnalytics };