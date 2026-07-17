// routes/moderation.js
const express = require('express');
const router = express.Router();
const { Listing, User } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// Admin middleware - check if user is admin (simplified - check user role)
const isAdmin = async (req, res, next) => {
  try {
    // In a real app, check user role from database
    // For now, just allow authenticated users (should be admin)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Admin check failed' });
  }
};

/**
 * GET /api/moderation/flagged
 * Get all flagged listings for moderation
 */
router.get('/flagged', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = null } = req.query;
    const offset = (page - 1) * limit;

    const where = { flagged: true };
    if (status) where.moderationStatus = status;

    const { rows, count } = await Listing.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        listings: rows,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
      }
    });
  } catch (error) {
    console.error('GET /moderation/flagged error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged listings' });
  }
});

/**
 * GET /api/moderation/listings/:id
 * Get specific listing with moderation details
 */
router.get('/listings/:id', auth, isAdmin, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'status'],
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Parse flag reason if it's JSON
    let violations = [];
    if (listing.flagReason) {
      try {
        violations = JSON.parse(listing.flagReason);
      } catch (e) {
        violations = [{ message: listing.flagReason }];
      }
    }

    res.json({
      success: true,
      data: {
        ...listing.toJSON(),
        violations
      }
    });
  } catch (error) {
    console.error('GET /moderation/listings/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

/**
 * POST /api/moderation/listings/:id/approve
 * Approve a flagged listing
 */
router.post('/listings/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await listing.update({
      flagged: false,
      moderationStatus: 'approved',
      flagReason: null,
    });

    res.json({
      success: true,
      data: {
        message: 'Listing approved',
        listing
      }
    });
  } catch (error) {
    console.error('POST /moderation/listings/:id/approve error:', error);
    res.status(500).json({ error: 'Failed to approve listing' });
  }
});

/**
 * POST /api/moderation/listings/:id/block
 * Block/reject a flagged listing
 */
router.post('/listings/:id/block', auth, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason for blocking is required' });
    }

    const listing = await Listing.findByPk(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await listing.update({
      flagged: true,
      moderationStatus: 'blocked',
      flagReason: reason,
    });

    res.json({
      success: true,
      data: {
        message: 'Listing blocked',
        listing
      }
    });
  } catch (error) {
    console.error('POST /moderation/listings/:id/block error:', error);
    res.status(500).json({ error: 'Failed to block listing' });
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const total = await Listing.count();
    const flagged = await Listing.count({ where: { flagged: true } });
    const blocked = await Listing.count({ where: { moderationStatus: 'blocked' } });
    const approved = await Listing.count({ where: { moderationStatus: 'approved' } });

    // Get fraud score distribution
    const highRisk = await Listing.count({ where: { fraudScore: { [Op.gte]: 70 } } });
    const mediumRisk = await Listing.count({ where: { fraudScore: { [Op.between]: [40, 69] } } });
    const lowRisk = await Listing.count({ where: { fraudScore: { [Op.lt]: 40 } } });

    res.json({
      success: true,
      data: {
        totalListings: total,
        stats: {
          flagged,
          blocked,
          approved,
        },
        riskDistribution: {
          highRisk,
          mediumRisk,
          lowRisk,
        }
      }
    });
  } catch (error) {
    console.error('GET /moderation/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation stats' });
  }
});

/**
 * GET /api/moderation/search
 * Search flagged listings by keyword or violation
 */
router.get('/search', auth, isAdmin, async (req, res) => {
  try {
    const { keyword, violation, minScore = 0 } = req.query;
    const where = {
      flagged: true,
      fraudScore: { [Op.gte]: parseInt(minScore) }
    };

    // Search by keyword in title/description
    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // Filter by violation type
    if (violation) {
      where.flagReason = { [Op.like]: `%"category":"${violation}"%` };
    }

    const listings = await Listing.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        }
      ],
      order: [['fraudScore', 'DESC']],
      limit: 50,
    });

    res.json({
      success: true,
      data: {
        results: listings,
        count: listings.length
      }
    });
  } catch (error) {
    console.error('GET /moderation/search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
