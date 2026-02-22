const Habit = require("../models/Habit");

const Schedule = require("../models/Schedule");
const { findAvailableTime } = require("../utils/scheduler");



// @desc    Add new habit
// @route   POST /api/habits
// @access  Private
const addHabit = async (req, res) => {
  try {
    const { title, category, difficulty, preferredTime, duration } = req.body;

    const userId = req.user._id;

    // 2️⃣ Get user schedule
    const schedule = await Schedule.findOne({ userId });

    if (!schedule) {
        return res.status(400).json({
        message: "Please set your schedule before adding habits.",
         });
    }

    // 3️⃣ Determine scheduled time
    const scheduledTime = findAvailableTime(schedule, preferredTime);


    // 1️⃣ Check active habits count
    const activeHabitsCount = await Habit.countDocuments({
      userId,
      isActive: true,
      isArchived: false,
    });

    if (activeHabitsCount >= 3) {
      return res.status(400).json({
        message: "You can only have a maximum of 3 active habits.",
      });
    }

    // 2️⃣ Create habit
    const habit = await Habit.create({
      userId,
      title,
      category,
      difficulty,
      preferredTime,
      scheduledTime,
      duration,
    });

    res.status(201).json({
      message: "Habit added successfully",
      habit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all habits for user
// @route   GET /api/habits
// @access  Private
const getHabits = async (req, res) => {
  try {
    const userId = req.user._id;

    const habits = await Habit.find({ userId });

    res.json({
      total: habits.length,
      habits,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle habit active/pause with monthly limit
// @route   PATCH /api/habits/:id/toggle
// @access  Private
const toggleHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const habitId = req.params.id;

    const habit = await Habit.findOne({ _id: habitId, userId });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    // Reset counter if new month
    if (habit.pauseMonth !== currentMonth) {
      habit.pauseMonth = currentMonth;
      habit.pauseCount = 0;
    }

    // If trying to pause
    if (habit.isActive) {
      if (habit.pauseCount >= 4) {
        return res.status(400).json({
          message:
            "Pause limit reached for this month. Stay consistent or resume later.",
        });
      }

      habit.isActive = false;
      habit.pauseCount += 1;

      await habit.save();

      return res.json({
        message: `Habit paused (${habit.pauseCount}/4 pauses used this month)`,
        habit,
      });
    }

    // If resuming (always allowed)
    habit.isActive = true;
    await habit.save();

    res.json({
      message: "Habit resumed",
      habit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Archive habit (soft delete)
// @route   PATCH /api/habits/:id/archive
// @access  Private
const archiveHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const habitId = req.params.id;

    const habit = await Habit.findOne({ _id: habitId, userId });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    habit.isArchived = true;
    habit.isActive = false; // ensure it’s not active
    await habit.save();

    res.json({
      message: "Habit archived successfully",
      habit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = { addHabit, getHabits, toggleHabit, archiveHabit };
