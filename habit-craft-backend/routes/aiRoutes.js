const express = require("express");
const router = express.Router();
const { getAINudge } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

router.get("/nudge", protect, getAINudge);

module.exports = router;
