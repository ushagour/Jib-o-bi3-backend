const { Notification, Message, Favorites, Orders, User } = require('../models');
const { sendPushNotification, sendPushNotificationBatch } = require('./pushNotifications');

async function notifyUser({
  userId,
  actorId = null,
  listingId = null,
  type = 'message',
  title,
  content,
  data = {},
}) {
  if (!userId || !type || !title || !content) {
    throw new Error('Missing required fields: userId, type, title, content');
  }

  try {
    const notification = await Notification.create({
      user_id: userId,
      actor_id: actorId,
      listing_id: listingId,
      type,
      title,
      content,
    });

    const user = await User.findByPk(userId);
    let pushResult = { success: false, error: 'No push token' };

    if (user && user.expoPushToken) {
      try {
        pushResult = await sendPushNotification(user.expoPushToken, {
          title,
          body: content,
          data: {
            notificationId: notification.id,
            type,
            listingId,
            ...data,
          },
          priority: 'high',
        });
      } catch (pushError) {
        console.warn(`Failed to send push to user ${userId}:`, pushError.message);
        pushResult = { success: false, error: pushError.message };
      }
    }

    return {
      notification,
      pushResult,
      success: true,
    };
  } catch (error) {
    console.error('Error notifying user:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function notifyUsers({
  userIds,
  actorId = null,
  listingId = null,
  type = 'message',
  title,
  content,
  data = {},
}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds must be a non-empty array');
  }

  if (!type || !title || !content) {
    throw new Error('Missing required fields: type, title, content');
  }

  try {
    const notificationRows = userIds.map((userId) => ({
      user_id: userId,
      actor_id: actorId,
      listing_id: listingId,
      type,
      title,
      content,
    }));

    const createdNotifications = await Notification.bulkCreate(notificationRows);

    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'expoPushToken'],
    });

    const pushTokens = users
      .filter((user) => user.expoPushToken)
      .map((user) => user.expoPushToken);

    let pushResult = { success: false, sentCount: 0 };

    if (pushTokens.length > 0) {
      try {
        pushResult = await sendPushNotificationBatch(pushTokens, {
          title,
          body: content,
          data: {
            type,
            listingId,
            ...data,
          },
          priority: 'high',
        });
      } catch (pushError) {
        console.warn('Failed to send batch push:', pushError.message);
        pushResult = { success: false, error: pushError.message };
      }
    }

    return {
      notifications: createdNotifications,
      notifiedCount: createdNotifications.length,
      pushResult,
      success: true,
    };
  } catch (error) {
    console.error('Error notifying multiple users:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function notifyOrderStatus(userId, orderData) {
  return notifyUser({
    userId,
    type: 'order',
    title: `Order ${orderData.orderNumber} - ${orderData.status}`,
    content: orderData.message,
    data: {
      orderId: orderData.id,
    },
  });
}

async function notifyNewReview(listingSellerId, reviewData) {
  return notifyUser({
    userId: listingSellerId,
    actorId: reviewData.reviewerId,
    listingId: reviewData.listingId,
    type: 'review',
    title: `New review on "${reviewData.listingTitle}"`,
    content: `${reviewData.reviewerName} left a ${reviewData.rating}-star review`,
    data: {
      reviewId: reviewData.id,
      listingId: reviewData.listingId,
    },
  });
}

async function notifyNewLike(listingSellerId, likeData) {
  return notifyUser({
    userId: listingSellerId,
    actorId: likeData.userId,
    listingId: likeData.listingId,
    type: 'like',
    title: `Someone liked "${likeData.listingTitle}"`,
    content: `${likeData.userName} added your listing to favorites`,
    data: {
      listingId: likeData.listingId,
    },
  });
}

async function notifyNewMessage(recipientId, messageData) {
  if (!recipientId || !messageData?.senderId) return null;

  const message = await Message.create({
    sender_id: messageData.senderId,
    recipient_id: recipientId,
    listing_id: messageData.listingId || null,
    content: messageData.preview || 'You have a new message',
    is_read: false,
    read_at: null,
  });

  const recipient = await User.findByPk(recipientId);
  if (recipient && recipient.expoPushToken) {
    try {
      await sendPushNotification(recipient.expoPushToken, {
        title: `New message from ${messageData.senderName}`,
        body: messageData.preview || 'You have a new message',
        data: {
          messageId: message.id,
          senderId: messageData.senderId,
          listingId: messageData.listingId || null,
          type: 'message',
        },
        priority: 'high',
      });
    } catch (pushError) {
      console.warn(`Failed to send message push notification to user ${recipientId}:`, pushError.message);
    }
  }

  return message;
}

module.exports = {
  notifyUser,
  notifyUsers,
  notifyOrderStatus,
  notifyNewReview,
  notifyNewLike,
  notifyNewMessage,
};