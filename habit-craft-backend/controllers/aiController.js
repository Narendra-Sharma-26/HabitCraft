const { generateAINudge } = require("../utils/aiNudgeEngine");

// @desc    Get AI smart nudge based on habit consistency
// @route   GET /api/ai/nudge
// @access  Private
const getAINudge = async (req, res) => {
  try {
    const userId = req.user._id;

    const nudge = await generateAINudge(userId);

    if (!nudge) {
      return res.json({
        message: "No habits found to generate nudge.",
      });
    }

    res.json({
      focusHabit: nudge.title,
      consistency: nudge.consistency,
      message: nudge.message,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAINudge };
