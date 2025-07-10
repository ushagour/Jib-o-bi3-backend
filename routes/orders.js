// routes/orders.js
const express = require('express');
const router = express.Router();
const Orders = require('../models/Orders');
const e = require('express');
const { Listing, User } = require('../models');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Orders.findAll(
      
      {
              include: [
              {
                model: Listing,
                attributes: ['title','id'], // Include only the file_name attribute
              },
              {
                model: User,
                attributes: ['name','email'], // Include only the name attribute
                attributes: { exclude: ["password"] }, // Exclude the password field
      
              }
            ],
      }
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});



///orders/recent
// Get recent orders
router.get('/recent', async (req, res) => {

  
  try {
    const recentOrders = await Orders.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,     
      include: [
              {
                model: Listing,
                attributes: ['title','id'], // Include only the file_name attribute
              },
              {
                model: User,
                attributes: ['name','email'], // Include only the name attribute
                attributes: { exclude: ["password"] }, // Exclude the password field
      
              }
            ],
    });
    res.json(recentOrders);
  } catch (err) {
    console.log('Error fetching recent orders:', err);
    
    res.status(500).json({ error: 'Failed to fetch recent orders' });

  }
});
// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Orders.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const { listing_id, buyer_id } = req.body;
    const order = await Orders.create({ listing_id, buyer_id });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Orders.updateStatus(req.params.id, status);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update order status' });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    await Orders.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete order' });
  }
});



module.exports = router;


