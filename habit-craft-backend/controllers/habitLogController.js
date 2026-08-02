const HabitLog = require("../models/HabitLog");
const Habit = require("../models/Habit");
const User = require("../models/User");
const { getTodayIST, getPastISTDate } = require("../utils/dateHelper");

const difficultyPoints = {
  Easy: 5,
  Medium: 10,
  Hard: 15,
};

// @desc    Mark habit as completed for today
// @route   PATCH /api/habits/:id/complete
// @access  Private
const completeHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const habitId = req.params.id;
    
    const today = getTodayIST(); 
    const yesterdayDate = getPastISTDate(1);

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    // ⭐ BULLETPROOF FETCH: Get logs from yesterday onwards
    const recentLogs = await HabitLog.find({
        habitId,
        date: { $gte: yesterdayDate }
    });

    const formatLogDate = (log) => {
        return typeof log.date === 'string' ? log.date.split("T")[0] : log.date.toISOString().split("T")[0];
    };

    // Check if completed today using safe string matching
    const hasCompletedToday = recentLogs.some(log => formatLogDate(log) === today);
    if (hasCompletedToday) return res.status(400).json({ message: "Habit already marked complete today" });

    // Create the new log strictly using the IST string
    const log = await HabitLog.create({
      habitId,
      userId,
      date: today,
      completed: true,
      completedAt: new Date(),
    });

    // ⭐ BULLETPROOF STREAK: Safely check for yesterday's log regardless of DB type
    const hasCompletedYesterday = recentLogs.some(log => formatLogDate(log) === yesterdayDate);
    
    habit.streak = hasCompletedYesterday ? habit.streak + 1 : 1;
    habit.totalCompleted += 1;
    await habit.save();

    // XP System Logic
    const points = difficultyPoints[habit.difficulty] || 10;
    const user = await User.findById(userId);
    user.disciplineScore = (user.disciplineScore || 0) + points;
    await user.save();

    res.json({ message: "Habit marked as complete", log });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Undo today's habit completion
// @route   DELETE /api/habits/:id/complete
// @access  Private
const undoHabitComplete = async (req, res) => {
  try {
    const userId = req.user._id;
    const habitId = req.params.id;
    const today = getTodayIST();

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    // Safely find and delete today's log using the exact IST string
    const log = await HabitLog.findOneAndDelete({ habitId, date: today });
    if (!log) return res.status(400).json({ message: "Habit was not completed today" });

    habit.streak = Math.max(0, habit.streak - 1);
    habit.totalCompleted = Math.max(0, habit.totalCompleted - 1);
    await habit.save();

    const points = difficultyPoints[habit.difficulty] || 10;
    const user = await User.findById(userId);
    user.disciplineScore = Math.max(0, (user.disciplineScore || 0) - points);
    await user.save();

    res.json({ message: "Habit completion undone successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { completeHabit, undoHabitComplete };


// =======================================================

// const HabitLog = require("../models/HabitLog");
// const Habit = require("../models/Habit");
// const User = require("../models/User");
// const { getTodayIST, getPastISTDate } = require("../utils/dateHelper");

// const difficultyPoints = {
//   Easy: 5,
//   Medium: 10,
//   Hard: 15,
// };

// // @desc    Mark habit as completed for today
// // @route   PATCH /api/habits/:id/complete
// // @access  Private
// const completeHabit = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const habitId = req.params.id;
    
//     // Gets the exact local date string (e.g., "2026-04-23")
//     const today = getTodayIST(); 

//     const habit = await Habit.findOne({ _id: habitId, userId });
//     if (!habit) return res.status(404).json({ message: "Habit not found" });

//     let log = await HabitLog.findOne({ habitId, date: today });
//     if (log) return res.json({ message: "Habit already marked complete today" });

//     log = await HabitLog.create({
//       habitId,
//       userId,
//       date: today,
//       completed: true,
//       completedAt: new Date(),
//     });

//     // ⭐ THE MIDNIGHT TIMEZONE FIX FOR STREAKS ⭐
//     // Use the safe helper instead of manipulating UTC Date objects
//     const yesterdayDate = getPastISTDate(1);

//     const yesterdayLog = await HabitLog.findOne({ habitId, date: yesterdayDate });
//     habit.streak = yesterdayLog ? habit.streak + 1 : 1;
//     habit.totalCompleted += 1;
//     await habit.save();

//     // 2️⃣ XP System Logic (Cumulative)
//     const points = difficultyPoints[habit.difficulty] || 10;
//     const user = await User.findById(userId);
//     user.disciplineScore = (user.disciplineScore || 0) + points;
//     await user.save();

//     res.json({ message: "Habit marked as complete", log });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // @desc    Undo today's habit completion
// // @route   DELETE /api/habits/:id/complete
// // @access  Private
// const undoHabitComplete = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const habitId = req.params.id;
//     const today = getTodayIST();

//     const habit = await Habit.findOne({ _id: habitId, userId });
//     if (!habit) return res.status(404).json({ message: "Habit not found" });

//     const log = await HabitLog.findOneAndDelete({ habitId, date: today });
//     if (!log) return res.status(400).json({ message: "Habit was not completed today" });

//     // 1️⃣ Rollback Streak Logic
//     habit.streak = Math.max(0, habit.streak - 1);
//     habit.totalCompleted = Math.max(0, habit.totalCompleted - 1);
//     await habit.save();

//     // 2️⃣ Rollback XP Logic
//     const points = difficultyPoints[habit.difficulty] || 10;
//     const user = await User.findById(userId);
//     user.disciplineScore = Math.max(0, (user.disciplineScore || 0) - points);
//     await user.save();

//     res.json({ message: "Habit completion undone successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// module.exports = { completeHabit, undoHabitComplete };