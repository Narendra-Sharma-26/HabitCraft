const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Protected route
router.get("/me", protect, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

module.exports = router;
