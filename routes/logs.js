// routes/logs.js
const express = require('express');
const router = express.Router();
const { Op, sequelize } = require('sequelize');
const auth = require('../middleware/auth');
const { ActivityLog, User, Listing, Orders } = require('../models');
const Logger = require('../utilities/Logger');
// ============================================
// MIDDLEWARE - Admin Only
// ============================================
// router.use(auth);

// const isAdmin = async (req, res, next) => {
//   if (req.user.role !== 'admin') {
//     return res.status(403).json({ error: 'Admin access required' });
//   }
//   next();
// };

// router.use(isAdmin);

// ============================================
// GET ALL LOGS
// ============================================
router.get('/', async (req, res) => {
  try {
    const {
      category,
      type,
      user_id,
      search,
      start_date,
      end_date,
      is_read,
      limit = 50,
      offset = 0,
      sort = 'DESC',
    } = req.query;

    // Build where clause
    const where = {};

    if (category && category !== 'All') {
      where.category = category;
    }

    if (type && type !== 'All') {
      where.type = type;
    }

    if (user_id) {
      where.user_id = user_id;
    }

    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    if (search) {
      where.message = { [Op.like]: `%${search}%` };
    }

    // Fetch logs with related data
    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'avatar'],
          as: 'User',
          required: false,
        },
        {
          model: Listing,
          attributes: ['id', 'title', 'price'],
          as: 'Listing',
          required: false,
        },
        {
          model: Orders,
          attributes: ['id', 'total_price', 'status'],
          as: 'Order',
          required: false,
        },
      ],
      order: [['created_at', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Mark logs as read when viewed
    if (rows.length > 0) {
      const ids = rows.map(log => log.id);
      await ActivityLog.update(
        { is_read: true, read_at: new Date() },
        { where: { id: { [Op.in]: ids }, is_read: false } }
      );
    }

    // Format response
    const formattedLogs = rows.map(log => ({
      id: log.id,
      type: log.type,
      category: log.category,
      message: log.message,
      details: log.details,
      user_id: log.user_id || null,
      user_name: log.User?.name || null,
      user_email: log.User?.email || null,
      listing_id: log.Listing?.id || null,
      listing_title: log.Listing?.title || null,
      order_id: log.Order?.id || null,
      order_status: log.Order?.status ||null,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      session_id: log.session_id,
      is_read: log.is_read,
      read_at: log.read_at,
      created_at: log.created_at,
    }));




    console.log(`Fetched ${rows.length} logs with filters: ${JSON.stringify(req.query)}`);

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + rows.length < count,
      },
    });
  } catch (error) {
    console.error('Error fetching logs:a', error.message);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ============================================
// GET LOG STATISTICS
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const total = await ActivityLog.count();

    const byType = await ActivityLog.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['type'],
      raw: true,
      subQuery: false,
    });

    const byCategory = await ActivityLog.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['category'],
      raw: true,
      subQuery: false,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await ActivityLog.count({
      where: {
        created_at: { [Op.gte]: today },
      },
    });

    const unreadCount = await ActivityLog.count({
      where: { is_read: false },
    });

    const errorCount = await ActivityLog.count({
      where: { type: 'error' },
    });

    res.json({
      success: true,
      data: {
        total,
        today: todayCount,
        unread: unreadCount,
        errors: errorCount,
        byType: byType.map(item => ({
          type: item.type,
          count: item.dataValues.count,
        })),
        byCategory: byCategory.map(item => ({
          category: item.category,
          count: item.dataValues.count,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================
// GET SINGLE LOG
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const log = await ActivityLog.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'avatar', 'phone'],
          as: 'User',
        },
        {
          model: Listing,
          attributes: ['id', 'title', 'price', 'status'],
          as: 'Listing',
        },
        {
          model: Orders,
          attributes: ['id', 'total_price', 'status', 'quantity'],
          as: 'Order',
        },
      ],
    });

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    // Mark as read
    if (!log.is_read) {
      await log.update({
        is_read: true,
        read_at: new Date(),
      });
    }

    res.json({
      success: true,
      data: {
        id: log.id,
        type: log.type,
        category: log.category,
        message: log.message,
        details: log.details,
        user_id: log.user_id,
        user_name: log.User?.name || null,
        user_email: log.User?.email || null,
        listing_id: log.listing_id,
        listing_title: log.Listing?.title || null,
        order_id: log.order_id,
        order_status: log.Order?.status || null,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        session_id: log.session_id,
        is_read: log.is_read,
        read_at: log.read_at,
        created_at: log.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// ============================================
// DELETE LOG
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const log = await ActivityLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    await log.destroy();

    await Logger.adminActivity(`Deleted log ${req.params.id}`, {
      user_id: req.user.id,
      details: {
        log_id: req.params.id,
        log_message: log.message,
      },
    });

    res.json({
      success: true,
      message: 'Log deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// ============================================
// DELETE ALL LOGS (with retention)
// ============================================
router.delete('/', async (req, res) => {
  try {
    const { older_than_days = 30, permanent = false } = req.query;

    if (permanent === 'true') {
      // Hard delete all logs
      await ActivityLog.destroy({ where: {} });
      await Logger.adminActivity('Cleared all logs', {
        user_id: req.user.id,
      });
    } else {
      // Delete logs older than specified days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(older_than_days));

      const deleted = await ActivityLog.destroy({
        where: {
          created_at: { [Op.lt]: cutoffDate },
        },
      });

      await Logger.adminActivity(
        `Deleted ${deleted} logs older than ${older_than_days} days`,
        { user_id: req.user.id }
      );
    }

    res.json({
      success: true,
      message: 'Logs cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ============================================
// MARK LOG AS READ
// ============================================
router.put('/:id/read', async (req, res) => {
  try {
    const log = await ActivityLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    await log.update({
      is_read: true,
      read_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Log marked as read',
    });
  } catch (error) {
    console.error('Error marking log as read:', error);
    res.status(500).json({ error: 'Failed to mark log as read' });
  }
});

// ============================================
// EXPORT LOGS
// ============================================
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', category, type, start_date, end_date } = req.query;

    // Build where clause
    const where = {};
    if (category && category !== 'All') where.category = category;
    if (type && type !== 'All') where.type = type;
    if (start_date) where.created_at = { [Op.gte]: new Date(start_date) };
    if (end_date) where.created_at = { [Op.lte]: new Date(end_date) };

    const logs = await ActivityLog.findAll({
      where,
      include: [
        { model: User, attributes: ['name', 'email'], as: 'User', required: false },
        { model: Listing, attributes: ['title'], as: 'Listing', required: false },
        { model: Orders, attributes: ['status'], as: 'Order', required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      type: log.type,
      category: log.category,
      message: log.message,
      details: JSON.stringify(log.details),
      user: log.User?.name || null,
      user_email: log.User?.email || null,
      listing: log.Listing?.title || null,
      order_status: log.Order?.status || null,
      ip_address: log.ip_address,
      created_at: log.created_at,
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = ['id', 'type', 'category', 'message', 'user', 'created_at'];
      const csvRows = [headers.join(',')];

      formattedLogs.forEach(log => {
        const values = headers.map(header => {
          const value = log[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });

      const csv = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=logs_${Date.now()}.csv`);
      return res.send(csv);
    }

    // Default: JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=logs_${Date.now()}.json`);
    res.json(formattedLogs);

  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

module.exports = router;