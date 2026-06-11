const express = require('express');
const auth = require('../middleware/auth');
const {
  User,
  Listing,
  Favorites,
  Message,
  Notification,
  Orders,
} = require('../models');

const router = express.Router();

const SYSTEM_PROMPT = [
  'You are Jibobi Assistant, a concise but helpful AI assistant inside the Jibobi marketplace app.',
  'Help users with orders, listings, messages, reviews, shipping, account settings, reporting issues, and support.',
  'You will receive an APP SNAPSHOT with the user\'s live app data. Use it whenever the user asks about their account, orders, listings, favorites, messages, or notifications.',
  'Never invent counts, listing titles, order statuses, unread totals, payment states, or notification details. If the snapshot does not contain the requested fact, say that clearly.',
  'If the user asks what to do next in the app, suggest the relevant screen using the exact screen names from the snapshot when available.',
  'Be practical and ask a follow-up question only when the request is ambiguous.',
  'Keep answers concise but specific. Prefer concrete details from the snapshot over generic advice.',
  'Do not mention that you are a fallback or support bot.',
].join(' ');

const APP_SCREENS = {
  quickActions: ['My Listings', 'Orders', 'chat', 'Wishlist', 'Shipping Addresses'],
  accountActions: ['Preferences', 'Privacy & Security', 'Help & Support'],
  assistantEntryPoints: ['Help & Support', 'Assistant'],
};

const truncateText = (value, maxLength = 120) => {
  if (typeof value !== 'string') return '';
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

const toPlainNumber = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getUserId = (req) => req.user?.userId || req.user?.id;

const normalizeClientContext = (clientContext) => {
  if (!clientContext || typeof clientContext !== 'object' || Array.isArray(clientContext)) {
    return null;
  }

  const allowedKeys = ['currentScreen', 'entryPoint', 'surface'];
  const normalized = allowedKeys.reduce((accumulator, key) => {
    if (typeof clientContext[key] === 'string' && clientContext[key].trim()) {
      accumulator[key] = clientContext[key].trim();
    }
    return accumulator;
  }, {});

  return Object.keys(normalized).length ? normalized : null;
};

const normalizeMessages = (messages = []) =>
  messages
    .filter((message) => message && typeof message.content === 'string' && message.content.trim())
    .slice(-12)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim(),
    }));

const buildAssistantContext = async (userId, clientContext = null) => {
  const user = await User.findByPk(userId, {
    attributes: [
      'id',
      'name',
      'role',
      'status',
      'is_verified',
      'is_email_verified',
      'createdAt',
    ],
  });

  if (!user) {
    return null;
  }

  const [
    totalListings,
    activeListings,
    soldListings,
    favoritesCount,
    unreadMessages,
    unreadNotifications,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    unpaidOrders,
    recentListings,
    recentOrders,
    recentMessages,
    recentNotifications,
  ] = await Promise.all([
    Listing.count({ where: { user_id: userId, archived: false } }),
    Listing.count({ where: { user_id: userId, archived: false, status: 'still available' } }),
    Listing.count({ where: { user_id: userId, archived: false, status: 'Selled' } }),
    Favorites.count({ where: { user_id: userId } }),
    Message.count({ where: { recipient_id: userId, is_read: false } }),
    Notification.count({ where: { user_id: userId, is_read: false } }),
    Orders.count({ where: { buyer_id: userId } }),
    Orders.count({ where: { buyer_id: userId, status: 'pending' } }),
    Orders.count({ where: { buyer_id: userId, status: 'completed' } }),
    Orders.count({ where: { buyer_id: userId, status: 'cancelled' } }),
    Orders.count({ where: { buyer_id: userId, payment_status: 'pending' } }),
    Listing.findAll({
      where: { user_id: userId, archived: false },
      attributes: ['id', 'title', 'price', 'status', 'ai_score', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 5,
    }),
    Orders.findAll({
      where: { buyer_id: userId },
      attributes: ['id', 'status', 'payment_status', 'total_price', 'quantity', 'createdAt'],
      include: [
        {
          model: Listing,
          attributes: ['id', 'title', 'price', 'status'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
    Message.findAll({
      where: { recipient_id: userId },
      attributes: ['id', 'content', 'is_read', 'createdAt'],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name'],
        },
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
    Notification.findAll({
      where: { user_id: userId },
      attributes: ['id', 'type', 'title', 'content', 'is_read', 'createdAt'],
      include: [
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      isVerified: Boolean(user.is_verified),
      isEmailVerified: Boolean(user.is_email_verified),
      joinedAt: user.createdAt,
    },
    stats: {
      listings: {
        total: totalListings,
        active: activeListings,
        sold: soldListings,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        unpaid: unpaidOrders,
      },
      favorites: favoritesCount,
      unreadMessages,
      unreadNotifications,
    },
    recentListings: recentListings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: toPlainNumber(listing.price),
      status: listing.status,
      aiScore: listing.ai_score,
      updatedAt: listing.updatedAt,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      status: order.status,
      paymentStatus: order.payment_status,
      totalPrice: toPlainNumber(order.total_price),
      quantity: order.quantity,
      createdAt: order.createdAt,
      listing: order.Listing
        ? {
            id: order.Listing.id,
            title: order.Listing.title,
            price: toPlainNumber(order.Listing.price),
            status: order.Listing.status,
          }
        : null,
    })),
    recentMessages: recentMessages.map((message) => ({
      id: message.id,
      from: message.sender?.name || 'Unknown user',
      listingTitle: message.Listing?.title || null,
      isRead: Boolean(message.is_read),
      receivedAt: message.createdAt,
      preview: truncateText(message.content, 90),
    })),
    recentNotifications: recentNotifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      listingTitle: notification.Listing?.title || null,
      isRead: Boolean(notification.is_read),
      createdAt: notification.createdAt,
      preview: truncateText(notification.content, 90),
    })),
    screens: APP_SCREENS,
    clientContext: normalizeClientContext(clientContext),
  };
};

router.use(auth);

router.get('/context', async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authenticated user id is required' });
    }

    const context = await buildAssistantContext(userId, req.query);

    if (!context) {
      return res.status(404).json({ error: 'User context not found' });
    }

    return res.json({
      ok: true,
      data: {
        context,
      },
    });
  } catch (error) {
    console.error('Error building assistant context:', error);
    return res.status(500).json({ error: 'Failed to build assistant context' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const messages = normalizeMessages(req.body?.messages);
    const userId = getUserId(req);

    if (!messages.length) {
      return res.status(400).json({ error: 'messages are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authenticated user id is required' });
    }

    const context = await buildAssistantContext(userId, req.body?.userContext);

    if (!context) {
      return res.status(404).json({ error: 'User context not found' });
    }

    if (!apiKey) {
      return res.status(503).json({
        error: 'AI assistant is not configured on the server. Set OPENAI_API_KEY to enable it.',
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: `APP SNAPSHOT:\n${JSON.stringify(context, null, 2)}` },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || 'Failed to generate assistant response';
      return res.status(response.status).json({ error: errorMessage });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: 'Empty AI response' });
    }

    return res.json({
      ok: true,
      data: {
        reply,
        context,
      },
    });
  } catch (error) {
    console.error('Error generating assistant response:', error);
    return res.status(500).json({ error: 'Failed to generate assistant response' });
  }
});

module.exports = router;