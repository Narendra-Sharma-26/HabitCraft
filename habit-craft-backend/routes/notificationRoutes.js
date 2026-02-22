const express = require("express");
const router = express.Router();
const { getNotifications, markNotificationRead, markNotificationOpened, markCompletedAfterNotification } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

// GET latest notifications
router.get("/", protect, getNotifications);

// PATCH mark as read
router.patch("/:id/read", protect, markNotificationRead);

router.patch("/:id/open", protect, markNotificationOpened);

router.patch("/:id/completed", protect, markCompletedAfterNotification);

module.exports = router;
