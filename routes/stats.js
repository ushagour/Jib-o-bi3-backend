const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth");
const { Sequelize } = require('sequelize');

const { Listing, User, Orders, Reviews } = require('../models');

// Apply auth middleware to all routes
// router.use(auth);

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

// Get total users
router.get('/total-users', async (req, res) => {
  try {
    const totalUsers = await User.count();
    res.json({ totalUsers });
  } catch (err) {
    console.log('Error fetching total users:', err);
    res.status(500).json({ error: 'Failed to fetch total users' });
  }
});

// Get total listings
router.get('/total-listings', async (req, res) => {
  try {
    const totalListings = await Listing.count();
    res.json({ totalListings });
  } catch (err) {
    console.log('Error fetching total listings:', err);
    res.status(500).json({ error: 'Failed to fetch total listings' });
  }
});

// Get total orders
router.get('/total-orders', async (req, res) => {
  try {
    const totalOrders = await Orders.count();
    res.json({ totalOrders });
  } catch (err) {
    console.log('Error fetching total orders:', err);
    res.status(500).json({ error: 'Failed to fetch total orders' });
  }
});

// Get total revenue from completed orders
router.get('/total-revenue', async (req, res) => {
  try {
    const orders = await Orders.findAll({
      where: { status: 'completed' },
      attributes: ['total_price']
    });
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0);
    res.json({ totalRevenue });
  } catch (err) {
    console.log('Error fetching total revenue:', err);
    res.status(500).json({ error: 'Failed to fetch total revenue' });
  }
});

// Get recent orders
router.get('/recent-orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recentOrders = await Orders.findAll({
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Listing, attributes: ['id', 'title', 'price'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      raw: false
    });
    res.json({ recentOrders });
  } catch (err) {
    console.log('Error fetching recent orders:', err);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// Get top listings based on average review ratings
router.get('/top-listings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const topListings = await Listing.findAll({
      include: [{
        model: Reviews,
        attributes: []
      }],
      attributes: [
        'id',
        'title',
        'price',
        [Sequelize.fn('AVG', Sequelize.col('Reviews.rating')), 'avgRating'],
        [Sequelize.fn('COUNT', Sequelize.col('Reviews.id')), 'reviewCount']
      ],
      group: ['Listing.id'],
      order: [[Sequelize.literal('avgRating'), 'DESC']],
      having: Sequelize.where(Sequelize.fn('COUNT', Sequelize.col('Reviews.id')), '>', 0),
      limit,
      subQuery: false,
      raw: true
    });
    res.json({ topListings });
  } catch (err) {
    console.log('Error fetching top listings:', err);
    res.status(500).json({ error: 'Failed to fetch top listings' });
  }
});

module.exports = router;