const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // 1️⃣ Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // 2️⃣ Extract token
      token = req.headers.authorization.split(" ")[1];

      // 3️⃣ Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4️⃣ Attach user to request (without password)
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
