const { Expo } = require("expo-server-sdk");

const expo = new Expo();

/**
 * Send push notification to a single user
 * @param {string} targetExpoPushToken - The Expo push token of the recipient
 * @param {Object} notificationDetails - Details of the notification
 * @param {string} notificationDetails.title - Notification title
 * @param {string} notificationDetails.body - Notification message body
 * @param {Object} notificationDetails.data - Additional data (optional)
 * @param {string} notificationDetails.sound - Sound to play (optional, default: "default")
 * @param {string} notificationDetails.priority - Notification priority (optional, default: "default")
 * @param {string} notificationDetails.channelId - Android channel ID (optional, default: "default")
 * @returns {Promise<Object>} The response from Expo with tickets
 */
const sendPushNotification = async (targetExpoPushToken, notificationDetails) => {
  // Validate token
  if (!targetExpoPushToken || typeof targetExpoPushToken !== 'string') {
    console.warn("Invalid or missing Expo push token");
    return { success: false, error: "Invalid token" };
  }

  // Validate token format
  if (!Expo.isExpoPushToken(targetExpoPushToken)) {
    console.warn(`Invalid Expo push token format: ${targetExpoPushToken}`);
    return { success: false, error: "Invalid token format" };
  }

  try {
    // Build the notification message
    const message = {
      to: targetExpoPushToken,
      sound: notificationDetails.sound || "default",
      title: notificationDetails.title || "Notification",
      body: notificationDetails.body || "You have a new notification!",
      data: notificationDetails.data || {},
      priority: notificationDetails.priority || "default",
      channelId: notificationDetails.channelId || "default",
    };

    // Chunk the notifications
    const chunks = expo.chunkPushNotifications([message]);

    let allTickets = [];

    // Send each chunk
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        allTickets = [...allTickets, ...tickets];
        console.log(`✅ Push notification sent successfully:`, {
          to: targetExpoPushToken,
          title: message.title,
          body: message.body,
        });
      } catch (error) {
        console.error("❌ Error sending push notification chunk:", error);
      }
    }

    return { success: true, tickets: allTickets };
  } catch (error) {
    console.error("❌ Error in sendPushNotification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notifications to multiple users
 * @param {Array<string>} expoPushTokens - Array of Expo push tokens
 * @param {Object} notificationDetails - Details of the notification
 * @returns {Promise<Object>} The response with tickets and failed tokens
 */
const sendPushNotificationBatch = async (expoPushTokens, notificationDetails) => {
  if (!Array.isArray(expoPushTokens) || expoPushTokens.length === 0) {
    return { success: false, error: "No valid tokens provided" };
  }

  const validTokens = expoPushTokens.filter(
    (token) => token && Expo.isExpoPushToken(token)
  );

  if (validTokens.length === 0) {
    console.warn("No valid Expo push tokens");
    return { success: false, error: "No valid tokens" };
  }

  try {
    const messages = validTokens.map((token) => ({
      to: token,
      sound: notificationDetails.sound || "default",
      title: notificationDetails.title || "Notification",
      body: notificationDetails.body || "You have a new notification!",
      data: notificationDetails.data || {},
      priority: notificationDetails.priority || "default",
      channelId: notificationDetails.channelId || "default",
    }));

    const chunks = expo.chunkPushNotifications(messages);
    let allTickets = [];

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        allTickets = [...allTickets, ...tickets];
      } catch (error) {
        console.error("❌ Error sending batch chunk:", error);
      }
    }

    console.log(`✅ Batch notifications sent to ${validTokens.length} users`);
    return { success: true, sentCount: validTokens.length, tickets: allTickets };
  } catch (error) {
    console.error("❌ Error in sendPushNotificationBatch:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPushNotification, sendPushNotificationBatch };
