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
  listingId: Joi.number().required(),
  message: Joi.string().required(),
});
const expo = new Expo();


router.get("/",auth, async(req, res) => {
  try {
  const user_id = req.user.userId; // Use req.user.userId to get the user ID from the token
  const myNotification = await Messages.findAll({where: {sender_id:user_id}, include: [   {
    model: User,
  },{
    model:
    Listing,
  }]});


// /* it's a good practice to map the user id to the user objec*/
//   const mapUser = (userId) => {
//     const user = usersStore.getUserById(userId);
//     return { id: user.id, name: user.name, avatar: user.avatar };
//   };


  const resources = myNotification.map((message) => { 
    return {
      id: message.id,
      fromUser: message.User.name,
      content: message.content,
      avatar: message.User.avatar,
      listing_id: message.Listing.id, // Convert listing object to array
      createdAt: message.createdAt,
    };
  }
  );
  if (!myNotification.length) return res.status(404).send({ error: "Messages not found." });

  res.send(resources);
} catch (error) {
  console.error("Error fetching notifications:", error);
  res.status(500).send({ error: "An error occurred while fetching notifications." });
}
}
);

router.post("/", [auth, validateWith(schema)], async (req, res) => {
  // console.log(auth);
  
  const { listingId, message } = req.body;

  
  const listing = listingsStore.getListing(listingId);
  if (!listing) {
    console.log("listing not found");
    return res.status(400).send({ error: "Invalid listingId." });
  }

  const targetUser = usersStore.getUserById(parseInt(listing.userId));
  if (!targetUser) {
    console.log("targetUser not found");
    return res.status(400).send({ error: "Invalid userId." });
  }
// console.log("targetUser", targetUser);


  myNotificationsStore.add({
    fromUserId: req.user.userId,
    toUserId: listing.userId,
    listingId,
    content: message,
  });



  
  const { expoPushToken } = targetUser;//the expo push token of the target user

  // console.log("user", expoPushToken);
  
  if (Expo.isExpoPushToken(expoPushToken)) {
    console.log("Sending push notification");
    await sendPushNotification(expoPushToken, message);
  }

  console.log("Sending success response");
  res.status(201).send();
});


router.delete("/:id", auth, (req, res) => {
  const messageId = parseInt(req.params.id); // Extract the ID from the URL
  console.log("Deleting listing with ID:", messageId);

  const message = myNotificationsStore.getMessage(messageId); // Retrieve the listing by ID
  if (!message) return res.status(404).send({ error: "message not found." });

  myNotificationsStore.deleteMessage(messageId); // Delete the listing

  res.send({ message: "Message deleted successfully." });
});

module.exports = router;
