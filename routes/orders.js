// routes/orders.js
const express = require('express');
const router = express.Router();
const Orders = require('../models/Orders');
const { Listing, User, Notification, Image } = require('../models');
const auth = require("../middleware/auth");
const listingMapper = require('../mappers/listings');
const { notifyUser } = require('../utilities/notificationService');

const VALID_ORDER_STATUSES = ['pending', 'completed', 'cancelled'];

// Helper function to map orders with mapped listings
const mapOrders = (orders) => {
  const isArray = Array.isArray(orders);
  const orderList = isArray ? orders : [orders];
  
  const mapped = orderList.map(order => ({
    ...order.toJSON(),
    Listing: order.Listing ? listingMapper(order.Listing) : null,
  }));
  
  return isArray ? mapped : mapped[0];
};

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Orders.findAll({
      include: [
        {
          model: Listing,
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
            {
              model: User,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });
    res.json(mapOrders(orders));
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
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
            {
              model: User,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });
    res.json(mapOrders(recentOrders));
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
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
            {
              model: User,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    res.json(mapOrders(order));
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

    // Get the listing to find the seller
    const listing = await Listing.findByPk(listing_id, {
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get buyer info
    const buyer = await User.findByPk(buyer_id, {
      attributes: ['id', 'name'],
    });

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

    // Create notification for the seller (listing owner)
    if (listing.User && listing.User.id !== buyer_id) {
      try {
        await notifyUser({
          userId: listing.User.id,
          actorId: buyer_id,
          listingId: listing_id,
          type: 'order',
          title: 'New Order Request - Pending',
          content: `${buyer?.name || 'A buyer'} placed an order for "${listing.title}" - Qty: ${quantity}, Total: ${normalizedTotalPrice}. Order is pending approval.`,
          data: {
            orderId: order.id,
            orderStatus: 'pending',
          },
        });
      } catch (notificationError) {
        console.error('Error creating seller notification:', notificationError);
      }
    }

    // Notify the buyer that their order is pending
    try {
      await notifyUser({
        userId: buyer_id,
        actorId: listing.User?.id,
        listingId: listing_id,
        type: 'order',
        title: 'Order Placed - Pending',
        content: `Your order for "${listing.title}" has been placed and is pending approval from the seller.`,
        data: {
          orderId: order.id,
          orderStatus: 'pending',
        },
      });
    } catch (notificationError) {
      console.error('Error creating buyer notification:', notificationError);
    }

    // Fetch order with images for response
    const createdOrder = await Orders.findByPk(order.id, {
      include: [
        {
          model: Listing,
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
            {
              model: User,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    res.status(201).json(mapOrders(createdOrder));
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

    const order = await Orders.findByPk(req.params.id, {
      include: [
        {
          model: Listing,
          attributes: ['id', 'title', 'user_id'],
          include: [{ model: User, attributes: ['id', 'name'] }],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    await order.update({ status });

    if (status === 'completed') {
      await Listing.update(
        { status: 'selled' },
        { where: { id: order.listing_id } }
      );
    }

    // Send notifications for status changes
    const statusMessages = {
      pending: `Your order for "${order.Listing.title}" is pending approval from the seller.`,
      completed: `Your order for "${order.Listing.title}" has been completed! Thank you for your purchase.`,
      cancelled: `Your order for "${order.Listing.title}" has been cancelled. Please contact the seller for details.`,
    };

    const sellerStatusMessages = {
      pending: `New order pending: "${order.Listing.title}" from ${order.User?.name || 'a buyer'}. Qty: ${order.quantity}`,
      completed: `Order #${order.id} for "${order.Listing.title}" has been completed.`,
      cancelled: `Order #${order.id} for "${order.Listing.title}" has been cancelled.`,
    };

    // Notify buyer about status change
    if (oldStatus !== status) {
      try {
        await notifyUser({
          userId: order.buyer_id,
          actorId: order.Listing.user_id,
          listingId: order.listing_id,
          type: 'order',
          title: `Order Status Updated - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          content: statusMessages[status] || `Order status updated to ${status}`,
          data: {
            orderId: order.id,
            orderStatus: status,
            previousStatus: oldStatus,
          },
        });
      } catch (notificationError) {
        console.error('Error notifying buyer of status change:', notificationError);
      }

      // Also notify seller about status change
      try {
        await notifyUser({
          userId: order.Listing.user_id,
          actorId: order.buyer_id,
          listingId: order.listing_id,
          type: 'order',
          title: `Order Status Changed - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          content: sellerStatusMessages[status] || `Order status changed to ${status}`,
          data: {
            orderId: order.id,
            orderStatus: status,
            previousStatus: oldStatus,
          },
        });
      } catch (notificationError) {
        console.error('Error notifying seller of status change:', notificationError);
      }
    }

    // Fetch updated order with images for response
    const updatedOrder = await Orders.findByPk(order.id, {
      include: [
        {
          model: Listing,
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
            {
              model: User,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    res.json(mapOrders(updatedOrder));
  } catch (err) {
    console.error('🔴 Update error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    res.status(400).json({ error: err.message || 'Failed to update order status' });
  }
});

// Report an order issue (buyer can report only once per order)
router.post('/:id/report', auth, async (req, res) => {
  try {
    const reporterId = req.user?.userId || req.user?.id;
    const reason = String(req.body?.reason || '').trim();

    if (!reason) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

    const order = await Orders.findByPk(req.params.id, {
      include: [
        {
          model: Listing,
          attributes: ['id', 'title', 'user_id'],
          include: [{ model: User, attributes: ['id', 'name'] }],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!reporterId || String(order.buyer_id) !== String(reporterId)) {
      return res.status(403).json({ error: 'Only the buyer can report this order' });
    }

    if (order.hasReported) {
      return res.status(409).json({ error: 'Order has already been reported' });
    }

    await order.update({
      hasReported: true,
      reportReason: reason,
      reportedAt: new Date(),
      reportedBy: reporterId,
    });

    if (order.Listing?.user_id && String(order.Listing.user_id) !== String(reporterId)) {
      try {
        await notifyUser({
          userId: order.Listing.user_id,
          actorId: reporterId,
          listingId: order.listing_id,
          type: 'order',
          title: 'Order Issue Reported',
          content: `A buyer reported an issue for order #${order.id} on "${order.Listing.title}".`,
          data: {
            orderId: order.id,
            reason,
          },
        });
      } catch (notificationError) {
        console.error('Error notifying seller of report:', notificationError);
      }
    }

    const updatedOrder = await Orders.findByPk(order.id, {
      include: [
        {
          model: Listing,
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
            {
              model: User,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Order reported successfully',
      order: mapOrders(updatedOrder),
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to report order' });
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

// Confirm and complete an order
router.post('/:orderId/confirm-checkout', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Orders.findByPk(orderId, {
      include: [
        {
          model: Listing,
          include: [
            {
              model: Image,
              attributes: ['id', 'file_name'],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.Listing.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not the owner of this listing.' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Order is already completed.' });
    }

    // Update order and listing status
    await order.update({ status: 'completed' });
    await Listing.update(
      { status: 'selled' },
      { where: { id: order.listing_id } }
    );

    // Create notification for the buyer
    await Notification.create({
      user_id: order.buyer_id,
      actor_id: userId,
      listing_id: order.listing_id,
      type: 'order_completed',
      title: 'Order Completed!',
      content: `Your order for "${order.Listing.title}" has been completed by the seller.`,
    });

    res.json({ success: true, message: 'Order completed successfully.' });
  } catch (err) {
    console.error('🔴 Order completion error:', err);
    res.status(500).json({ error: 'Failed to complete order.' });
  }
});

//mobile users close orders
router.post('/orders/:id/close', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Update order to closed
    await Order.update(
      { 
        is_closed: true, 
        closed_at: new Date(),
        closed_by: req.user.id 
      },
      { where: { id: orderId } }
    );
    
    res.json({ success: true, message: 'Order closed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
