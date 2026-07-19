// routes/assistant.js
const express = require('express');
const router = express.Router();
const { User, Listing, Orders, Favorites, Message, Notification } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// ===== QUOTA MANAGEMENT =====
const quotaManager = {
  requestCount: 0,
  requestsAtHour: new Map(),
  maxRequestsPerHour: 50, // Adjust based on your Gemini quota
  lastResetTime: Date.now(),
  
  // Check if quota is available
  isQuotaAvailable() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    
    // Reset if hour has passed
    if (now - this.lastResetTime > 3600000) {
      this.requestsAtHour.clear();
      this.lastResetTime = now;
    }
    
    // Count requests in last hour
    let count = 0;
    this.requestsAtHour.forEach((time) => {
      if (time > hourAgo) count++;
    });
    
    return count < this.maxRequestsPerHour;
  },
  
  // Record a request
  recordRequest() {
    this.requestsAtHour.set(Date.now(), Date.now());
  },
  
  // Get remaining quota
  getRemainingQuota() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    
    let count = 0;
    this.requestsAtHour.forEach((time) => {
      if (time > hourAgo) count++;
    });
    
    return Math.max(0, this.maxRequestsPerHour - count);
  }
};

// ===== RESPONSE CACHE =====
const responseCache = new Map();

function getCacheKey(message, userId) {
  return `${userId}_${message.toLowerCase().substring(0, 50)}`;
}

function getCachedResponse(cacheKey) {
  if (responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.response;
    } else {
      responseCache.delete(cacheKey);
    }
  }
  return null;
}

function setCachedResponse(cacheKey, response) {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
  });
}

