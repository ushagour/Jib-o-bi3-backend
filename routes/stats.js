const express = require('express');
const app = express();
app.use(express.json());
const router = express.Router();
const auth = require("../middleware/auth");

const { Listing, User, Orders } = require('../models');

// Apply auth middleware to all routes
router.use(auth);

router.get('/', async (req, res) => {
  try {
    // Get total counts
    const totalListings = await Listing.count();
    const totalUsers = await User.count();
    const totalOrders = await Orders.count();
    
    // Calculate total revenue from completed orders
    const orders = await Orders.findAll({
      where: { status: 'completed' },
      attributes: ['total_price']
    });
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0);

    const stats = {
      totalListings,
      totalUsers,
      totalOrders,
      totalRevenue
    };

    res.json(stats);


  } catch (err) {
    console.log('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;