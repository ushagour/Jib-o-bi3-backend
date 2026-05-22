const { Op } = require('sequelize');
const { Notification, Favorites, Orders, User } = require('../models');
const { sendPushNotification, sendPushNotificationBatch } = require('./pushNotifications');

async function createNotification({
  userId,
  actorId = null,
  listingId = null,
  type,
  title,
  content,
}) {
  if (!userId || !type || !title || !content) return null;

  try {
    // Create the notification in database
    const notification = await Notification.create({
      user_id: userId,
      actor_id: actorId,
      listing_id: listingId,
      type,
      title,
      content,
    });

    // Try to send push notification
    const recipient = await User.findByPk(userId);
    if (recipient && recipient.expoPushToken) {
      try {
        await sendPushNotification(recipient.expoPushToken, {
          title: title,
          body: content,
          data: {
            notificationId: notification.id,
            type: type,
            listingId: listingId || null,
          },
          priority: 'high',
        });
      } catch (pushError) {
        console.warn(`Failed to send push notification to user ${userId}:`, pushError.message);
        // Don't fail the notification creation if push fails
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

function buildListingUpdateSummary(changes) {
  const labels = [];

  if (changes.title) labels.push('title');
  if (changes.price) labels.push('price');
  if (changes.status) labels.push('status');
  if (changes.description) labels.push('description');
  if (changes.category_id) labels.push('category');

  if (!labels.length) return null;
  if (labels.length === 1) return `${labels[0]} updated`;

  const last = labels.pop();
  return `${labels.join(', ')} and ${last} updated`;
}

async function createListingUpdateNotifications({ listingId, actorId, listingTitle, changes }) {
  const summary = buildListingUpdateSummary(changes);
  if (!summary) return 0;

  const [favorites, orders] = await Promise.all([
    Favorites.findAll({ where: { listing_id: listingId }, attributes: ['user_id'] }),
    Orders.findAll({ where: { listing_id: listingId }, attributes: ['buyer_id'] }),
  ]);

  const recipients = new Set();

  favorites.forEach((row) => recipients.add(row.user_id));
  orders.forEach((row) => recipients.add(row.buyer_id));

  recipients.delete(actorId);
  recipients.delete(null);
  recipients.delete(undefined);

  if (recipients.size === 0) return 0;

  const rows = Array.from(recipients).map((userId) => ({
    user_id: userId,
    actor_id: actorId,
    listing_id: listingId,
    type: 'listing_update',
    title: `Listing updated: ${listingTitle}`,
    content: summary,
  }));

  try {
    // Create all notifications
    await Notification.bulkCreate(rows);

    // Get push tokens for all recipients
    const users = await User.findAll({
      where: { id: Array.from(recipients) },
      attributes: ['id', 'expoPushToken'],
    });

    const pushTokens = users
      .filter((user) => user.expoPushToken)
      .map((user) => user.expoPushToken);

    // Send batch push notifications
    if (pushTokens.length > 0) {
      try {
        await sendPushNotificationBatch(pushTokens, {
          title: `Listing updated: ${listingTitle}`,
          body: summary,
          data: {
            type: 'listing_update',
            listingId: listingId,
          },
          priority: 'high',
        });
      } catch (pushError) {
        console.warn('Failed to send batch push notifications:', pushError.message);
        // Don't fail the notification creation if push fails
      }
    }

    return rows.length;
  } catch (error) {
    console.error('Error creating listing update notifications:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  createListingUpdateNotifications,
};
