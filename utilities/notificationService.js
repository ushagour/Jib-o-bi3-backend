const { Notification, Message, Favorites, Orders, User } = require('../models');
const { sendPushNotification, sendPushNotificationBatch } = require('./pushNotifications');

// Translation helper for notifications
const getNotificationText = (key, lang = 'en', params = {}) => {
  // Map notification keys to translation paths
  const notificationTranslations = {
    en: {
      'order.status': `Order #${params.orderNumber} - ${params.status}`,
      'order.confirmed': 'Your order has been confirmed',
      'order.shipped': 'Your order has been shipped',
      'order.delivered': 'Your order has been delivered',
      'order.cancelled': 'Your order has been cancelled',
      'review.new': `New review on "${params.listingTitle}"`,
      'review.content': `${params.reviewerName} left a ${params.rating}-star review`,
      'like.new': `Someone liked "${params.listingTitle}"`,
      'like.content': `${params.name} added your listing to favorites`,
      'message.new': `New message from ${params.senderName}`,
      'message.content': params.preview || 'You have a new message',
      'listing.closed': `Your listing "${params.listingTitle}" has been closed`,
      'listing.reopened': `Your listing "${params.listingTitle}" has been reopened and is now available for buyers`,
      'listing.sold': `Your listing "${params.listingTitle}" has been sold`,
      'listing.viewed': `Your listing "${params.listingTitle}" was viewed`,
      'listing.favorited': `Someone added your listing "${params.listingTitle}" to favorites`,
      'listing.expired': `Your listing "${params.listingTitle}" has expired`,
      'listing.reported': `Your listing "${params.listingTitle}" has been reported`,
      'account.verified': 'Your account has been verified',
      'account.updated': 'Your profile has been updated',
      'account.password_changed': 'Your password has been changed',
      'payment.received': `Payment received for order #${params.orderNumber}`,
      'seller.rating': `New seller rating from ${params.raterName}`,
      'buyer.rating': `New buyer rating from ${params.raterName}`,
      'support.message': 'Message from support team',
      'item.back_in_stock': `${params.itemTitle} is back in stock`,
      'price.drop': `Price drop on your favorite item "${params.itemTitle}"`,
      'offer.new': 'You received a new offer',
    },
    fr: {
      'order.status': `Commande n°${params.orderNumber} - ${params.status}`,
      'order.confirmed': 'Votre commande a été confirmée',
      'order.shipped': 'Votre commande a été expédiée',
      'order.delivered': 'Votre commande a été livrée',
      'order.cancelled': 'Votre commande a été annulée',
      'review.new': `Nouvel avis sur "${params.listingTitle}"`,
      'review.content': `${params.reviewerName} a laissé un avis de ${params.rating} étoiles`,
      'like.new': `Quelqu'un a aimé "${params.listingTitle}"`,
      'like.content': `${params.name} a ajouté votre annonce aux favoris`,
      'message.new': `Nouveau message de ${params.senderName}`,
      'message.content': params.preview || 'Vous avez un nouveau message',
      'listing.closed': `Votre annonce "${params.listingTitle}" a été clôturée`,
      'listing.reopened': `Votre annonce "${params.listingTitle}" a été rouverte et est maintenant disponible pour les acheteurs`,
      'listing.sold': `Votre annonce "${params.listingTitle}" a été vendue`,
      'listing.viewed': `Votre annonce "${params.listingTitle}" a été consultée`,
      'listing.favorited': `Quelqu'un a ajouté votre annonce "${params.listingTitle}" aux favoris`,
      'listing.expired': `Votre annonce "${params.listingTitle}" a expiré`,
      'listing.reported': `Votre annonce "${params.listingTitle}" a été signalée`,
      'account.verified': 'Votre compte a été vérifié',
      'account.updated': 'Votre profil a été mis à jour',
      'account.password_changed': 'Votre mot de passe a été modifié',
      'payment.received': `Paiement reçu pour la commande n°${params.orderNumber}`,
      'seller.rating': `Nouvelle note de vendeur de ${params.raterName}`,
      'buyer.rating': `Nouvelle note d'acheteur de ${params.raterName}`,
      'support.message': 'Message de l\'équipe d\'assistance',
      'item.back_in_stock': `${params.itemTitle} est de nouveau en stock`,
      'price.drop': `Baisse de prix sur votre article préféré "${params.itemTitle}"`,
      'offer.new': 'Vous avez reçu une nouvelle offre',
    },
  };

  const langTranslations = notificationTranslations[lang] || notificationTranslations['en'];
  return langTranslations[key] || key;
};

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
  language = 'en',
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
  const lang = orderData.language || 'en';
  const title = getNotificationText('order.status', lang, {
    orderNumber: orderData.orderNumber,
    status: orderData.status,
  });
  const content = orderData.message || getNotificationText(`order.${orderData.status?.toLowerCase()}`, lang);

  return notifyUser({
    userId,
    type: 'order',
    title,
    content,
    data: {
      orderId: orderData.id,
    },
  });
}

async function notifyNewReview(listingSellerId, reviewData) {
  const lang = reviewData.language || 'en';
  const title = getNotificationText('review.new', lang, {
    listingTitle: reviewData.listingTitle,
  });
  const content = getNotificationText('review.content', lang, {
    reviewerName: reviewData.reviewerName,
    rating: reviewData.rating,
  });

  return notifyUser({
    userId: listingSellerId,
    actorId: reviewData.reviewerId,
    listingId: reviewData.listingId,
    type: 'review',
    title,
    content,
    data: {
      reviewId: reviewData.id,
      listingId: reviewData.listingId,
    },
  });
}

async function notifyNewLike(listingSellerId, likeData) {
  const lang = likeData.language || 'en';
  const title = getNotificationText('like.new', lang, {
    listingTitle: likeData.listingTitle,
  });
  const content = getNotificationText('like.content', lang, {
    name: likeData.name,
  });

  return notifyUser({
    userId: listingSellerId,
    actorId: likeData.userId,
    listingId: likeData.listingId,
    type: 'like',
    title,
    content,
    data: {
      listingId: likeData.listingId,
    },
  });
}

async function notifyNewMessage(recipientId, messageData) {
  if (!recipientId || !messageData?.senderId) return null;

  const lang = messageData.language || 'en';
  const message = await Message.create({
    sender_id: messageData.senderId,
    recipient_id: recipientId,
    listing_id: messageData.listingId || null,
    message_type: 'notification',
    content: messageData.preview || getNotificationText('message.content', lang),
    is_read: false,
    read_at: null,
  });

  const recipient = await User.findByPk(recipientId);
  if (recipient && recipient.expoPushToken) {
    try {
      const title = getNotificationText('message.new', lang, {
        senderName: messageData.senderName,
      });
      const body = getNotificationText('message.content', lang, {
        preview: messageData.preview,
      });

      await sendPushNotification(recipient.expoPushToken, {
        title,
        body,
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
  getNotificationText,
};