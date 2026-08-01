const Habit = require("../models/Habit");
const NotificationLog = require("../models/NotificationLog");
// HabitLog is no longer needed here since the Priority Engine handles the queries
const { decideNotificationPriority } = require("../utils/notificationPriority");
const { getTodayIST } = require("../utils/dateHelper"); // getPastISTDate removed as it's handled by engine

const checkAndLogNotifications = async () => {
    try {
        // =================================================
        // 🕰 TIMEZONE FIX: Get exact Hour/Minute in IST
        // =================================================
        const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const istDateObj = new Date(nowStr);
        const currentHour = istDateObj.getHours();
        const currentMinute = istDateObj.getMinutes();

        // Get active habits
        const habits = await Habit.find({
            isActive: true,
            $or: [{ isArchived: false }, { isArchived: { $exists: false } }]
        });

        // Track users so we don't spam them with multiple daily nudges if they have multiple habits
        const processedUsers = new Set();
        const todayStr = getTodayIST();
        
        // ⭐ THE FIX: Use "+05:30" to create a strict Midnight IST Date object
        const startOfToday = new Date(`${todayStr}T00:00:00+05:30`);

        for (let habit of habits) {
            try {
                const userIdStr = habit.userId.toString();

                // =================================================
                // 1️⃣ THE BRAIN: AI PRIORITY ENGINE (ONCE PER USER)
                // =================================================
                if (!processedUsers.has(userIdStr)) {
                    processedUsers.add(userIdStr); // Mark user as processed for this loop

                    const { priority, message } = await decideNotificationPriority(habit.userId);

                    // 🔐 Idempotency guard: Ensure this user hasn't received their daily nudge today
                    const existingPriority = await NotificationLog.findOne({
                        userId: habit.userId,
                        type: priority,
                        sentAt: { $gte: startOfToday },
                    });

                    if (!existingPriority) {
                        await NotificationLog.create({
                            userId: habit.userId,
                            habitId: habit._id, // Attach to current habit as reference
                            type: priority,
                            message,
                        });

                        console.log(`🧠 Priority Notification [${priority}] → User: ${habit.userId} | Msg: ${message}`);
                    }
                }

                // =================================================
                // 2️⃣ TIME-BASED REMINDERS (HABIT SPECIFIC)
                // =================================================
                if (habit.scheduledTime) {
                    const [hour, minute] = habit.scheduledTime.split(":").map(Number);

                    // ⏰ Pre-commitment reminder (10 min before)
                    // Calculate exactly 10 mins prior using math, skipping UTC Date objects completely
                    let preHour = hour;
                    let preMinute = minute - 10;
                    
                    if (preMinute < 0) {
                        preMinute += 60;
                        preHour = preHour - 1 < 0 ? 23 : preHour - 1;
                    }

                    if (currentHour === preHour && currentMinute === preMinute) {
                        const minuteAgo = new Date(Date.now() - 60 * 1000);

                        const alreadyLogged = await NotificationLog.findOne({
                            habitId: habit._id,
                            type: "pre_commitment",
                            sentAt: { $gte: minuteAgo },
                        });

                        if (!alreadyLogged) {
                            await NotificationLog.create({
                                userId: habit.userId,
                                habitId: habit._id,
                                type: "pre_commitment",
                            });

                            console.log(`⏳ Pre-commitment → ${habit.title}`);
                        }
                    }

                    // ⏰ Exact time reminder (discipline)
                    if (currentHour === hour && currentMinute === minute) {
                        const minuteAgo = new Date(Date.now() - 60 * 1000);

                        const alreadyLogged = await NotificationLog.findOne({
                            habitId: habit._id,
                            type: "discipline_reminder",
                            sentAt: { $gte: minuteAgo },
                        });

                        if (!alreadyLogged) {
                            await NotificationLog.create({
                                userId: habit.userId,
                                habitId: habit._id,
                                type: "discipline_reminder",
                            });

                            console.log(`🔔 Discipline reminder → ${habit.title}`);
                        }
                    }
                }

            } catch (err) {
                console.error(`❌ Habit notification failed: ${habit.title}`, err.message);
            }
        }

    } catch (error) {
        console.error("Notification check error:", error.message);
    }
};

module.exports = { checkAndLogNotifications };







// ============================================

// const Habit = require("../models/Habit");
// const NotificationLog = require("../models/NotificationLog");
// const HabitLog = require("../models/HabitLog");
// const { decideNotificationPriority } = require("../utils/notificationPriority");
// const { getTodayIST, getPastISTDate } = require("../utils/dateHelper");

// const checkAndLogNotifications = async () => {
//     try {
//         const now = new Date();
//         const currentHour = now.getHours();
//         const currentMinute = now.getMinutes();

//         // Get active habits
//         const habits = await Habit.find({
//             isActive: true,
//             $or: [{ isArchived: false }, { isArchived: { $exists: false } }]
//         });

//         for (let habit of habits) {
//             try {
//                 const todayStr = getTodayIST();

//                 // =================================================
//                 // 1️⃣ AI PRIORITY ENGINE (ONLY ONCE PER LOOP)
//                 // =================================================
//                 const { priority, message } = await decideNotificationPriority(habit.userId);

//                 // 🔐 Idempotency guard for priority notification
//                 const existingPriority = await NotificationLog.findOne({
//                     userId: habit.userId,
//                     habitId: habit._id,
//                     type: priority,
//                     sentAt: { $gte: new Date(todayStr) },
//                 });

//                 if (!existingPriority) {
//                     await NotificationLog.create({
//                         userId: habit.userId,
//                         habitId: habit._id,
//                         type: priority,
//                         message,
//                     });

//                     console.log(`🧠 Priority Notification [${priority}] → ${habit.title}`);
//                 }


//                 // =================================================
//                 // 🛠 CLEAN MISSED HABIT RECOVERY ENGINE (IST SAFE)
//                 // =================================================
//                 const yesterdayStr = getPastISTDate(1);
//                 const dayBeforeYesterdayStr = getPastISTDate(2);

//                 const yesterdayCompletion = await HabitLog.findOne({
//                     habitId: habit._id,
//                     completed: true,
//                     date: yesterdayStr,
//                 });

//                 const dayBeforeCompletion = await HabitLog.findOne({
//                     habitId: habit._id,
//                     completed: true,
//                     date: dayBeforeYesterdayStr,
//                 });

//                 if (!yesterdayCompletion) {
//                     const recoveryType = !dayBeforeCompletion
//                         ? "missed_recovery_push"
//                         : "missed_recovery_soft";

//                     // 🔐 Idempotency guard for recovery notification
//                     const existingRecovery = await NotificationLog.findOne({
//                         habitId: habit._id,
//                         type: recoveryType,
//                         sentAt: { $gte: new Date(todayStr) },
//                     });

//                     if (!existingRecovery) {
//                         await NotificationLog.create({
//                             userId: habit.userId,
//                             habitId: habit._id,
//                             type: recoveryType,
//                         });

//                         console.log(`⚠ Recovery (${recoveryType}) → ${habit.title}`);
//                     }
//                 }


//                 // =================================================
//                 // 2️⃣ CONSISTENCY REINFORCEMENT (IST SAFE)
//                 // =================================================
//                 const sevenDaysAgoStr = getPastISTDate(7);

//                 const logs = await HabitLog.find({
//                     habitId: habit._id,
//                     completed: true,
//                     date: { $gte: sevenDaysAgoStr, $lte: todayStr }
//                 });

//                 const completedDays = logs.length;
//                 const consistencyPercent = (completedDays / 7) * 100;

//                 if (consistencyPercent >= 70) {
//                     // 🔐 Idempotency guard for reinforcement
//                     const existingReinforcement = await NotificationLog.findOne({
//                         habitId: habit._id,
//                         type: "consistency_reinforcement",
//                         sentAt: { $gte: new Date(todayStr) },
//                     });

//                     if (!existingReinforcement) {
//                         await NotificationLog.create({
//                             userId: habit.userId,
//                             habitId: habit._id,
//                             type: "consistency_reinforcement",
//                         });

//                         console.log(
//                             `🔥 Consistency reinforcement → ${habit.title} (${consistencyPercent.toFixed(0)}%)`
//                         );
//                     }
//                 }


//                 // =================================================
//                 // 3️⃣ TIME-BASED REMINDERS
//                 // =================================================
//                 if (habit.scheduledTime) {
//                     const [hour, minute] = habit.scheduledTime.split(":").map(Number);

//                     // ⏰ Pre-commitment reminder (10 min before)
//                     const preCommitmentTime = new Date(now);
//                     preCommitmentTime.setHours(hour);
//                     preCommitmentTime.setMinutes(minute - 10);

//                     if (
//                         currentHour === preCommitmentTime.getHours() &&
//                         currentMinute === preCommitmentTime.getMinutes()
//                     ) {
//                         const minuteAgo = new Date(Date.now() - 60 * 1000);

//                         const alreadyLogged = await NotificationLog.findOne({
//                             habitId: habit._id,
//                             type: "pre_commitment",
//                             sentAt: { $gte: minuteAgo },
//                         });

//                         if (!alreadyLogged) {
//                             await NotificationLog.create({
//                                 userId: habit.userId,
//                                 habitId: habit._id,
//                                 type: "pre_commitment",
//                             });

//                             console.log(`⏳ Pre-commitment → ${habit.title}`);
//                         }
//                     }

//                     // ⏰ Exact time reminder (discipline)
//                     if (currentHour === hour && currentMinute === minute) {
//                         const minuteAgo = new Date(Date.now() - 60 * 1000);

//                         const alreadyLogged = await NotificationLog.findOne({
//                             habitId: habit._id,
//                             type: "discipline_reminder",
//                             sentAt: { $gte: minuteAgo },
//                         });

//                         if (!alreadyLogged) {
//                             await NotificationLog.create({
//                                 userId: habit.userId,
//                                 habitId: habit._id,
//                                 type: "discipline_reminder",
//                             });

//                             console.log(`🔔 Discipline reminder → ${habit.title}`);
//                         }
//                     }
//                 }

//             } catch (err) {
//                 console.error(`❌ Habit notification failed: ${habit.title}`, err.message);
//             }
//         }

//     } catch (error) {
//         console.error("Notification check error:", error.message);
//     }
// };

// module.exports = { checkAndLogNotifications };