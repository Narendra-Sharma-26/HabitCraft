const Schedule = require("../models/Schedule");

// @desc    Create or update user schedule
// @route   POST /api/schedule
// @access  Private
const saveSchedule = async (req, res) => {
  try {
    const { wakeUpTime, sleepTime, busySlots, timezone } = req.body;

    const userId = req.user._id;

    // Check if schedule already exists
    let schedule = await Schedule.findOne({ userId });

    if (schedule) {
      // Update existing schedule
      schedule.wakeUpTime = wakeUpTime;
      schedule.sleepTime = sleepTime;
      schedule.busySlots = busySlots;
      schedule.timezone = timezone || schedule.timezone;

      await schedule.save();

      return res.json({
        message: "Schedule updated",
        schedule,
      });
    }

    // Create new schedule
    schedule = await Schedule.create({
      userId,
      wakeUpTime,
      sleepTime,
      busySlots,
      timezone,
    });

    res.status(201).json({
      message: "Schedule created",
      schedule,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveSchedule };
