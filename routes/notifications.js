const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { Notification, User, Listing } = require('../models');

const router = express.Router();

router.use(auth);

// User endpoint: create a notification for themselves
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'message', title, content, listingId = null } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    if (!['message', 'review', 'like', 'listing_update'].includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const created = await Notification.create({
      user_id: userId,
      actor_id: userId,
      listing_id: listingId,
      type,
      title,
      content,
      is_read: false,
      read_at: null,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Admin endpoint: view all notifications across the system
router.get('/admin/all', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const type = req.query.type;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

    const where = {};
    if (type && ['message', 'review', 'like', 'listing_update'].includes(type)) {
      where.type = type;
    }
    if (unreadOnly) {
      where.is_read = false;
    }

    const [notifications, totalCount] = await Promise.all([
      Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'avatar'],
          },
          {
            model: User,
            as: 'actor',
            attributes: ['id', 'name', 'avatar'],
          },
          {
            model: Listing,
            attributes: ['id', 'title'],
          },
        ],
      }),
      Notification.count({ where }),
    ]);

    const unreadCount = await Notification.count({
      where: { ...where, is_read: false },
    });

    res.json({
      totalCount,
      unreadCount,
      limit,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// User endpoint: view their own notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

    const where = { user_id: userId };
    if (unreadOnly) where.is_read = false;

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
    });

    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false },
    });

    res.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Admin endpoint: mark any notification as read
router.patch('/admin/:id/read', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// User endpoint: mark their own notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.userId;
    const [updatedCount] = await Notification.update(
      {
        is_read: true,
        read_at: new Date(),
      },
      {
        where: {
          user_id: userId,
          is_read: false,
        },
      }
    );

    res.json({ updatedCount });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// User endpoint: update their own notification
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updates = {};
    if (typeof req.body.title === 'string' && req.body.title.trim()) {
      updates.title = req.body.title.trim();
    }
    if (typeof req.body.content === 'string' && req.body.content.trim()) {
      updates.content = req.body.content.trim();
    }
    if (typeof req.body.is_read === 'boolean') {
      updates.is_read = req.body.is_read;
      updates.read_at = req.body.is_read ? new Date() : null;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await notification.update(updates);
    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// User endpoint: delete their own notification
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const deletedCount = await Notification.destroy({
      where: { id: req.params.id, user_id: userId },
    });

    if (!deletedCount) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
