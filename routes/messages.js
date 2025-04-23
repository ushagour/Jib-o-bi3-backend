const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { Expo } = require("expo-server-sdk");

const sendPushNotification = require("../utilities/pushNotifications");
const auth = require("../middleware/auth");
const validateWith = require("../middleware/validation");
const { Listing, Image,User,Favorites,Reviews,Messages } = require("../models");//
const c = require("config");


const schema = Joi.object({
  content: Joi.string().required(),
  target_user: Joi.number().integer().required(),
  id: Joi.number().integer().required(),
});
const expo = new Expo();


router.get("/",auth, async(req, res) => {
  try {
    const user_id = req.user.userId;

    const messages = await Messages.findAll({
      where: { receiver_id: user_id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatar'], // Include only necessary attributes
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'avatar'], // Include only necessary attributes
        },
        {
          model: Listing,
          attributes: ['id', 'title'], // Include only necessary attributes
        },
      ],
    });


    const resources = messages.map((message) => {
      return {
        id: message.id,
        fromUser: message.sender.name,
        toUser: message.receiver.name,
        content: message.content,
        avatar: message.sender.avatar,
        listing: message.Listing ? { id: message.Listing.id, title: message.Listing.title } : null,
        createdAt: message.createdAt,
      };
    });

    if (!messages.length) return res.status(404).send({ error: "Messages not found." });

    res.send(resources);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send({ error: "An error occurred while fetching messages." });
  }
});

router.post("/", [auth, validateWith(schema)], async (req, res) => {

  const { content, id, target_user } = req.body;

  // Find the listing by ID
  const listing = await Listing.findByPk(id);
  if (!listing) {
    console.log("Listing not found");
    return res.status(400).send({ error: "Invalid listingId." });
  }

  // Find the target user by ID
  const targetUser = await User.findOne({ where: { id: target_user } });
  if (!targetUser || !targetUser.expoPushToken) {
    console.log("Target user or Expo Push Token not found");
    return res.status(400).send({ error: "Invalid target user or missing push token" });
  }

  // Create the new message in the database
  const NewMessage = await Messages.create({
    sender_id: req.user.userId,
    receiver_id: targetUser.id,
    listing_id: listing.id,
    content: content,
  });

  // Prepare the notification details
  const notificationDetails = {
    title: `New message from ${req.user.name}`, // Sender's name
    body: content, // Message content
    data: {
      messageId: NewMessage.id,
      senderId: req.user.userId,
      receiverId: targetUser.id,
      listingId: listing.id,
      listingTitle: listing.title,
    },
  };

  // Extract the Expo Push Token for the target user
  const expoPushToken = targetUser.expoPushToken;

  // Send the push notification
  if (Expo.isExpoPushToken(expoPushToken)) {
    try {
      await sendPushNotification(expoPushToken, notificationDetails);
      // console.log("Push notification sent successfully");
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  } else {
    console.log("Invalid Expo Push Token");
  }

  res.status(201).send(NewMessage);
});

router.delete("/:id",async(req, res) => {
  
  const messageId = parseInt(req.params.id); // Extract the ID from the URL

  try {
    const message = await Messages.findByPk(messageId);
    if (!message) {
      return res.status(404).send({ error: "message not found." });
    }

    await message.destroy(); // Delete the message
    res.status(200).send({ message: "message deleted successfully." });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).send({ error: "An error occurred while deleting the message." });
  } 

});

module.exports = router;
