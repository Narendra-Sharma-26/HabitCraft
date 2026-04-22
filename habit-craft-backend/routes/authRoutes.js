const express = require("express");
const router = express.Router();
const { registerUser, loginUser, googleLogin } = require("../controllers/authController");

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login
router.post("/login", loginUser);

// POST /api/auth/google
router.post("/google", googleLogin);

module.exports = router;