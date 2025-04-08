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
  
  console.log("req.body", req.body);
  
  const { content,id,target_user,token } = req.body;
  
  const listing = await Listing.findByPk(id);



  if (!listing) {
    console.log("listing not found");
    return res.status(400).send({ error: "Invalid listingId." });
  }
  const targetUser = await User.findOne({ where: { id: target_user } });






// console.log("targetUser", targetUser);
  // Check if the sender and receiver are the same
  // if (req.user.userId === targetUser.id) {
  //   return res.status(400).send({ error: "You cannot send a message to yourself." });
  // }
  // Check if the user is blocked
  // const blockedUser = await User.findOne({ where: { id: req.user.userId, blockedUsers: targetUser.id } });
  // if (blockedUser) {
  //   return res.status(400).send({ error: "You cannot send a message to this user." });
  // }
  // // Check if the target user is blocked
  // const blockedByUser = await User.findOne({ where: { id: target_user, blockedUsers: req.user.userId } });
  // if (blockedByUser) {
  //   return res.status(400).send({ error: "This user has blocked you." });
  // }

  
  const NewMessage = await Messages.create({
    sender_id: req.user.userId,
    receiver_id: targetUser.id,
    listing_id: listing.id,
    content: content,
  });


  // Extract the expoPushToken for the selected user
  

if (!targetUser || !targetUser.expoPushToken) {
  console.log("Target user or Expo Push Token not found");
  return res.status(400).send({ error: "Invalid target user or missing push token" });
}

const expoPushToken = targetUser.expoPushToken;

  if (Expo.isExpoPushToken(expoPushToken)) {
    await sendPushNotification(expoPushToken, NewMessage.content);

    console.log("Sending push notification");
  } else {
    console.log("Invalid Expo Push Token");
  }


  res.status(201).send();
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
