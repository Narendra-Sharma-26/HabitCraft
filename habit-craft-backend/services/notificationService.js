const Habit = require("../models/Habit");
const NotificationLog = require("../models/NotificationLog");
const HabitLog = require("../models/HabitLog");
const { decideNotificationPriority } = require("../utils/notificationPriority");
const { getTodayIST, getPastISTDate } = require("../utils/dateHelper");

const checkAndLogNotifications = async () => {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Get active habits
        const habits = await Habit.find({
            isActive: true,
            $or: [{ isArchived: false }, { isArchived: { $exists: false } }]
        });

        for (let habit of habits) {
            try {
                const todayStr = getTodayIST();

                // =================================================
                // 1️⃣ AI PRIORITY ENGINE (ONLY ONCE PER LOOP)
                // =================================================
                const { priority, message } = await decideNotificationPriority(habit.userId);

                // 🔐 Idempotency guard for priority notification
                const existingPriority = await NotificationLog.findOne({
                    userId: habit.userId,
                    habitId: habit._id,
                    type: priority,
                    sentAt: { $gte: new Date(todayStr) },
                });

                if (!existingPriority) {
                    await NotificationLog.create({
                        userId: habit.userId,
                        habitId: habit._id,
                        type: priority,
                        message,
                    });

                    console.log(`🧠 Priority Notification [${priority}] → ${habit.title}`);
                }


                // =================================================
                // 🛠 CLEAN MISSED HABIT RECOVERY ENGINE (IST SAFE)
                // =================================================
                const yesterdayStr = getPastISTDate(1);
                const dayBeforeYesterdayStr = getPastISTDate(2);

                const yesterdayCompletion = await HabitLog.findOne({
                    habitId: habit._id,
                    completed: true,
                    date: yesterdayStr,
                });

                const dayBeforeCompletion = await HabitLog.findOne({
                    habitId: habit._id,
                    completed: true,
                    date: dayBeforeYesterdayStr,
                });

                if (!yesterdayCompletion) {
                    const recoveryType = !dayBeforeCompletion
                        ? "missed_recovery_push"
                        : "missed_recovery_soft";

                    // 🔐 Idempotency guard for recovery notification
                    const existingRecovery = await NotificationLog.findOne({
                        habitId: habit._id,
                        type: recoveryType,
                        sentAt: { $gte: new Date(todayStr) },
                    });

                    if (!existingRecovery) {
                        await NotificationLog.create({
                            userId: habit.userId,
                            habitId: habit._id,
                            type: recoveryType,
                        });

                        console.log(`⚠ Recovery (${recoveryType}) → ${habit.title}`);
                    }
                }


                // =================================================
                // 2️⃣ CONSISTENCY REINFORCEMENT (IST SAFE)
                // =================================================
                const sevenDaysAgoStr = getPastISTDate(7);

                const logs = await HabitLog.find({
                    habitId: habit._id,
                    completed: true,
                    date: { $gte: sevenDaysAgoStr, $lte: todayStr }
                });

                const completedDays = logs.length;
                const consistencyPercent = (completedDays / 7) * 100;

                if (consistencyPercent >= 70) {
                    // 🔐 Idempotency guard for reinforcement
                    const existingReinforcement = await NotificationLog.findOne({
                        habitId: habit._id,
                        type: "consistency_reinforcement",
                        sentAt: { $gte: new Date(todayStr) },
                    });

                    if (!existingReinforcement) {
                        await NotificationLog.create({
                            userId: habit.userId,
                            habitId: habit._id,
                            type: "consistency_reinforcement",
                        });

                        console.log(
                            `🔥 Consistency reinforcement → ${habit.title} (${consistencyPercent.toFixed(0)}%)`
                        );
                    }
                }


                // =================================================
                // 3️⃣ TIME-BASED REMINDERS
                // =================================================
                if (habit.scheduledTime) {
                    const [hour, minute] = habit.scheduledTime.split(":").map(Number);

                    // ⏰ Pre-commitment reminder (10 min before)
                    const preCommitmentTime = new Date(now);
                    preCommitmentTime.setHours(hour);
                    preCommitmentTime.setMinutes(minute - 10);

                    if (
                        currentHour === preCommitmentTime.getHours() &&
                        currentMinute === preCommitmentTime.getMinutes()
                    ) {
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