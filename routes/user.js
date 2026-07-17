const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { User, Orders,Listing } = require("../models");
const auth = require("../middleware/auth");
const validateWith = require("../middleware/validation");
const imageResize = require("../middleware/imageResize");
const Joi = require("joi");

const isAdmin = (req) => String(req?.user?.role || "").toLowerCase() === "admin";


// Validation schema for creating/updating a user
const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  avatar: Joi.string().optional(), // Optional avatar URL
  phone: Joi.string().allow('').optional(),
  address: Joi.string().allow('').optional(),
});


// Configure multer with custom storage to preserve original filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/avatar/");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use original filename without hashing
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Helper function to get avatar URL
const getAvatarUrl = (user) => {
  const baseUrl = process.env.ASSETS_BASE_URL || "http://localhost:3000/assets/";
  
  // Keep avatar null until the user uploads one.
  if (!user.avatar) {
    return null;
  }
  
  // Return avatar file URL
  return `${baseUrl}${user.avatar}`;
};


// GET: Retrieve a user by ID
router.get("/:id", auth, async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Listing,
          attributes: ['id'],
        },
        {
          model: Orders,
          attributes: ['id', 'status'],
        }
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const memberSinceYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

    return res.json({
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatar: getAvatarUrl(user),
      phone: user.phone || "",
      address: user.address || "",
      is_phone_verified: user.is_phone_verified || !!user.phone,
      is_email_verified: user.is_email_verified || false,
      is_quick_responder: user.is_quick_responder || false,
      is_verified: user.is_verified || false,
      role: user.role || "Customer",
      status: user.status || "active",
      // Stats for profile
      listings_count: user.Listings ? user.Listings.length : 0,
      sales_count: user.Orders ? user.Orders.filter(order => order.status === 'completed').length : 0,
      member_since: memberSinceYear,
      // Additional data for compatibility
      completedOrders: user.Orders ? user.Orders.filter(order => order.status === 'completed').length : 0,
      pendingOrders: user.Orders ? user.Orders.filter(order => order.status === 'pending').length : 0,
      createdAt: user.createdAt,
    });

  } catch (error) {
    console.error("Error retrieving user:", error);
    return res.status(500).json({ error: "An error occurred while retrieving the user", details: error.message });
  }
});


// PUT: Update a user by ID
router.put("/:id", [auth, 
    upload.single("avatar"), // Single avatar upload
    imageResize, // Process and resize avatar image
    validateWith(userSchema),
  ], async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const existingUser = await User.findByPk(userId);

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate old password if provided
    if (req.body.password !== undefined && req.body.password !== '') {
      const isMatch = await existingUser.comparePassword(req.body.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Old password is incorrect" });
      }
    }

    // Update user fields
    const updatedUserData = {
      name: req.body.name || existingUser.name,
      email: req.body.email || existingUser.email,
      avatar: req.body.avatar || existingUser.avatar,
      phone: req.body.phone !== undefined ? req.body.phone : existingUser.phone,
      address: req.body.address !== undefined ? req.body.address : existingUser.address,
    };

    // If file uploaded, use the processed filename from imageResize middleware
    if (req.images && req.images.length > 0) {
      updatedUserData.avatar = req.images[0] + "_full.jpg";
    }

    // Update the user in the database
    await existingUser.update(updatedUserData);
    await existingUser.save();

    // Reload user with associations to get stats
    const updatedUser = await User.findByPk(existingUser.id, {
      include: [
        {
          model: Listing,
          attributes: ['id'],
        },
        {
          model: Orders,
          attributes: ['id', 'status'],
        }
      ],
    });

    const memberSinceYear = updatedUser.createdAt ? new Date(updatedUser.createdAt).getFullYear() : new Date().getFullYear();

    // Send the updated user data in the response with stats
    return res.status(200).json({
      id: updatedUser.id,
      name: updatedUser.name || "",
      email: updatedUser.email,
      avatar: getAvatarUrl(updatedUser),
      phone: updatedUser.phone || "",
      address: updatedUser.address || "",
      is_phone_verified: updatedUser.is_phone_verified || !!updatedUser.phone,
      is_email_verified: updatedUser.is_email_verified || false,
      is_quick_responder: updatedUser.is_quick_responder || false,
      is_verified: updatedUser.is_verified || false,
      role: updatedUser.role || "Customer",
      status: updatedUser.status || "active",
      listings_count: updatedUser.Listings ? updatedUser.Listings.length : 0,
      sales_count: updatedUser.Orders ? updatedUser.Orders.filter(order => order.status === 'completed').length : 0,
      member_since: memberSinceYear,
      completedOrders: updatedUser.Orders ? updatedUser.Orders.filter(order => order.status === 'completed').length : 0,
      pendingOrders: updatedUser.Orders ? updatedUser.Orders.filter(order => order.status === 'pending').length : 0,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    return res.status(500).json({ error: "Failed to update user profile", details: error.message });
  }
});
// DELETE: Delete a user by ID (requires email verification and reason)
// DELETE: Delete a user by ID (requires email verification and reason)
router.delete("/:id", auth, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { email, reason } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify email matches the user's email
    if (!email || email !== user.email) {
      return res.status(403).json({ 
        error: "Email verification failed. Please provide the correct email associated with your account." 
      });
    }

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({ 
        error: "Please provide a reason for account deletion (minimum 10 characters)." 
      });
    }

    // Log the deletion reason for admin review
    console.log(`Account deletion requested by user ${userId} (${user.email}). Reason: ${reason}`);

    await user.destroy();

    return res.json({ message: "Your account has been deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "An error occurred while deleting the user", details: error.message });
  }
});

