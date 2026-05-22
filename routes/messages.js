const express = require('express');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Message, User, Listing } = require('../models');
const { sendPushNotification } = require('../utilities/pushNotifications');

const router = express.Router();

router.use(auth);

const buildMessageInclude = () => [
  { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
  { model: User, as: 'recipient', attributes: ['id', 'name', 'avatar'] },
  { model: Listing, attributes: ['id', 'title'] },
];

router.get('/conversation/:otherUserId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = parseInt(req.params.otherUserId, 10);

    if (!otherUserId || Number.isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid otherUserId' });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId, recipient_id: otherUserId },
          { sender_id: otherUserId, recipient_id: userId },
        ],
      },
      order: [['createdAt', 'ASC']],
      include: buildMessageInclude(),
    });

    res.json({ ok: true, data: messages });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

router.get('/threads', async (req, res) => {
  try {
    const userId = req.user.userId;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { recipient_id: userId }],
      },
      order: [['createdAt', 'DESC']],
      include: buildMessageInclude(),
    });

    const threadMap = new Map();

    messages.forEach((message) => {
      const senderId = String(message.sender_id);
      const recipientId = String(message.recipient_id);
      const otherUser = senderId === String(userId) ? message.recipient : message.sender;
      const threadKey = senderId === String(userId)
        ? `${senderId}:${recipientId}`
        : `${recipientId}:${senderId}`;

      if (!otherUser || threadMap.has(threadKey)) {
        return;
      }

      threadMap.set(threadKey, {
        id: otherUser.id,
        name: otherUser.name || `User ${otherUser.id}`,
        avatar: otherUser.avatar || null,
        lastMessage: message.content,
        time: message.createdAt,
        unread: String(message.recipient_id) === String(userId) && !message.is_read,
      });
    });

    const threads = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );

    res.json({ ok: true, data: threads });
  } catch (error) {
    console.error('Error fetching message threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

router.post('/', async (req, res) => {
  try {
    const senderId = req.user.userId;
    const recipientId = parseInt(req.body.recipientId ?? req.body.recipient_id, 10);
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const listingId = req.body.listingId ?? req.body.listing_id ?? null;

    if (!recipientId || Number.isNaN(recipientId)) {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    if (String(recipientId) === String(senderId)) {
      return res.status(400).json({ error: 'Cannot send a message to yourself' });
    }

    const recipient = await User.findByPk(recipientId, {
      attributes: ['id', 'name', 'avatar', 'expoPushToken'],
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const sender = await User.findByPk(senderId, {
      attributes: ['id', 'name', 'avatar'],
    });

    const message = await Message.create({
      sender_id: senderId,
      recipient_id: recipientId,
      listing_id: listingId || null,
      content,
      is_read: false,
      read_at: null,
    });

    const payload = await Message.findByPk(message.id, { include: buildMessageInclude() });

    if (recipient.expoPushToken) {
      try {
        await sendPushNotification(recipient.expoPushToken, {
          title: `New message from ${sender?.name || 'User'}`,
          body: content,
          data: {
            messageId: message.id,
            senderId,
            recipientId,
            listingId: listingId || null,
            type: 'message',
          },
          priority: 'high',
        });
      } catch (pushError) {
        console.warn('Failed to send message push notification:', pushError.message);
      }
    }

    res.status(201).json({ ok: true, data: payload });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const message = await Message.findOne({
      where: { id: req.params.id, recipient_id: userId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.is_read) {
      message.is_read = true;
      message.read_at = new Date();
      await message.save();
    }

    res.json({ ok: true, data: message });
  } catch (error) {
    console.error('Error marking message read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;