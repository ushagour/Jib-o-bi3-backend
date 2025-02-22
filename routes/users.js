const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");//for password
const jwt = require("jsonwebtoken");//jdt for token
const auth = require("../middleware/auth");
//profile route
router.get("/:id", auth, (req, res) => {
  const userId = parseInt(req.params.id);


});

module.exports = router;
