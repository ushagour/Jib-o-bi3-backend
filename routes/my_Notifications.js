const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { Expo } = require("expo-server-sdk");

const usersStore = require("../store/users");
const listingsStore = require("../store/listings");
const myNotificationsStore = require("../store/myNotifications");
const sendPushNotification = require("../utilities/pushNotifications");
const auth = require("../middleware/auth");
const validateWith = require("../middleware/validation");

const schema = Joi.object({
  listingId: Joi.number().required(),
  message: Joi.string().required(),
});
const expo = new Expo();


router.get("/", auth, (req, res) => {
  
  const myNotification = myNotificationsStore.getMessagesForUser(req.user.userId);

  const mapUser = (userId) => {
    const user = usersStore.getUserById(userId);
    return { id: user.id, name: user.name, avatar: user.avatar };
  };

  const resources = myNotification.map((message) => ({
    id: message.id,
    listingId: message.listingId,
    dateTime: message.dateTime,
    content: message.content,
    fromUser: mapUser(message.fromUserId),
    toUser: mapUser(message.toUserId),
  }));

  res.send(resources);
});

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
