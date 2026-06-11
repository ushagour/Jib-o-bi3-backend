const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
}


module.exports = function (req, res, next) {
  // Try to get token from x-auth-token header first, then from Authorization header
  let token = req.header("x-auth-token");
  
  // If not found, try Authorization: Bearer <token>
  if (!token) {
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7); // Remove "Bearer " prefix
    }
  }

  // Validate token exists and is a string
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  if (typeof token !== "string") {
    console.error("Invalid token type:", typeof token, "Token value:", token);
    return res.status(400).json({ error: "Invalid token format. Token must be a string." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    console.error("JWT verification failed:", ex.message, "Token:", token.substring(0, 20) + "...");
    
    if (ex.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired." });
    }
    
    if (ex.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid token." });
    }
    
    res.status(400).json({ error: "Token validation failed." });
  }
};

