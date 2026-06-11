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
          attributes: ['id'], // Include only the file_name attribute
        },{
          model: Orders,
          attributes: ['id', 'status'], // Include order ID and status
        }
      ],
    }

  );

    if (!user) return res.status(404).send({ error: "User not found" });

    res.send({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: getAvatarUrl(user),
      is_phone_verified: !!user.phone,
      is_email_verified: user.is_email_verified || false,
      is_quick_responder: user.is_quick_responder || false, // Assuming quick verification is the same as email verification for now
      phone: user.phone || "",
      role: user.role,
      status: user.status,
      completedOrders: user.Orders.filter(order => order.status === 'completed').length,
      pendingOrders: user.Orders.filter(order => order.status === 'pending').length,
      reviewsCount: user.reviews ? user.reviews.length : 0,
      listingsCount: user.Listings ? user.Listings.length : 0,
      is_verified: user.is_verified || false,
    });

  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).send({ error: "An error occurred while retrieving the user" });
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
        return res.status(404).send({ error: "user not found." });
      }


          // //validate the old password is much the password in the database
    if (req.body.password !== undefined && req.body.password !== '') {
      const isMatch = await existingUser.comparePassword(req.body.password);
      if (!isMatch) return res.status(400).send({ error: "Old password is incorrect" });
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
      await existingUser.save(); // Save the changes to the database

      // Send the updated user data in the response
      res.status(200).json({
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatar: getAvatarUrl(existingUser),
        is_verified: existingUser.is_verified || false,
        is_email_verified: existingUser.is_email_verified || false,
        phone: existingUser.phone || "",
        address: existingUser.address || "",
        role: existingUser.role,
        status: existingUser.status,
      });
    } catch (error) {
      console.error("Error updating user data :", error);
      res.status(500).json({ error: error.message });
    }
  }
);
// DELETE: Delete a user by ID (requires email verification and reason)
router.delete("/:id", auth, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { email, reason } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user) return res.status(404).send({ error: "User not found" });

    // Verify email matches the user's email
    if (!email || email !== user.email) {
      return res.status(403).send({ 
        error: "Email verification failed. Please provide the correct email associated with your account." 
      });
    }

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).send({ 
        error: "Please provide a reason for account deletion (minimum 10 characters)." 
      });
    }

    // Log the deletion reason for admin review (optional - could be saved to a deletion_log table)
    console.log(`Account deletion requested by user ${userId} (${user.email}). Reason: ${reason}`);

    await user.destroy();

    res.send({ message: "Your account has been deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "An error occurred while deleting the user" });
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

    res.json({
      message: `User role updated to ${role}`,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: getAvatarUrl(user),
      is_verified: user.is_verified || false,
      phone: user.phone || "",
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE: Remove user avatar
router.delete("/:id/avatar", auth, async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const existingUser = await User.findByPk(userId);

    if (!existingUser) {
      return res.status(404).send({ error: "User not found." });
    }

    // Check if user has permission to delete this avatar (optional security check)
    if (req.user.userId !== userId) {
      return res.status(403).send({ error: "You can only delete your own avatar." });
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

    res.status(200).json({
      message: "Avatar deleted successfully",
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      avatar: getAvatarUrl(existingUser), // Will return user's name when avatar is null
      is_verified: existingUser.is_verified || false,
      phone: existingUser.phone || "",
      role: existingUser.role,
      status: existingUser.status,
    });

  } catch (error) {
    console.error("Error deleting avatar:", error);
    res.status(500).json({ error: error.message });
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

    res.status(200).json({
      message: `Account ${verified ? 'verified' : 'unverified'} successfully`,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: getAvatarUrl(user),
      is_verified: user.is_verified,
      phone: user.phone || "",
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
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

    res.status(200).json({
      message: suspended ? "User suspended successfully" : "User reactivated successfully",
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: getAvatarUrl(user),
      is_verified: user.is_verified || false,
      phone: user.phone || "",
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    console.error("Error updating user suspension status:", error);
    res.status(500).json({ error: "Failed to update user suspension status" });
  }
});

module.exports = router;
