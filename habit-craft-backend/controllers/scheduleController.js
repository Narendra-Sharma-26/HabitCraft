const Schedule = require("../models/Schedule");
const Habit = require("../models/Habit"); // ⭐ Needed for collision resolution
const { findAvailableTime } = require("../utils/scheduler"); // ⭐ Bring in the engine

// @desc    Get user schedule
// @route   GET /api/schedule
// @access  Private
const getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ userId: req.user._id });
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update user schedule & auto-resolve collisions
// @route   POST /api/schedule
// @access  Private
const saveSchedule = async (req, res) => {
  try {
    console.log("--- STARTING SCHEDULE UPDATE ---");
    
    // Default busySlots to an empty array just in case the frontend sends undefined
    const { wakeUpTime, sleepTime, busySlots = [], timezone } = req.body;
    const userId = req.user._id;

    console.log("1. Incoming Payload:", { wakeUpTime, sleepTime, busySlotsLength: busySlots.length });

    // 1️⃣ Update or Create Schedule
    const schedule = await Schedule.findOneAndUpdate(
      { userId },
      { 
        wakeUpTime, 
        sleepTime, 
        busySlots, 
        timezone: timezone || "Asia/Kolkata" 
      },
      { new: true, upsert: true, runValidators: true }
    );

    console.log("2. Schedule saved to DB. WakeUp:", schedule.wakeUpTime);

    // 2️⃣ Auto-Resolve Habit Collisions
    const habits = await Habit.find({ userId, isActive: true, isArchived: false });
    console.log(`3. Found ${habits.length} active habits to realign.`);
    
    let newlyPlacedHabits = [];

    for (let habit of habits) {
      console.log(` -> Realigning habit: ${habit.title} (Duration: ${habit.duration}m)`);
      
      const newTime = findAvailableTime(
        schedule, 
        habit.preferredTime, 
        newlyPlacedHabits, 
        habit.duration, 
        habit.timeWindow
      );

      habit.scheduledTime = newTime;
      await habit.save();
      newlyPlacedHabits.push(habit);
      
      console.log(`    [Success] New time assigned: ${newTime}`);
    }

    console.log("--- SCHEDULE UPDATE COMPLETE ---");
    res.status(200).json({
      message: "Schedule updated and habits realigned successfully!",
      schedule,
      rescheduledHabitsCount: habits.length
    });

  } catch (error) {
    console.error("🚨 ERROR IN SAVESCHEDULE:", error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveSchedule, getSchedule };