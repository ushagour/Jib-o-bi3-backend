const express = require("express");
const router = express.Router();
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validateWith = require("../middleware/validation");
const config = require("config");
const { User } = require('../models');


const Loginschema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});

const Registerschema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});

// Register a new user
router.post('/register', validateWith(Registerschema), async (req, res) => {
  try {
      const { name, email, password } = req.body;

      // Check if the user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the user
      const user = await User.create({
          name,
          email,
          avatar: 'avatars/avatar.png',
          password: hashedPassword,
      });
    
     // Generate a JWT token//todo refactor this to use the auth context
     const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, avatar: user.avatar },
      config.get('jwtPrivateKey')
    );

    res.status(201).json({ message: 'User registered successfully', user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User login

router.post("/login", validateWith(Loginschema),async (req, res) => {


  const { email, password } = req.body;
  // Find the user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
}


  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
  }



      const AvatarMapper = file_name => {
          const baseUrl = config.get("assetsBaseUrl");
        
          return  `${baseUrl}${file_name}.jpg`;
    
        }

  const token = jwt.sign(
    { userId: user.id, name: user.name, email,avatar: AvatarMapper(user.avatar),
    },
    config.get('jwtPrivateKey')
  );
  res.send(token);
});


// Change Password
router.put('/change-password', [auth], async (req, res) => {
  console.log("change password route called")
  const { email, currentPassword, newPassword } = req.body;


  console.log("Change Password Data:", req.body); // Debug log

  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: "An error occurred while updating the password" });
  }
});




module.exports = router;
