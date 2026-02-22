const HabitLog = require("../models/HabitLog");
const Habit = require("../models/Habit");
const User = require("../models/User");
const { calculateDisciplineScore } = require("../utils/discipline");


// @desc    Mark habit as completed for today
// @route   POST /api/habits/:id/complete
// @access  Private
const completeHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const habitId = req.params.id;

    //const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const { getTodayIST } = require("../utils/dateHelper");
    const today = getTodayIST();

    // 1️⃣ Check if habit belongs to user
    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // 2️⃣ Check if already completed today
    let log = await HabitLog.findOne({ habitId, date: today });

    if (log) {
      return res.json({ message: "Habit already marked complete today" });
    }

    // 3️⃣ Create new log (first time completion today)
    log = await HabitLog.create({
      habitId,
      userId,
      date: today,
      completed: true,
      completedAt: new Date(),
    });

    // 4️⃣ Update habit stats (streak logic)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0];

    const yesterdayLog = await HabitLog.findOne({
      habitId,
      date: yesterdayDate,
    });

    if (yesterdayLog) {
      habit.streak += 1;
    } else {
      habit.streak = 1;
    }

    habit.totalCompleted += 1;
    await habit.save();

    // 5️⃣ Recalculate discipline score (single source of truth)
    const score = await calculateDisciplineScore(userId);
    await User.findByIdAndUpdate(userId, { disciplineScore: score });

    res.json({
      message: "Habit marked as complete",
      log,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { completeHabit };
