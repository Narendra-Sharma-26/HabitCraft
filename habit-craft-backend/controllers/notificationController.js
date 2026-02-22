const NotificationLog = require("../models/NotificationLog");

// @desc    Get latest notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get last 20 notifications (latest first)
    const notifications = await NotificationLog.find({ userId })
      .sort({ sentAt: -1 })
      .limit(20);

    res.json({
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await NotificationLog.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as opened (user clicked it)
// @route   PATCH /api/notifications/:id/open
// @access  Private
const markNotificationOpened = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await NotificationLog.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.opened = true;
    await notification.save();

    res.json({ message: "Notification marked as opened" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Mark habit completed after notification influence
// @route   PATCH /api/notifications/:id/completed
// @access  Private
const markCompletedAfterNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await NotificationLog.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.completedAfterNotification = true;
    await notification.save();

    res.json({
      message: "Marked as completed after notification",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



module.exports = { getNotifications, markNotificationRead, markNotificationOpened, markCompletedAfterNotification };
