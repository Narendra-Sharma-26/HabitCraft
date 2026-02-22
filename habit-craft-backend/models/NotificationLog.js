const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        habitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Habit",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "discipline_reminder",
                "pre_commitment",
                "missed_recovery_soft",
                "missed_recovery_push",
                "consistency_reinforcement",
            ],

            required: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        opened: {
            type: Boolean,
            default: false,
        },
        completedAfterNotification: {
            type: Boolean,
            default: false,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