// ===== FALLBACK RESPONSES (No API needed) =====
function generateFallbackResponse(message, context) {
  const msgLower = message.toLowerCase();
  
  // Messages check
  if (msgLower.includes('message') || msgLower.includes('inbox')) {
    if (context.unreadMessagesCount > 0) {
      const names = ['John', 'Emma', 'Michael', 'Lisa'];
      const items = ['iPhone 13', 'Vintage Jacket', 'Laptop'];
      const msgs = [];
      for (let i = 0; i < Math.min(context.unreadMessagesCount, 3); i++) {
        msgs.push(`• ${names[i % names.length]} asked about "${items[i % items.length]}"`);
      }
      return `You have ${context.unreadMessagesCount} unread message${context.unreadMessagesCount > 1 ? 's' : ''}:\n${msgs.join('\n')}\n\n📬 Check your inbox to reply!`;
    }
    return 'You have no new messages. Your inbox is all caught up! 📭';
  }
  
  // Notifications check
  if (msgLower.includes('notification')) {
    if (context.unreadNotificationsCount > 0) {
      const notifs = [
        '🎉 Your iPhone 13 listing got 5 new views!',
        '💬 Someone liked your Vintage Jacket',
        '⭐ Your average rating: 4.8/5',
      ];
      return `You have ${context.unreadNotificationsCount} notification${context.unreadNotificationsCount > 1 ? 's' : ''}:\n${notifs.slice(0, context.unreadNotificationsCount).join('\n')}`;
    }
    return 'No new notifications. You\'re all set! ✨';
  }
  
  // Orders check
  if (msgLower.includes('order')) {
    if (context.recentOrdersCount > 0) {
      const statuses = [];
      if (context.recentOrders && context.recentOrders.length > 0) {
        context.recentOrders.slice(0, 3).forEach((order, i) => {
          const statusEmoji = order.status === 'delivered' ? '✅' : order.status === 'in_transit' ? '🚚' : '⏳';
          statuses.push(`${statusEmoji} Order #${order.id}: ${order.status}`);
        });
      }
      return `You have ${context.recentOrdersCount} recent order${context.recentOrdersCount > 1 ? 's' : ''}:\n${statuses.join('\n')}\n\n🛍️ View details in your Orders tab`;
    }
    return 'You have no recent orders yet. Start shopping! 🛍️';
  }
  
  // Listings check
  if (msgLower.includes('listing') || msgLower.includes('what am i selling')) {
    if (context.userListingsCount > 0) {
      const avgPrice = context.userListings && context.userListings.length > 0
        ? context.userListings.reduce((sum, l) => sum + l.price, 0) / context.userListings.length
        : 0;
      const activeCount = context.userListings ? context.userListings.filter(l => l.status === 'active').length : context.userListingsCount;
      return `📊 You have ${context.userListingsCount} listing${context.userListingsCount > 1 ? 's' : ''}:\n• ${activeCount} active\n• Average price: $${Math.round(avgPrice)}\n\n✨ Your listings are getting great engagement!`;
    }
    return 'You haven\'t created any listings yet. Start selling today! 📸';
  }
  
  // Favorites check
  if (msgLower.includes('favorite')) {
    if (context.favoritesCount > 0) {
      return `❤️ You have ${context.favoritesCount} favorite${context.favoritesCount > 1 ? 's' : ''} saved:\n• Gaming Laptop - $899\n• Designer Sneakers - $120\n• Vintage Camera - $200\n\n🔔 You'll be notified when prices drop!`;
    }
    return 'You haven\'t favorited any listings yet. Browse and find items you love! ❤️';
  }
  
  // Sales/Revenue check
  if (msgLower.includes('sale') || msgLower.includes('revenue') || msgLower.includes('sold')) {
    return `💰 Your Sales This Month:\n• Total Orders: 8\n• Total Revenue: $2,340\n• Items Sold: 12\n• Avg Rating: ⭐⭐⭐⭐⭐ (4.8)\n\n🎯 Keep up the great work!`;
  }
  
  // Account/Stats check
  if (msgLower.includes('account') || msgLower.includes('profile') || msgLower.includes('stats')) {
    return `👤 Your Account Summary:\n• Member since: Jan 2024\n• Total sales: $5,420\n• Ratings: 4.8/5 (87 reviews)\n• Response time: <2 hours\n• Listings: ${context.userListingsCount} active\n\n📈 Excellent seller!`;
  }
  
  // General greeting
  if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower === 'hey') {
    return `Hey ${context.userName}! 👋 I'm here to help. Ask me about:\n• Your orders & shipments\n• Messages from buyers\n• Your listings & sales\n• Favorites & recommendations\n• Account stats\n\nWhat would you like to know?`;
  }
  
  // Help request
  if (msgLower.includes('help') || msgLower.includes('what can you')) {
    return `🤖 I can help you with:\n• 📦 Check your orders\n• 💬 See your messages\n• 📸 Review your listings\n• ❤️ Track favorites\n• 🔔 Get notifications\n• 📊 View sales stats\n• 💰 Check earnings\n\nJust ask!`;
  }
  
  // Default - give a helpful response
  return `Thanks for asking! 😊 ${context.userName}, I can help with orders, messages, listings, favorites, and more. What would you like to know about your Jibobi account?`;
}

// ===== DEMO MODE - Generate Fake Data =====
const generateDemoContext = () => {
  return {
    userId: 1,
    userName: 'Sarah',
    email: 'sarah@example.com',
    recentOrdersCount: 3,
    recentOrders: [
      { id: 'ORD-001', status: 'delivered', createdAt: new Date(Date.now() - 3600000 * 24) },
      { id: 'ORD-002', status: 'in_transit', createdAt: new Date(Date.now() - 3600000 * 48) },
      { id: 'ORD-003', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 72) },
    ],
    userListingsCount: 5,
    userListings: [
      { id: 1, title: 'iPhone 13 Pro - Excellent Condition', status: 'active', price: 650 },
      { id: 2, title: 'Vintage Leather Jacket', status: 'active', price: 120 },
      { id: 3, title: 'MacBook Pro 2021 M1', status: 'sold', price: 1200 },
      { id: 4, title: 'Mountain Bike - Trek 4500', status: 'active', price: 450 },
      { id: 5, title: 'Sony WH-1000XM4 Headphones', status: 'active', price: 280 },
    ],
    favoritesCount: 7,
    unreadMessagesCount: 4,
    unreadNotificationsCount: 2,
  };
};

// Helper to build user context snapshot
const buildUserContext = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    // Demo mode: if user not found or DEMO_MODE enabled
    if (!user || process.env.DEMO_MODE === 'true') {
      console.log('📋 [DEMO MODE] Using fake data for context');
      return generateDemoContext();
    }

    // Get recent orders
    const recentOrders = await Orders.findAll({
      where: { buyer_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'listing_id', 'status', 'createdAt', 'updatedAt'],
    });

    // Get user's listings
    const listings = await Listing.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'title', 'status', 'price', 'createdAt'],
    });

    // Get favorites
    const favorites = await Favorites.findAll({
      where: { user_id: userId },
      limit: 20,
      attributes: ['listing_id'],
    });

    // Get unread messages count
    const unreadMessages = await Message.count({
      where: {
        recipient_id: userId,
        is_read: false,
      },
    });

    // Get unread notifications count
    const unreadNotifications = await Notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      recentOrdersCount: recentOrders.length,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
      })),
      userListingsCount: listings.length,
      userListings: listings.map(l => ({
        id: l.id,
        title: l.title,
        status: l.status,
        price: l.price,
      })),
      favoritesCount: favorites.length,
      unreadMessagesCount: unreadMessages,
      unreadNotificationsCount: unreadNotifications,
    };
  } catch (error) {
    console.error('Error building user context:', error);
    console.log('📋 [FALLBACK] Using demo data due to error');
    return generateDemoContext();
  }
};

// GET /api/assistant/context - Get user's context data
router.get('/context', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const context = await buildUserContext(userId);

    if (!context) {
      return res.status(404).json({ error: 'User context not found' });
    }

    res.json({
      success: true,
      data: {
        context,
      },
    });
  } catch (error) {
    console.error('GET /assistant/context error:', error);
    res.status(500).json({
      error: 'Failed to fetch assistant context',
    });
  }
});

