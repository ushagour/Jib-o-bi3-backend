const express = require('express');
const app = express();
app.use(express.json());
const router = express.Router();
const auth = require("../middleware/auth");
const { Sequelize } = require('sequelize');

const { Listing, User, Orders, Reviews } = require('../models');

// Apply auth middleware to all routes
router.use(auth);

router.get('/', async (req, res) => {
  try {
    // Get total counts
    const totalListings = await Listing.count();
    const totalUsers = await User.count();
    const totalOrders = await Orders.count();
    
    // Get top listings based on average review ratings
    const topListings = await Listing.findAll({
      include: [{
        model: Reviews,
        attributes: []
      },
    ],
      attributes: [
        'id',
        'title',
        'price'
        ,
        [Sequelize.fn('AVG', Sequelize.col('Reviews.rating')), 'avgRating'],
        [Sequelize.fn('COUNT', Sequelize.col('Reviews.id')), 'reviewCount']
      ],
      group: ['Listing.id'],
      order: [[Sequelize.literal('avgRating'), 'DESC']],
      having: Sequelize.where(Sequelize.fn('COUNT', Sequelize.col('Reviews.id')), '>', 0),
      limit: 5,
      subQuery: false,
      raw: true
    });
    
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
      totalRevenue,
      topListings
    };

    res.json(stats);


  } catch (err) {
    console.log('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;