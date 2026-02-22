const Habit = require("../models/Habit");
const NotificationLog = require("../models/NotificationLog");
const HabitLog = require("../models/HabitLog");
const { decideNotificationPriority } = require("../utils/notificationPriority");



const checkAndLogNotifications = async () => {
    try {
        const now = new Date();

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        //console.log(`Current Time: ${currentHour}:${currentMinute}`);

        // Get active, non-archived habits
        const habits = await Habit.find({
            isActive: true,
            $or: [
                { isArchived: false },
                { isArchived: { $exists: false } }
            ]
        });

        for (let habit of habits) {

            // 🔔 Decide highest priority notification for this user
            const priorityDecision = await decideNotificationPriority(habit.userId);

            // Only send ONE highest priority notification
            if (priorityDecision) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);

                const alreadySent = await NotificationLog.findOne({
                    userId: habit.userId,
                    type: priorityDecision.priority,
                    sentAt: { $gte: startOfToday },
                });

                if (!alreadySent) {
                    await NotificationLog.create({
                        userId: habit.userId,
                        habitId: habit._id,
                        type: priorityDecision.priority,
                        message: priorityDecision.message,
                    });

                    console.log(
                        `Priority notification (${priorityDecision.priority}) logged for habit: ${habit.title}`
                    );
                }
            }



            // 🔍 DEBUG LINE (ADD HERE)
            //console.log("Checking habit:", habit.title, habit._id, "isActive:", habit.isActive);

            // -----------------------------
            // MISSED HABIT RECOVERY CHECK
            // -----------------------------
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const dayBeforeYesterday = new Date(today);
            dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

            const yesterdayLog = await NotificationLog.findOne({
                habitId: habit._id,
                type: { $in: ["discipline_reminder", "pre_commitment"] },
                sentAt: { $gte: yesterday, $lt: today },
            });

            const dayBeforeYesterdayLog = await NotificationLog.findOne({
                habitId: habit._id,
                type: { $in: ["discipline_reminder", "pre_commitment"] },
                sentAt: { $gte: dayBeforeYesterday, $lt: yesterday },
            });

            if (!yesterdayLog) {
                // Start of today
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);

                const alreadyLoggedRecovery = await NotificationLog.findOne({
                    habitId: habit._id,
                    type: { $in: ["missed_recovery_soft", "missed_recovery_push"] },
                    sentAt: { $gte: startOfToday },
                });


                if (!alreadyLoggedRecovery) {
                    const recoveryType = !dayBeforeYesterdayLog
                        ? "missed_recovery_push"
                        : "missed_recovery_soft";

                    await NotificationLog.create({
                        userId: habit.userId,
                        habitId: habit._id,
                        type: recoveryType,
                    });

                    console.log(
                        `Recovery notification (${recoveryType}) logged for habit: ${habit.title}`
                    );
                }
            }

            /*
            // -----------------------------
            // CONSISTENCY REINFORCEMENT CHECK (string-date based)
            // -----------------------------
            // Get today string (YYYY-MM-DD)
            const todayStr = new Date().toISOString().split("T")[0];

            // Get 7 days ago string
            const sevenDaysAgoDate = new Date();
            sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split("T")[0];

            // Convert to Date range also (for old ISO logs)
            const startDateObj = new Date(sevenDaysAgoStr);
            const endDateObj = new Date(todayStr + "T23:59:59.999Z");

            // Fetch logs supporting BOTH string & Date formats
            const logs = await HabitLog.find({
                habitId: habit._id,
                completed: true,
                $or: [
                    { date: { $gte: sevenDaysAgoStr, $lte: todayStr } }, // string logs
                    { date: { $gte: startDateObj, $lte: endDateObj } }   // Date logs
                ]
            });

            // Debug
            //console.log("HabitId used:", habit._id);
            //console.log("SevenDaysAgoStr:", sevenDaysAgoStr);
            //console.log("TodayStr:", todayStr);
            //console.log("Logs found:", logs.length);
            //logs.forEach(l => console.log("Log date:", l.date));
            


            const completedDays = logs.length;
            const consistencyPercent = (completedDays / 7) * 100;

            //console.log("Consistency %:", consistencyPercent);
            //console.log("======================================")


            if (consistencyPercent >= 70) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);

                const alreadyReinforced = await NotificationLog.findOne({
                    habitId: habit._id,
                    type: "consistency_reinforcement",
                    sentAt: { $gte: startOfToday },
                });

                //console.log("Already reinforced today:", !!alreadyReinforced);
                //console.log("======================================")

                if (!alreadyReinforced) {
                    await NotificationLog.create({
                        userId: habit.userId,
                        habitId: habit._id,
                        type: "consistency_reinforcement",
                    });


                    console.log(
                        `Consistency reinforcement logged for habit: ${habit.title} (${consistencyPercent.toFixed(0)}% consistency)`
                    );
                }
            }
            */

            // -----------------------------
            // CONSISTENCY REINFORCEMENT CHECK (stable version)
            // -----------------------------
            const todayDate = new Date();
            const todayStr = todayDate.toISOString().split("T")[0];

            const sevenDaysAgo = new Date(todayDate);
            sevenDaysAgo.setDate(todayDate.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

            // Fetch completed logs in last 7 days (string-based)
            const logs = await HabitLog.find({
                habitId: habit._id,
                completed: true,
                date: { $gte: sevenDaysAgoStr, $lte: todayStr }
            });

            const completedDays = logs.length;
            const consistencyPercent = (completedDays / 7) * 100;

            if (consistencyPercent >= 70) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);

                const alreadyReinforced = await NotificationLog.findOne({
                    habitId: habit._id,
                    type: "consistency_reinforcement",
                    sentAt: { $gte: startOfToday },
                });

                if (!alreadyReinforced) {
                    await NotificationLog.create({
                        userId: habit.userId,
                        habitId: habit._id,
                        type: "consistency_reinforcement",
                    });

                    console.log(
                        `Consistency reinforcement logged for habit: ${habit.title} (${consistencyPercent.toFixed(0)}% consistency)`
                    );
                }
            }

            // -----------------------------
            // 🔥 AI PRIORITY NUDGE ENGINE
            // -----------------------------
            const { priority, message } = await decideNotificationPriority(habit.userId);

            // Prevent duplicate same-day priority nudges
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const alreadyPrioritySent = await NotificationLog.findOne({
                userId: habit.userId,   // 🔥 key change
                type: priority,
                sentAt: { $gte: startOfToday },
            });

            if (!alreadyPrioritySent) {
                await NotificationLog.create({
                    userId: habit.userId,
                    habitId: habit._id,
                    type: priority, // dynamic type from engine
                    message,        // dynamic AI message
                });

                console.log(`AI Priority Notification [${priority}] → ${habit.title}`);
            }




            // -----------------------------
            // TIME-BASED REMINDERS (only if scheduledTime exists)
            // -----------------------------
            if (habit.scheduledTime) {
                const [hour, minute] = habit.scheduledTime.split(":").map(Number);

                // PRE-COMMITMENT REMINDER (10 min before)
                const preCommitmentTime = new Date(now);
                preCommitmentTime.setHours(hour);
                preCommitmentTime.setMinutes(minute - 10);

                const preHour = preCommitmentTime.getHours();
                const preMinute = preCommitmentTime.getMinutes();

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

                        console.log(
                            `Pre-commitment notification logged for habit: ${habit.title}`
                        );
                    }
                }

                // 🧠 SMART PRIORITY NOTIFICATION (exact time)
                if (currentHour === hour && currentMinute === minute) {
                    const minuteAgo = new Date(Date.now() - 60 * 1000);

                    // Decide priority using AI + history
                    const { priority, message } = await decideNotificationPriority(habit.userId);

                    const alreadyLogged = await NotificationLog.findOne({
                        habitId: habit._id,
                        type: priority,
                        sentAt: { $gte: minuteAgo },
                    });

                    if (!alreadyLogged) {
                        await NotificationLog.create({
                            userId: habit.userId,
                            habitId: habit._id,
                            type: priority,
                        });

                        console.log(
                            `🔔 Priority notification (${priority}) logged for habit: ${habit.title}`
                        );
                        console.log(`🧠 Message: ${message}`);
                    }
                }

            }

        }
    } catch (error) {
        console.error("Notification check error:", error.message);
    }
};

module.exports = { checkAndLogNotifications };
