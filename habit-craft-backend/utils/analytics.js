const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

// Get last 7 days date strings
const getLast7DaysRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    return { todayStr, sevenDaysAgoStr };
};

const calculateWeeklyAnalytics = async (userId) => {
    const { todayStr, sevenDaysAgoStr } = getLast7DaysRange();

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

        const completedDays = habitLogs.length;
        const consistencyPercent = (completedDays / 7) * 100;

        overallCompleted += completedDays;

        // Track best & weakest habit
        if (completedDays > max) {
            max = completedDays;
            bestHabit = habit.title;
        }

        if (completedDays < min) {
            min = completedDays;
            weakHabit = habit.title;
        }

        habitStats.push({
            habitId: habit._id,
            title: habit.title,
            completedDays,
            consistencyPercent: Number(consistencyPercent.toFixed(0)),
            streak: habit.streak,
        });
    }

    // 📅 Daily completion trend for last 7 days
    const dailyTrendMap = {};

    // Initialize last 7 days with 0
    const startDate = new Date(sevenDaysAgoStr);
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const key = d.toISOString().split("T")[0];
        dailyTrendMap[key] = 0;
    }

    // Count logs per day
    logs.forEach(log => {
        const logDate =
            typeof log.date === "string"
                ? log.date
                : new Date(log.date).toISOString().split("T")[0];

        if (dailyTrendMap[logDate] !== undefined) {
            dailyTrendMap[logDate] += 1;
        }
    });

    const dailyTrend = Object.keys(dailyTrendMap).map(date => ({
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
