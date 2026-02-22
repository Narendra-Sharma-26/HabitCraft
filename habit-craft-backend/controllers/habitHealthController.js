const { calculateHabitHealthScores } = require("../utils/habitHealthEngine");

// @desc    Get health score of all habits
// @route   GET /api/habits/health
// @access  Private
const getHabitHealthScores = async (req, res) => {
  try {
    const userId = req.user._id;

    const healthScores = await calculateHabitHealthScores(userId);

    res.json({
      count: healthScores.length,
      habits: healthScores,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHabitHealthScores };