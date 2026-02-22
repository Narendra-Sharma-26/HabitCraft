const { generateAINudge } = require("./aiNudgeEngine");
const HabitLog = require("../models/HabitLog");
const { calculateHabitHealthScores } = require("./habitHealthEngine");

// Helper to get today string (IST safe later if needed)
const getTodayStr = () => new Date().toISOString().split("T")[0];

// 🔥 Map internal priorities → DB ENUM types
const PRIORITY_TYPES = {
  DISCIPLINE: "discipline_reminder",
  RECOVERY_PUSH: "missed_recovery_push",
  AI_RISK: "consistency_reinforcement",
  STREAK_PROTECT: "consistency_reinforcement",
};

const decideNotificationPriority = async (userId) => {
  const today = getTodayStr();

  // ===============================
  // 1️⃣ Check if user missed yesterday (absence logic)
  // ===============================
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const yesterdayCompletion = await HabitLog.exists({
    userId,
    date: yesterdayStr,
    completed: true,
  });

  const missedYesterday = !yesterdayCompletion;

  // ===============================
  // 2️⃣ Generate AI nudge (trend detection)
  // ===============================
  const aiNudge = await generateAINudge(userId);

  // ===============================
  // 3️⃣ Fetch Habit Health Scores (NEW 🔥)
  // ===============================
  const healthData = await calculateHabitHealthScores(userId);

  // Find weakest habit
  let weakestHabit = null;
  let minHealth = 101;

  healthData.forEach(h => {
    if (h.healthScore < minHealth) {
      minHealth = h.healthScore;
      weakestHabit = h;
    }
  });

  // ===============================
  // 4️⃣ Priority Decision Logic (Health + Behavior)
  // ===============================
  let priority = PRIORITY_TYPES.DISCIPLINE; // default
  let message = "Stay disciplined and follow your habit today.";

  if (missedYesterday) {
    priority = PRIORITY_TYPES.RECOVERY_PUSH;
    message = "You missed yesterday. Let’s get back on track today 💪";

  } else if (weakestHabit && weakestHabit.healthScore < 40) {
    priority = PRIORITY_TYPES.RECOVERY_PUSH;
    message = `Your habit "${weakestHabit.title}" is struggling. Do a small step today.`;

  } else if (weakestHabit && weakestHabit.healthScore < 70) {
    priority = PRIORITY_TYPES.DISCIPLINE;
    message = `Stay consistent with "${weakestHabit.title}" today. Discipline builds strength.`;

  } else if (weakestHabit && weakestHabit.healthScore >= 70) {
    priority = PRIORITY_TYPES.STREAK_PROTECT;
    message = `Great consistency on "${weakestHabit.title}". Don’t break the chain 🔥`;

  } else if (aiNudge && aiNudge.consistency < 40) {
    priority = PRIORITY_TYPES.AI_RISK;
    message = aiNudge.message;
  }

  return {
    priority,
    message,
  };
};

module.exports = { decideNotificationPriority };