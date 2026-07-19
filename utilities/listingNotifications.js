const { Notification, User } = require('../models');
const { getNotificationText } = require('./notificationService');

/**
 * Notify listing owner about listing status changes
 */
async function notifyListingClosed(listingId, listingTitle, userId, language = 'en') {
  try {
    const title = 'Listing Closed';
    const content = getNotificationText('listing.closed', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_update',
      title,
      content,
      listing_id: listingId,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing closed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify listing owner about listing reopening
 */
async function notifyListingReopened(listingId, listingTitle, userId, language = 'en') {
  try {
    const title = 'Listing Reopened';
    const content = getNotificationText('listing.reopened', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_update',
      title,
      content,
      listing_id: listingId,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing reopened:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify listing owner about listing being sold
 */
async function notifyListingSold(listingId, listingTitle, userId, language = 'en') {
  try {
    const title = 'Listing Sold';
    const content = getNotificationText('listing.sold', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_update',
      title,
      content,
      listing_id: listingId,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing sold:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify listing owner about listing being viewed
 */
async function notifyListingViewed(listingId, listingTitle, userId, viewerName, language = 'en') {
  try {
    const title = 'Listing Viewed';
    const content = getNotificationText('listing.viewed', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_view',
      title,
      content,
      listing_id: listingId,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing viewed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify listing owner about listing being favorited
 */
async function notifyListingFavorited(listingId, listingTitle, userId, favoriterName, language = 'en') {
  try {
    const title = 'Listing Favorited';
    const content = getNotificationText('listing.favorited', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_favorite',
      title,
      content,
      listing_id: listingId,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing favorited:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify listing owner about listing expiration
 */
async function notifyListingExpired(listingId, listingTitle, userId, language = 'en') {
  try {
    const title = 'Listing Expired';
    const content = getNotificationText('listing.expired', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_expired',
      title,
      content,
      listing_id: listingId,
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing expired:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify listing owner about listing being reported
 */
async function notifyListingReported(listingId, listingTitle, userId, reason, language = 'en') {
  try {
    const title = 'Listing Reported';
    const content = getNotificationText('listing.reported', language, {
      listingTitle,
    });

    const notification = await Notification.create({
      user_id: userId,
      type: 'listing_report',
      title,
      content,
      listing_id: listingId,
      data: { reason },
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error notifying listing reported:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  notifyListingClosed,
  notifyListingReopened,
  notifyListingSold,
  notifyListingViewed,
  notifyListingFavorited,
  notifyListingExpired,
  notifyListingReported,
};
