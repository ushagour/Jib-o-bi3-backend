const express = require("express");
const router = express.Router();
const Joi = require("joi");

const auth = require("../middleware/auth");
const validateWith = require("../middleware/validation");
const { User } = require("../models");
const { Expo } = require("expo-server-sdk");


// Define the Joi schema for validation
const tokenSchema = Joi.object({
  token: Joi.string().required()
});
const expo = new Expo();


router.post(
  "/",
  [auth, validateWith(tokenSchema)], // Middleware to validate the request body
  async(req, res) => {



    
    const { token } = req.body;

    // console.log("Received token:", token);
    

    // if (Expo.isExpoPushToken(token)) {
    //   return res.status(400).send({ error: "Invalid Expo Push Token" });
    // }
  
    try {
      const user = await User.findByPk(req.user.userId);
      // console.log("user", user);


      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
    

      // Check if the token is already saved
      if (user.expoPushToken === token) {
        return res.status(200).send({ message: "Push token already exists" });
      }
      // Save the token to the user record
      // console.log("Saving token to user:", user.id);
      // console.log("Token to save:", token);
      user.expoPushToken = token; // Assuming you have a column `expoPushToken` in your User model     
      await user.save();
      res.status(200).send({ message: "Push token saved successfully" });
    } catch (error) {
      console.error("Error saving push token:", error);
      res.status(500).send({ error: "An error occurred while saving the push token" });
    }
  });
module.exports = router;
