const express = require("express");
const app = express();
app.use(express.json()); // Middleware to parse JSON request body

const router = express.Router();
const bcrypt = require("bcrypt");
const multer = require("multer");
const config = require("config");
const e = require("express");

const { User, Orders,Listing } = require("../models");
const auth = require("../middleware/auth");
const validateWith = require("../middleware/validation");
const imageResize = require("../middleware/imageResize");
const Joi = require("joi");


// Validation schema for creating/updating a user
const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  avatar: Joi.string().optional(), // Optional avatar URL
});


const upload = multer({
  dest: "uploads/avatar/",
  limits: { fieldSize: 25 * 1024 * 1024 },
});


// GET: Retrieve a user by ID
router.get("/:id", auth, async (req, res) => {
  console.log("Fetching user with ID:", req.params.id); // Debug log
  

  const userId = parseInt(req.params.id);

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'avatar'],
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



    const AvatarMapper = file_name => {
      const baseUrl = config.get("assetsBaseUrl");
    
      return  `${baseUrl}${file_name}_avatar.png`;
 
    }


    res.send({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar:  AvatarMapper(user.avatar),
      completedOrders: user.Orders.filter(order => order.status === 'completed').length,
      pendingOrders: user.Orders.filter(order => order.status === 'pending').length,
      reviewsCount: user.reviews ? user.reviews.length : 0,
      listingsCount: user.Listings ? user.Listings.length : 0,
      phone: user.phone || "",
    });

  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).send({ error: "An error occurred while retrieving the user" });
  }
});


// PUT: Update a user by ID
// Configure multer for file uploads


router.put("/:id", [auth, 
    upload.single("avatar"), // Single avatar upload
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
   


    console.log("Request Body:", req.body); // Debug log
    console.log("Uploaded File:", req.file); // Debug log
    
      // Update user fields
      const updatedUserData = {
        name: req.body.name || existingUser.name,
        email: req.body.email || existingUser.email,
        avatar: req.body.avatar || existingUser.avatar,
      };

      if (req.file) {
        updatedUserData.avatar = req.file.filename;
      }
      


      // Update the user in the database
      await existingUser.update(updatedUserData);
      await existingUser.save(); // Save the changes to the database



      // Map the avatar URL to the desired format
      const AvatarMapper = file_name => {
        const baseUrl = config.get("assetsBaseUrl");
      
        return  `${baseUrl}${file_name}.jpg`;
  
      }
      // Send the updated user data in the response
      res.status(200).json({
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatar: AvatarMapper(existingUser.avatar),
      });
    } catch (error) {
      console.error("Error updating user data :", error);
      res.status(500).json({ error: error.message });
    }
  }
);
// DELETE: Delete a user by ID
router.delete("/:id", auth, async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const user = await User.findByPk(userId);

    if (!user) return res.status(404).send({ error: "User not found" });

    await user.destroy();

    res.send({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "An error occurred while deleting the user" });
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
      const fs = require('fs');
      const path = require('path');
      
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
      avatar: null,
    });

  } catch (error) {
    console.error("Error deleting avatar:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
