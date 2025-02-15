const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");//for password
const jwt = require("jsonwebtoken");//jdt for token
const auth = require("../middleware/auth");
const db = require('../database/database');
//profile route
router.get("/:id", auth, (req, res) => {
  const userId = parseInt(req.params.id);

  const userQuery = "SELECT * FROM users WHERE id = ?";
  const listingsQuery = "SELECT * FROM listings WHERE user_id = ?";

  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).send();
    }

    db.all(listingsQuery, [userId], (err, listings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.send({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        listings: listings
      });
    });
  });
});

module.exports = router;
