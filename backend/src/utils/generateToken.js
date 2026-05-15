const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || "your_secret_key_here",
    { expiresIn: "30d" }
  );
};

module.exports = generateToken;