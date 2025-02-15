const express = require("express");
const router = express.Router();
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validateWith = require("../middleware/validation");
const db = require('../database/database');
const config = require("config");


const Loginschema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});

const Registerschema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});



// login route
router.post("/login", validateWith(Loginschema), (req, res) => {
  const { email, password } = req.body;

  const userQuery = "SELECT * FROM users WHERE email = ?";
  db.get(userQuery, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(400).send({ error: "Invalid email or password." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).send({ error: "Invalid email or password." });
    }


    const baseUrl = config.get("assetsBaseUrl");
    user.avatar = user.avatar ? `${baseUrl}avatars/${user.avatar}` : null;




    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, avatar: user.avatar },
      "jwtPrivateKey"
    );
    res.send(token);
  });
});


// register route
router.post("/register", validateWith(Registerschema), async (req, res) => {
  const { name, email, password } = req.body;

  const checkUserQuery = "SELECT * FROM users WHERE email = ?";
  db.get(checkUserQuery, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      return res.status(400).send({ error: "A user with the given email already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const addUserQuery = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.run(addUserQuery, [name, email, hashedPassword], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const newUser = { id: this.lastID, name, email, password: hashedPassword };


      // Generate a token for the new user
      const token = jwt.sign(
        { userId: newUser.id, name: newUser.name, email: newUser.email },
        "jwtPrivateKey"
      );

      
      res.status(201).json({ message: "User created", user: newUser, token });
    });
  });
});






module.exports = router;
