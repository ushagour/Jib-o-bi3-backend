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
  dest: "uploads/",
  limits: { fieldSize: 25 * 1024 * 1024 },
});


// GET: Retrieve a user by ID
router.get("/:id", async (req, res) => {

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
    
      return  `${baseUrl}${file_name}_avatar.jpg`;
 
    }


    res.send({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: AvatarMapper(user.avatar),
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
    upload.array("images", config.get("maxImageCount")), // Handle file uploads
    imageResize, // Resize images if provided
    validateWith(userSchema), // Validate incoming data
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
   

      // Update listing fields
      const updatedUserData = {
        name: req.body.name || existingUser.name,
        email: req.body.email || existingUser.email,
        avatar: req.body.avatar ,
      };

      if (req.file) {
        updatedUserData.avatar = req.file.filename;
        // Resize the image if needed
        // await imageResize(req.file.path, 500, 500); // Resize to 500x500 pixels
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



module.exports = router;
