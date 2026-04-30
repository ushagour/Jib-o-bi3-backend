const { Op } = require('sequelize');
const { Notification, Favorites, Orders } = require('../models');

async function createNotification({
  userId,
  actorId = null,
  listingId = null,
  type,
  title,
  content,
}) {
  if (!userId || !type || !title || !content) return null;

  return Notification.create({
    user_id: userId,
    actor_id: actorId,
    listing_id: listingId,
    type,
    title,
    content,
  });
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

  const [favorites, messages, orders] = await Promise.all([
    Favorites.findAll({ where: { listing_id: listingId }, attributes: ['user_id'] }),
    Orders.findAll({ where: { listing_id: listingId }, attributes: ['buyer_id'] }),
  ]);

  const recipients = new Set();

  favorites.forEach((row) => recipients.add(row.user_id));
  orders.forEach((row) => recipients.add(row.buyer_id));

  recipients.delete(actorId);
  recipients.delete(null);
  recipients.delete(undefined);

  const rows = Array.from(recipients).map((userId) => ({
    user_id: userId,
    actor_id: actorId,
    listing_id: listingId,
    type: 'listing_update',
    title: `Listing updated: ${listingTitle}`,
    content: summary,
  }));

  if (!rows.length) return 0;

  await Notification.bulkCreate(rows);
  return rows.length;
}

module.exports = {
  createNotification,
  createListingUpdateNotifications,
};
