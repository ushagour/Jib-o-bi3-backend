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
  id: Joi.number().required(),
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
  
  const { id, content } = req.body;

  
  const listing = await Listing.findByPk(id);



  if (!listing) {
    console.log("listing not found");
    return res.status(400).send({ error: "Invalid listingId." });
  }


  const targetUser = await User.findByPk(listing.user_id);


  if (!targetUser) {
    console.log("targetUser not found");
    return res.status(400).send({ error: "Invalid userId." });
  }


  
  const NewMessage = await Messages.create({
    sender_id: req.user.userId,
    receiver_id: targetUser.id,
    listing_id: listing.id,
    content: content,
  });
  const { expoPushToken } = targetUser;//the expo push token of the target user

  
  if (Expo.isExpoPushToken(expoPushToken)) {
    console.log("Sending push notification");
    await sendPushNotification(expoPushToken, NewMessage);
  }

  console.log("Sending success response");
  res.status(201).send();
});


router.delete("/:id", auth, (req, res) => {
  const messageId = parseInt(req.params.id); // Extract the ID from the URL
  console.log("Deleting listing with ID:", messageId);


});

module.exports = router;