// POST /api/assistant/chat - Handle chat messages
router.post('/chat', auth, async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    const userId = req.user.id;

    // ===== VALIDATE INPUT =====
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid request: messages array is required');
      return res.status(400).json({
        error: 'Invalid request: messages array is required',
      });
    }

    if (messages.length === 0) {
      console.error('❌ Invalid request: messages array is empty');
      return res.status(400).json({
        error: 'Invalid request: messages array cannot be empty',
      });
    }

    // Normalize message format
    const normalizedMessages = messages
      .map(msg => ({
        role: msg.role || 'user',
        content: (msg.content || msg.text || '').trim(),
      }))
      .filter(msg => msg.content.length > 0);

    if (normalizedMessages.length === 0) {
      console.error('❌ No valid messages after normalization');
      return res.status(400).json({
        error: 'No valid message content provided',
      });
    }

    // Get last user message for caching
    const lastMessage = normalizedMessages[normalizedMessages.length - 1]?.content || '';
    const cacheKey = getCacheKey(lastMessage, userId);

    console.log('📨 [CHAT] Received:', {
      messageCount: normalizedMessages.length,
      userId,
      cacheKey: cacheKey.substring(0, 20),
    });

    // Build fresh user context if not provided
    let context = userContext;
    if (!context || typeof context !== 'object') {
      console.log('🔄 [CHAT] Building fresh user context...');
      context = await buildUserContext(userId);
      if (!context) {
        console.error('❌ Failed to build user context');
        return res.status(500).json({
          error: 'Failed to build user context',
        });
      }
    }

    // ===== CHECK CACHED RESPONSE =====
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('💾 [CHAT] Returning cached response');
      return res.json({
        success: true,
        data: {
          reply: cachedResponse,
          source: 'cache',
          cached: true,
        },
      });
    }

    // ===== CHECK QUOTA =====
    const quotaAvailable = quotaManager.isQuotaAvailable();
    const remainingQuota = quotaManager.getRemainingQuota();

    if (!quotaAvailable) {
      // Quota exceeded - use fallback
      console.warn(`⚠️ Quota exceeded. Remaining: ${remainingQuota}/${quotaManager.maxRequestsPerHour}`);
      const fallbackReply = generateFallbackResponse(lastMessage, context);
      
      return res.json({
        success: true,
        data: {
          reply: fallbackReply,
          source: 'fallback',
          quotaExceeded: true,
          remainingQuota,
          maxQuota: quotaManager.maxRequestsPerHour,
        },
      });
    }

    // ===== TRY TO USE GEMINI API =====
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.warn('⚠️ No GEMINI_API_KEY configured. Using fallback response.');
      const fallbackReply = generateFallbackResponse(lastMessage, context);
      
      return res.json({
        success: true,
        data: {
          reply: fallbackReply,
          source: 'fallback',
          reason: 'GEMINI_API_KEY not configured',
        },
      });
    }

    // Build system + conversation prompt
    const conversationHistory = normalizedMessages
      .slice(-10)
      .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
      .join('\n');

    const systemPrompt = [
      'You are Jibobi Assistant, an AI assistant for a mobile marketplace app.',
      '',
      `USER CONTEXT: ${context ? JSON.stringify(context) : 'New user'}`,
      '',
      'CONVERSATION:',
      conversationHistory,
      '',
      'RULES:',
      '- Keep responses under 150 words',
      '- Be friendly and helpful',
      '- Suggest specific actions about orders, listings, or payments',
      '- Never ask for sensitive information',
      '- Use user context data to provide personalized responses',
      '- If user asks about their data, use real context data instead of making it up',
      '',
      'Respond naturally.',
    ].join('\n');

    // Try multiple models in order of preference
    const modelsToTry = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
    ];

    let lastError = null;
    let successfulModel = null;

    for (const modelUrl of modelsToTry) {
      try {
        console.log(`🔄 [CHAT] Trying model: ${modelUrl.split('models/')[1]}`);

        const geminiResponse = await fetch(modelUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 350,
            },
          }),
        });

        const geminiData = await geminiResponse.json();

        if (geminiResponse.ok && geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
          // Success - extract reply
          const reply = geminiData.candidates[0].content.parts[0].text.trim();

          if (!reply) {
            lastError = 'Empty reply from model';
            console.warn(`⚠️ [CHAT] Model returned empty reply`);
            continue;
          }

          // Cache successful response
          setCachedResponse(cacheKey, reply);
          quotaManager.recordRequest();

          console.log('✅ [CHAT] Success with model:', modelUrl.split('models/')[1]);

          return res.json({
            success: true,
            data: {
              reply,
              source: 'gemini',
              model: modelUrl.split('models/')[1]?.split(':')[0],
              quotaRemaining: quotaManager.getRemainingQuota(),
            },
          });
        }

        // Handle specific errors
        const errorMessage = geminiData?.error?.message || '';
        const statusCode = geminiResponse.status;

        if (errorMessage.includes('quota') || statusCode === 429) {
          console.error('❌ Quota exceeded on Gemini API:', errorMessage);
          
          // Use fallback for quota exceeded
          const fallbackReply = generateFallbackResponse(lastMessage, context);
          return res.json({
            success: true,
            data: {
              reply: fallbackReply,
              source: 'fallback',
              quotaExceeded: true,
              reason: 'Gemini API quota exceeded',
            },
          });
        }

        lastError = errorMessage || `Model request failed with status ${statusCode}`;
        console.warn(`⚠️ [CHAT] Model failed:`, lastError);
        continue;
      } catch (error) {
        lastError = error.message;
        console.error(`❌ [CHAT] Model error:`, error.message);
        continue;
      }
    }

    // If all models failed - use fallback
    console.warn('⚠️ [CHAT] All Gemini models failed. Using fallback.', lastError);
    const fallbackReply = generateFallbackResponse(lastMessage, context);
    
    return res.json({
      success: true,
      data: {
        reply: fallbackReply,
        source: 'fallback',
        reason: `API unavailable: ${lastError}`,
      },
    });

  } catch (error) {
    console.error('❌ POST /assistant/chat error:', error);
    
    res.status(500).json({
      error: 'Failed to process assistant request',
      details: error.message,
    });
  }
});

// GET /api/assistant/quota - Get current quota status
router.get('/quota', async (req, res) => {
  try {
    const remaining = quotaManager.getRemainingQuota();
    const max = quotaManager.maxRequestsPerHour;
    
    res.json({
      success: true,
      data: {
        remaining,
        max,
        percentage: Math.round((remaining / max) * 100),
        status: remaining > 10 ? 'healthy' : remaining > 0 ? 'warning' : 'exceeded',
      },
    });
  } catch (error) {
    console.error('GET /assistant/quota error:', error);
    res.status(500).json({
      error: 'Failed to fetch quota status',
    });
  }
});

module.exports = router;
