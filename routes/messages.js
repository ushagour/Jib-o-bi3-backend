const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { Expo } = require("expo-server-sdk");
const { Op } = require('sequelize');

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
// Apply auth middleware to all routes
router.use(auth);

//


// unread messages notification bil 
router.get("/unread", async (req, res) => {
  try {
    
 const userId = req.query.userId || (req.user && req.user.userId);
    if (!userId) {
      return res.status(400).send({ error: "Missing userId." });
    }
        const unreadMessages = await Messages.findAll({


         
      where: {
        receiver_id: userId,
        is_read: false, // Assuming 'read' is a boolean field indicating if the message has been read
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
    });
    const resources = unreadMessages.map((message) => {
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
    if (!unreadMessages.length) return res.status(404).send({ error: "No unread messages found." });
    res.send(resources);
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    res.status(500).send({ error: "An error occurred while fetching unread messages." });
  }
}); 


router.get("/:id", async(req, res) => {
  try {
    const user_id = req.user.userId;

    const messages = await Messages.findAll({
      where: { receiver_id: user_id? user_id : null },
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
    console.log(targetUser);
    console.log("Missing Expo Push Token");

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



// Fetch all messages (admin/global)
router.get("/", async (req, res) => {
  try {
    const messages = await Messages.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
    });

    const resources = messages.map((message) => ({
      id: message.id,
      fromUser: message.sender?.name,
      toUser: message.receiver?.name,
      content: message.content,
      is_read: message.is_read,
      avatar: message.sender?.avatar,
      listing: message.Listing ? { id: message.Listing.id, title: message.Listing.title } : null,
      createdAt: message.createdAt,
    }));

    res.send(resources);
  } catch (error) {
    console.error("Error fetching all messages:", error);
    res.status(500).send({ error: "An error occurred while fetching all messages." });
  }
});

// Fetch messages for a specific user (by userId param)
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const messages = await Messages.findAll({
      where: {
        receiver_id: userId,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
    });

    const resources = messages.map((message) => ({
      id: message.id,
      fromUser: message.sender?.name,
      toUser: message.receiver?.name,
      content: message.content,
      avatar: message.sender?.avatar,
      listing: message.Listing ? { id: message.Listing.id, title: message.Listing.title } : null,
      createdAt: message.createdAt,
    }));

    res.send(resources);
  } catch (error) {
    console.error("Error fetching user messages:", error);
    res.status(500).send({ error: "An error occurred while fetching user messages." });
  }
});

// Mark a message as read
router.patch("/:id/read", async (req, res) => {
  try {

    

    const message = await Messages.findByPk(req.params.id);


    
    if (!message) return res.status(404).json({ error: "Message not found" });

    message.is_read = true;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    log("Error marking message as read:", error);
    res.status(500).json({ error: error.message });
  }
});




module.exports = router;
