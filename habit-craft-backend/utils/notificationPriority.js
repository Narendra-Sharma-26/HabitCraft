
const Habit = require("../models/Habit"); // 👈 Added Habit model
const { generateAINudge } = require("./aiNudgeEngine");
const HabitLog = require("../models/HabitLog");
const { calculateHabitHealthScores } = require("./habitHealthEngine");
const { getPastISTDate, getTodayIST } = require("./dateHelper"); 

// 🔥 Map internal priorities → DB ENUM types
const PRIORITY_TYPES = {
  DISCIPLINE: "discipline_reminder",
  RECOVERY_PUSH: "missed_recovery_push",
  AI_RISK: "consistency_reinforcement",
  STREAK_PROTECT: "consistency_reinforcement",
};

const decideNotificationPriority = async (userId) => {
  const yesterdayStr = getPastISTDate(1);
  const todayStr = getTodayIST();
  
  // Create a strict midnight timestamp for today in IST
  const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);

  // ===============================
  // 1️⃣ Check Eligibility (Fix for new users/habits)
  // ===============================
  // Only penalize them for missing yesterday if they actually had a habit created BEFORE today.
  const eligibleForYesterdayCheck = await Habit.exists({
    userId,
    createdAt: { $lt: startOfToday }
  });

  if (eligibleForYesterdayCheck) {
    const yesterdayCompletion = await HabitLog.exists({
      userId,
      date: yesterdayStr,
      completed: true,
    });

    if (!yesterdayCompletion) {
      return {
        priority: PRIORITY_TYPES.RECOVERY_PUSH,
        message: "You missed yesterday. Let’s get back on track today 💪",
      };
    }
  }

  // ===============================
  // 2️⃣ Fetch AI Nudge & Health Scores Concurrently
  // ===============================
  const [aiNudge, healthData] = await Promise.all([
    generateAINudge(userId),
    calculateHabitHealthScores(userId)
  ]);

  // Find weakest habit
  let weakestHabit = null;
  let minHealth = 101;

  if (healthData && healthData.length > 0) {
    healthData.forEach(h => {
      if (h.healthScore < minHealth) {
        minHealth = h.healthScore;
        weakestHabit = h;
      }
    });
  }

  // ===============================
  // 3️⃣ Priority Decision Logic
  // ===============================
  
  if (aiNudge && aiNudge.consistency < 40) {
    return {
      priority: PRIORITY_TYPES.AI_RISK,
      message: aiNudge.message,
    };
  }

  if (weakestHabit) {
    if (weakestHabit.healthScore < 40) {
      return {
        priority: PRIORITY_TYPES.RECOVERY_PUSH,
        message: `Your habit "${weakestHabit.title}" is struggling. Do a small step today.`,
      };
    } 
    
    if (weakestHabit.healthScore < 70) {
      return {
        priority: PRIORITY_TYPES.DISCIPLINE,
        message: `Stay consistent with "${weakestHabit.title}" today. Discipline builds strength.`,
      };
    } 
    
    return {
      priority: PRIORITY_TYPES.STREAK_PROTECT,
      message: `Great consistency on "${weakestHabit.title}". Don’t break the chain 🔥`,
    };
  }

  // Default fallback for brand new users creating their first habit today
  return {
    priority: PRIORITY_TYPES.DISCIPLINE, 
    message: "Ready to build a new habit? Stay disciplined today!",
  };
};

module.exports = { decideNotificationPriority };




// ==========================================================

// const { generateAINudge } = require("./aiNudgeEngine");
// const HabitLog = require("../models/HabitLog");
// const { calculateHabitHealthScores } = require("./habitHealthEngine");

// // Helper to get today string (IST safe later if needed)
// const getTodayStr = () => new Date().toISOString().split("T")[0];

// // 🔥 Map internal priorities → DB ENUM types
// const PRIORITY_TYPES = {
//   DISCIPLINE: "discipline_reminder",
//   RECOVERY_PUSH: "missed_recovery_push",
//   AI_RISK: "consistency_reinforcement",
//   STREAK_PROTECT: "consistency_reinforcement",
// };

// const decideNotificationPriority = async (userId) => {
//   const today = getTodayStr();

//   // ===============================
//   // 1️⃣ Check if user missed yesterday (absence logic)
//   // ===============================
//   const yesterday = new Date();
//   yesterday.setDate(yesterday.getDate() - 1);
//   const yesterdayStr = yesterday.toISOString().split("T")[0];

//   const yesterdayCompletion = await HabitLog.exists({
//     userId,
//     date: yesterdayStr,
//     completed: true,
//   });

//   const missedYesterday = !yesterdayCompletion;

//   // ===============================
//   // 2️⃣ Generate AI nudge (trend detection)
//   // ===============================
//   const aiNudge = await generateAINudge(userId);

//   // ===============================
//   // 3️⃣ Fetch Habit Health Scores (NEW 🔥)
//   // ===============================
//   const healthData = await calculateHabitHealthScores(userId);

//   // Find weakest habit
//   let weakestHabit = null;
//   let minHealth = 101;

//   healthData.forEach(h => {
//     if (h.healthScore < minHealth) {
//       minHealth = h.healthScore;
//       weakestHabit = h;
//     }
//   });

//   // ===============================
//   // 4️⃣ Priority Decision Logic (Health + Behavior)
//   // ===============================
//   let priority = PRIORITY_TYPES.DISCIPLINE; // default
//   let message = "Stay disciplined and follow your habit today.";

//   if (missedYesterday) {
//     priority = PRIORITY_TYPES.RECOVERY_PUSH;
//     message = "You missed yesterday. Let’s get back on track today 💪";

//   } else if (weakestHabit && weakestHabit.healthScore < 40) {
//     priority = PRIORITY_TYPES.RECOVERY_PUSH;
//     message = `Your habit "${weakestHabit.title}" is struggling. Do a small step today.`;

//   } else if (weakestHabit && weakestHabit.healthScore < 70) {
//     priority = PRIORITY_TYPES.DISCIPLINE;
//     message = `Stay consistent with "${weakestHabit.title}" today. Discipline builds strength.`;

//   } else if (weakestHabit && weakestHabit.healthScore >= 70) {
//     priority = PRIORITY_TYPES.STREAK_PROTECT;
//     message = `Great consistency on "${weakestHabit.title}". Don’t break the chain 🔥`;

//   } else if (aiNudge && aiNudge.consistency < 40) {
//     priority = PRIORITY_TYPES.AI_RISK;
//     message = aiNudge.message;
//   }

//   return {
//     priority,
//     message,
//   };
// };

// module.exports = { decideNotificationPriority };