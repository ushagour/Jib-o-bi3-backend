const { Expo } = require("expo-server-sdk");

const sendPushNotification = async (targetExpoPushToken, notificationDetails) => {
  const expo = new Expo();

  // Build the notification message
  const message = {
    to: targetExpoPushToken,
    sound: notificationDetails.sound || "default", // Default sound
    title: notificationDetails.title || "Notification", // Default title
    body: notificationDetails.body || "You have a new message!", // Default body
    data: notificationDetails.data || {}, // Additional data (optional)
    priority: notificationDetails.priority || "default", // Priority (default, high)
    channelId: notificationDetails.channelId || "default", // For Android channels
  };

  // Chunk the notifications
  const chunks = expo.chunkPushNotifications([message]);

  const sendChunks = async () => {
    // Send each chunk
    for (const chunk of chunks) {
      console.log("Sending Chunk", chunk);
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log("Tickets", tickets);
      } catch (error) {
        console.error("Error sending chunk", error);
      }
    }
  };

  await sendChunks();
};

module.exports = sendPushNotification;
