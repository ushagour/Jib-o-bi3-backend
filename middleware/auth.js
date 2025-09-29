const config = require("config");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || config.get("jwtPrivateKey");
if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
}


module.exports = function (req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("MDLW:Access denied. No token provided.");

  try {
     const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    // console.log("JWT verification failed:", ex); // Debug log
    res.status(400).send("MDLW:Invalid token.");
  }
};
