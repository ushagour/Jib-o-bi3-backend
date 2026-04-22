// routes/orders.js
const express = require('express');
const router = express.Router();
const Orders = require('../models/Orders');
const { Listing, User } = require('../models');
const auth = require("../middleware/auth");

const VALID_ORDER_STATUSES = ['pending', 'completed', 'cancelled'];

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Orders.findAll({
      include: [
        {
          model: Listing,
          attributes: ['title', 'id'],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get recent orders
router.get('/recent', async (req, res) => {
  try {
    const recentOrders = await Orders.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Listing,
          attributes: ['title', 'id'],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });
    res.json(recentOrders);
  } catch (err) {
    console.log('Error fetching recent orders:', err);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// Get count of completed orders for a specific user
router.get('/completed-count/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const count = await Orders.count({
      where: {
        buyer_id: userId,
        status: 'completed',
      },
    });
    res.json({ userId, completedOrders: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed orders count' });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Orders.findByPk(req.params.id, {
      include: [
        {
          model: Listing,
          attributes: ['title', 'id'],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const {
      listing_id,
      buyer_id,
      total_price,
      total_amount,
      quantity,
      payment_method,
      payment_status,
      shipping_address,
      phone,
      notes,
    } = req.body;

    const normalizedTotalPrice = total_price ?? total_amount;

    if (!listing_id || !buyer_id || normalizedTotalPrice == null) {
      return res.status(400).json({
        error: 'listing_id, buyer_id, and total_price are required',
      });
    }

    const order = await Orders.create({
      listing_id,
      buyer_id,
      total_price: normalizedTotalPrice,
      quantity,
      payment_method,
      payment_status,
      shipping_address,
      phone,
      notes,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${VALID_ORDER_STATUSES.join(', ')}`,
      });
    }

    const order = await Orders.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await order.update({ status });
    res.json(order);
  } catch (err) {
    console.error('🔴 Update error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    res.status(400).json({ error: err.message || 'Failed to update order status' });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const deletedRows = await Orders.destroy({ where: { id: req.params.id } });

    if (!deletedRows) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to delete order' });
  }
});

module.exports = router;
