const express = require("express");
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  googleLogin,
  changePassword,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

// Import your auth middleware to protect the change-password route
// Note: Adjust the path "../middleware/authMiddleware" if your folder structure is slightly different!
const { protect } = require("../middleware/authMiddleware");

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login
router.post("/login", loginUser);

// POST /api/auth/google
router.post("/google", googleLogin);

// ⭐ NEW SECURITY ROUTES ⭐

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// POST /api/auth/change-password (Protected route)
router.post("/change-password", protect, changePassword);

module.exports = router;