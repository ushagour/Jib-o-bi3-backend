const express = require("express");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const { ActivityLog } = require("../models");

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// ============================================
// GET ACTIVITY LOGS (Admin Only)
// ============================================
router.get("/", async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    // Parse pagination parameters
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;

    const offsetParam = parseInt(req.query.offset, 10);
    const offset = Number.isInteger(offsetParam) ? Math.max(offsetParam, 0) : 0;

    // Parse category filter
    const categoryParam = typeof req.query.category === "string" ? req.query.category : "";
    const categories = categoryParam
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => ["user", "listing", "order", "system", "auth", "admin"].includes(item));

    // Parse type filter
    const typeParam = typeof req.query.type === "string" ? req.query.type : "";
    const types = typeParam
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => ["info", "warning", "error", "success", "debug"].includes(item));

    // Build where clause
    const where = {};

    // Filter by category (using the correct field name)
    if (categories.length > 0) {
      where.category = { [Op.in]: categories };
    }

    // Filter by type
    if (types.length > 0) {
      where.type = { [Op.in]: types };
    }

    // Filter by user_id
    if (req.query.user_id) {
      where.user_id = req.query.user_id;
    }

    // Filter by read status
    if (req.query.is_read !== undefined) {
      where.is_read = req.query.is_read === 'true';
    }

    // Filter by date range
    if (req.query.start_date) {
      where.created_at = where.created_at || {};
      where.created_at[Op.gte] = new Date(req.query.start_date);
    }

    if (req.query.end_date) {
      where.created_at = where.created_at || {};
      where.created_at[Op.lte] = new Date(req.query.end_date);
    }

    // Search in message
    if (req.query.search) {
      where.message = { [Op.like]: `%${req.query.search}%` };
    }

    // Determine sort order
    const sortOrder = req.query.sort === 'ASC' ? 'ASC' : 'DESC';

    // Fetch activities with count
    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      order: [["created_at", sortOrder]], // ✅ Use correct field name
      limit,
      offset,
    });

    // Format response
    const formattedLogs = rows.map(log => ({
      id: log.id,
      type: log.type,
      category: log.category,
      message: log.message,
      details: log.details,
      user_id: log.user_id,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      is_read: log.is_read,
      read_at: log.read_at,
      created_at: log.created_at,
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + rows.length < count,
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ 
      error: "Failed to fetch activity logs",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// GET ACTIVITY LOG STATISTICS
// ============================================
router.get("/stats", async (req, res) => {
  try {
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const total = await ActivityLog.count();

    const byType = await ActivityLog.findAll({
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: ['type'],
    });

    const byCategory = await ActivityLog.findAll({
      attributes: [
        'category',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: ['category'],
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
          count: parseInt(item.dataValues.count),
        })),
        byCategory: byCategory.map(item => ({
          category: item.category,
          count: parseInt(item.dataValues.count),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching log stats:", error);
    res.status(500).json({ 
      error: "Failed to fetch statistics" 
    });
  }
});

// ============================================
// GET SINGLE ACTIVITY LOG
// ============================================
router.get("/:id", async (req, res) => {
  try {
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const log = await ActivityLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({ error: "Activity log not found" });
    }

    // Mark as read when viewed
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
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        is_read: log.is_read,
        read_at: log.read_at,
        created_at: log.created_at,
      },
    });
  } catch (error) {
    console.error("Error fetching log:", error);
    res.status(500).json({ 
      error: "Failed to fetch log" 
    });
  }
});

// ============================================
// DELETE ACTIVITY LOG
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const log = await ActivityLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({ error: "Activity log not found" });
    }

    await log.destroy();

    res.json({
      success: true,
      message: "Activity log deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ 
      error: "Failed to delete log" 
    });
  }
});

// ============================================
// DELETE ALL LOGS (with retention period)
// ============================================
router.delete("/", async (req, res) => {
  try {
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { older_than_days = 30, permanent = false } = req.query;

    if (permanent === 'true') {
      // Hard delete all logs
      await ActivityLog.destroy({ where: {} });
      
      res.json({
        success: true,
        message: "All logs cleared successfully",
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

      res.json({
        success: true,
        message: `Deleted ${deleted} logs older than ${older_than_days} days`,
        deletedCount: deleted,
      });
    }
  } catch (error) {
    console.error("Error clearing logs:", error);
    res.status(500).json({ 
      error: "Failed to clear logs" 
    });
  }
});

// ============================================
// MARK LOG AS READ
// ============================================
router.put("/:id/read", async (req, res) => {
  try {
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const log = await ActivityLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({ error: "Activity log not found" });
    }

    await log.update({
      is_read: true,
      read_at: new Date(),
    });

    res.json({
      success: true,
      message: "Log marked as read",
    });
  } catch (error) {
    console.error("Error marking log as read:", error);
    res.status(500).json({ 
      error: "Failed to mark log as read" 
    });
  }
});

module.exports = router;