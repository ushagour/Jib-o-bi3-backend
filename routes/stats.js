const express = require('express');
const app = express();
app.use(express.json());
const router = express.Router();
const auth = require("../middleware/auth");

const { Listing, User, Category, Reviews } = require('../models');

// Helper for date range
function getMonthRange(monthOffset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { firstDay, lastDay };
}

// Apply auth middleware to all routes
router.use(auth);

router.get('/', async (req, res) => {
  try {
    // Listings
    const listingsCount = await Listing.count();
    const { firstDay: listingsFirstThis, lastDay: listingsLastThis } = getMonthRange(0);
    const { firstDay: listingsFirstPrev, lastDay: listingsLastPrev } = getMonthRange(-1);
    const listingsCurrent = await Listing.count({ where: { createdAt: { $gte: listingsFirstThis, $lte: listingsLastThis } } });
    const listingsPrevious = await Listing.count({ where: { createdAt: { $gte: listingsFirstPrev, $lte: listingsLastPrev } } });

    // Customers
    const usersCount = await User.count();
    const { firstDay: usersFirstThis, lastDay: usersLastThis } = getMonthRange(0);
    const { firstDay: usersFirstPrev, lastDay: usersLastPrev } = getMonthRange(-1);
    const usersCurrent = await User.count({ where: { createdAt: { $gte: usersFirstThis, $lte: usersLastThis } } });
    const usersPrevious = await User.count({ where: { createdAt: { $gte: usersFirstPrev, $lte: usersLastPrev } } });

    // Categories
    const categoriesCount = await Category.count();
    const { firstDay: catFirstThis, lastDay: catLastThis } = getMonthRange(0);
    const { firstDay: catFirstPrev, lastDay: catLastPrev } = getMonthRange(-1);
    const categoriesCurrent = await Category.count({ where: { createdAt: { $gte: catFirstThis, $lte: catLastThis } } });
    const categoriesPrevious = await Category.count({ where: { createdAt: { $gte: catFirstPrev, $lte: catLastPrev } } });

    // Reviews
    const reviewsCount = await Reviews.count();
    const { firstDay: revFirstThis, lastDay: revLastThis } = getMonthRange(0);
    const { firstDay: revFirstPrev, lastDay: revLastPrev } = getMonthRange(-1);
    const reviewsCurrent = await Reviews.count({ where: { createdAt: { $gte: revFirstThis, $lte: revLastThis } } });
    const reviewsPrevious = await Reviews.count({ where: { createdAt: { $gte: revFirstPrev, $lte: revLastPrev } } });

    const stats = [
      {
        title: "Listings",
        value: listingsCount,
        current: listingsCurrent,
        previous: listingsPrevious,
        changeType: "success",
        icon: "📦",
      },
      {
        title: "Customers",
        value: usersCount,
        current: usersCurrent,
        previous: usersPrevious,
        changeType: "success",
        icon: "👥",
      },
      {
        title: "Categories",
        value: categoriesCount,
        current: categoriesCurrent,
        previous: categoriesPrevious,
        changeType: "success",
        icon: "📂",
      },
      {
        title: "Reviews",
        value: reviewsCount,
        current: reviewsCurrent,
        previous: reviewsPrevious,
        changeType: "success",
        icon: "⭐",
      },
    ];
    res.status(200).json(stats);
  } catch (err) {
    console.log('Error fetching stats:', err);
    
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;