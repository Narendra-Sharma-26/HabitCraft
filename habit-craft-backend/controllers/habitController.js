const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

const Schedule = require("../models/Schedule");
const { findAvailableTime } = require("../utils/scheduler");



// @desc    Add new habit
// @route   POST /api/habits
// @access  Private
const addHabit = async (req, res) => {
  try {
    const { title, category, difficulty, preferredTime, duration, timeWindow } = req.body; 
    const userId = req.user._id;

    const schedule = await Schedule.findOne({ userId });
    if (!schedule) {
        return res.status(400).json({ message: "Please set your schedule before adding habits." });
    }

    const existingHabits = await Habit.find({ userId, isActive: true, isArchived: false });
    const activeCount = existingHabits.length;

    // ⭐ CALCULATE CONSISTENCY FOR THE LIMIT CHECK
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const logsLast30Days = await HabitLog.find({
        userId, date: { $gte: thirtyDaysAgo.toISOString().split("T")[0] }, completed: true
    });
    
    let consistency = 0;
    if (activeCount > 0) {
        consistency = Math.round((logsLast30Days.length / (activeCount * 30)) * 100);
    }

    // ⭐ DYNAMIC HABIT LIMIT LOGIC
    if (activeCount >= 10) {
        return res.status(400).json({ message: "Absolute limit reached. You can only have 10 active habits." });
    } else if (activeCount >= 7 && consistency <= 95) {
        return res.status(400).json({ message: `Consistency > 95% required for habits 8-10. Your consistency is ${consistency}%.` });
    } else if (activeCount >= 5 && consistency <= 90) {
        return res.status(400).json({ message: `Consistency > 90% required for habits 6-7. Your consistency is ${consistency}%.` });
    } else if (activeCount >= 3 && consistency <= 80) {
        return res.status(400).json({ message: `Consistency > 80% required to exceed 3 habits. Your consistency is ${consistency}%.` });
    }

    const habitDuration = duration ? Number(duration) : 30;
    const scheduledTime = findAvailableTime(schedule, preferredTime, existingHabits, habitDuration, timeWindow);

    const habit = await Habit.create({
      userId, title, category, difficulty, preferredTime, timeWindow, scheduledTime, duration: habitDuration, 
    });

    res.status(201).json({ message: "Habit added successfully", habit });
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

// @desc    Edit a habit
// @route   PUT /api/habits/:id
// @access  Private
const editHabit = async (req, res) => {
  try {
    const { title, category, difficulty, duration, scheduledTime } = req.body;
    const userId = req.user._id;
    const habitId = req.params.id;

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    // Update fields
    if (title) habit.title = title;
    if (category) habit.category = category;
    if (difficulty) habit.difficulty = difficulty;
    if (duration) habit.duration = Number(duration);
    
    // Allow user to manually override the AI's time!
    if (scheduledTime) habit.scheduledTime = scheduledTime; 

    await habit.save();

    res.json({ message: "Habit updated successfully", habit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a habit permanently
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const habitId = req.params.id;

    const habit = await Habit.findOneAndDelete({ _id: habitId, userId });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    res.json({ message: "Habit permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = { addHabit, getHabits, toggleHabit, archiveHabit, editHabit, deleteHabit };
