const express = require("express");
const cors = require('cors');
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const habitRoutes = require("./routes/habitRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cron = require("node-cron");
const { checkAndLogNotifications } = require("./services/notificationServiceOLD");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiRoutes = require("./routes/aiRoutes");
const habitHealthRoutes = require("./routes/habitHealthRoutes");


const app = express();

// ✅ CONNECT TO DATABASE
//connectDB();

// Middleware
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/habits/health", habitHealthRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);




// Test route
app.get("/", (req, res) => {
  res.send("Habit Craft API is running 🚀");
});

// CONNECT DB THEN START SERVER + CRON
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  //console.log("DB Connected. Starting notification cron...");

  cron.schedule("* * * * *", () => {
    //console.log("Running notification check...");
    checkAndLogNotifications();
  });

  app.listen(PORT, () => {
    //console.log(`Server running on port ${PORT}`);
  });
});

