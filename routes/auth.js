const express = require("express");
const router = express.Router();
const Joi = require("joi");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validateWith = require("../middleware/validation");
const { User } = require('../models');
const auth = require("../middleware/auth");
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
}

// Avatar URL mapper helper
const getAvatarUrl = (file_name) => {
  const baseUrl = process.env.ASSETS_BASE_URL || "http://localhost:3000/assets/";
  return file_name ? `${baseUrl}${file_name}` : null;
};

// Helper to format user context response
const formatUserContext = (user) => {
  return {
    userId: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: getAvatarUrl(user.avatar),
    role: user.role,
    is_verified: user.is_verified || false,
    is_email_verified: user.is_email_verified || false,
    is_phone_verified: !!user.phone,
    phone: user.phone || "",
    status: user.status || "active",
    createdAt: user.createdAt,
  };
};

const Loginschema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});

const Registerschema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});

const RequestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

const ResetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  token: Joi.string().required().min(6),
  newPassword: Joi.string().required().min(5),
});

const RequestEmailVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});

const VerifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().required().min(6),
});

const createVerificationToken = () => crypto.randomBytes(3).toString('hex').toUpperCase();

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
          avatar: null,
          password: hashedPassword,
          is_email_verified: false,
      });

      const rawCode = createVerificationToken();
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      user.emailVerificationCode = codeHash;
      user.emailVerificationExpires = expiresAt;
      await user.save();
      
      const userContext = formatUserContext(user);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Verify your email to continue.',
        requiresEmailVerification: true,
        verificationCode: rawCode,
        expiresAt,
        user: userContext,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User login
router.post("/login", validateWith(Loginschema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find the user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Block login for users that are not active (e.g. suspended/banned)
    if (String(user.status || "active").toLowerCase() !== "active") {
      return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        error: 'Email is not verified. Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const userContext = formatUserContext(user);

    // Generate a JWT token with complete user context
    const token = jwt.sign(userContext, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      token,
      user: userContext,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request an email verification code
router.post('/request-email-verification', validateWith(RequestEmailVerificationSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified.',
      });
    }

    const rawCode = createVerificationToken();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.emailVerificationCode = codeHash;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Verification code generated successfully.',
      verificationCode: rawCode,
      expiresAt,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Verify email with code
router.post('/verify-email', validateWith(VerifyEmailSchema), async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified.',
      });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ error: 'No email verification request found' });
    }

    if (new Date(user.emailVerificationExpires).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const codeHash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
    if (codeHash !== user.emailVerificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.is_email_verified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


// Change Password
router.put('/change-password',[auth], async (req, res) => {
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

// Request a password reset token
router.post('/request-password-reset', validateWith(RequestPasswordResetSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rawToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully.',
      resetToken: rawToken,
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password using the generated token
router.post('/reset-password', validateWith(ResetPasswordSchema), async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.resetPasswordToken || !user.resetPasswordExpires) {
      return res.status(400).json({ error: 'No password reset request found' });
    }

    if (new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim().toUpperCase()).digest('hex');
    if (tokenHash !== user.resetPasswordToken) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch current authenticated user context
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userContext = formatUserContext(user);

    res.status(200).json({
      success: true,
      user: userContext,
    });
  } catch (error) {
    console.error("Error fetching user context:", error);
    res.status(500).json({ error: "Failed to fetch user context" });
  }
});

module.exports = router;