// PATCH: Update user role (admin only)
router.patch("/:id/role", auth, async (req, res) => {
  try {
    // Only admins can update roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['admin', 'Customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "Customer".' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ role });

    return res.status(200).json({
      message: `User role updated to ${role}`,
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatar: getAvatarUrl(user),
      phone: user.phone || "",
      address: user.address || "",
      is_phone_verified: user.is_phone_verified || !!user.phone,
      is_email_verified: user.is_email_verified || false,
      is_quick_responder: user.is_quick_responder || false,
      is_verified: user.is_verified || false,
      role: user.role || "Customer",
      status: user.status || "active",
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Failed to update user role', details: error.message });
  }
});

// DELETE: Remove user avatar
router.delete("/:id/avatar", auth, async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const existingUser = await User.findByPk(userId);

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has permission to delete this avatar
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: "You can only delete your own avatar" });
    }

    // Remove avatar file from filesystem if it exists
    if (existingUser.avatar) {
      const avatarPath = path.join(__dirname, '../uploads/avatar/', existingUser.avatar);
      
      // Check if file exists and delete it
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
        console.log(`Avatar file deleted: ${avatarPath}`);
      }
    }

    // Update user record to remove avatar
    await existingUser.update({ avatar: null });

    return res.status(200).json({
      message: "Avatar deleted successfully",
      id: existingUser.id,
      name: existingUser.name || "",
      email: existingUser.email,
      avatar: null,
      phone: existingUser.phone || "",
      address: existingUser.address || "",
      is_phone_verified: existingUser.is_phone_verified || !!existingUser.phone,
      is_email_verified: existingUser.is_email_verified || false,
      is_quick_responder: existingUser.is_quick_responder || false,
      is_verified: existingUser.is_verified || false,
      role: existingUser.role || "Customer",
      status: existingUser.status || "active",
    });

  } catch (error) {
    console.error("Error deleting avatar:", error);
    return res.status(500).json({ error: "Failed to delete avatar", details: error.message });
  }
});

// PATCH: Verify/Unverify user account (admin only)
router.patch("/:id/verify", auth, async (req, res) => {
  try {
    // Only admins can verify accounts
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const userId = parseInt(req.params.id);
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request. "verified" must be true or false.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update verification status
    await user.update({ is_verified: verified });

    console.log(`User ${userId} (${user.email}) verification status updated to: ${verified}`);

    return res.status(200).json({
      message: `Account ${verified ? 'verified' : 'unverified'} successfully`,
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatar: getAvatarUrl(user),
      phone: user.phone || "",
      address: user.address || "",
      is_phone_verified: user.is_phone_verified || !!user.phone,
      is_email_verified: user.is_email_verified || false,
      is_quick_responder: user.is_quick_responder || false,
      is_verified: user.is_verified || false,
      role: user.role || "Customer",
      status: user.status || "active",
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    return res.status(500).json({ error: 'Failed to update verification status', details: error.message });
  }
});

// PATCH: Suspend/unsuspend user account (admin only)
router.patch("/:id/suspend", auth, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const userId = parseInt(req.params.id);
    const { suspended } = req.body;

    if (typeof suspended !== "boolean") {
      return res.status(400).json({ error: 'Invalid request. "suspended" must be true or false.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (String(user.role || "").toLowerCase() === "admin" && suspended) {
      return res.status(400).json({ error: "Admin accounts cannot be suspended." });
    }

    const nextStatus = suspended ? "inactive" : "active";
    await user.update({ status: nextStatus });

    return res.status(200).json({
      message: suspended ? "User suspended successfully" : "User reactivated successfully",
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatar: getAvatarUrl(user),
      phone: user.phone || "",
      address: user.address || "",
      is_phone_verified: user.is_phone_verified || !!user.phone,
      is_email_verified: user.is_email_verified || false,
      is_quick_responder: user.is_quick_responder || false,
      is_verified: user.is_verified || false,
      role: user.role || "Customer",
      status: user.status || "active",
    });
  } catch (error) {
    console.error("Error updating user suspension status:", error);
    return res.status(500).json({ error: "Failed to update user suspension status", details: error.message });
  }
});

module.exports = router;
