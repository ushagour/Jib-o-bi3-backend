// utilities/contentModeration.js

// Translation keys for error messages
const FRAUD_TRANSLATION_KEYS = {
  PROHIBITED_WEAPONS: 'moderation.error.prohibited_weapons',
  PROHIBITED_DRUGS: 'moderation.error.prohibited_drugs',
  PROHIBITED_COUNTERFEIT: 'moderation.error.prohibited_counterfeit',
  PROHIBITED_SCAM: 'moderation.error.prohibited_scam',
  PROHIBITED_HATE: 'moderation.error.prohibited_hate',
  PROHIBITED_SEXUAL: 'moderation.error.prohibited_sexual',
  PROHIBITED_FRAUD: 'moderation.error.prohibited_fraud',
  PROHIBITED_MINORS: 'moderation.error.prohibited_minors',
  SUSPICIOUS_PATTERNS: 'moderation.error.suspicious_patterns',
  ANOMALOUS_PRICE: 'moderation.error.anomalous_price',
  EMPTY_DESCRIPTION: 'moderation.error.empty_description',
  SUSPICIOUS_ACTIVITY: 'moderation.error.suspicious_activity',
  RAPID_LISTING_CREATION: 'moderation.error.rapid_listing_creation',
  DUPLICATE_LISTING: 'moderation.error.duplicate_listing',
  SPAM_DETECTED: 'moderation.error.spam_detected'
};

// Comprehensive list of prohibited keywords and patterns
const PROHIBITED_KEYWORDS = {
  weapons: [
    'bomb', 'explosive', 'dynamite', 'grenade', 'missile', 'rocket', 'gun', 'rifle',
    'pistol', 'handgun', 'shotgun', 'ammunition', 'ammo', 'weapon', 'firearm',
    'assault rifle', 'sniper', 'ak-47', 'ak47', 'm16', 'uzi', 'ak', 'atf',
    'knife blade', 'blade weapon', 'poison', 'toxin', 'venom', 'lethal',
    'explosives for sale', 'illegal weapons', 'ghost gun', 'untraceable'
  ],
  drugs: [
    'cocaine', 'heroin', 'methamphetamine', 'meth', 'fentanyl', 'xanax', 'oxycontin',
    'oxycodone', 'xanax', 'marijuana', 'weed', 'cannabis', 'lsd', 'mdma', 'ecstasy',
    'molly', 'crack', 'crystal meth', 'substance', 'narcotic', 'opiate', 'pill',
    'controlled substance', 'pharmaceutical', 'prescription', 'rx only', 'illegal drug',
    'oxy', 'percs', 'bars', 'molly', 'acid', 'psilocybin', 'ketamine', 'ghb'
  ],
  counterfeits: [
    'counterfeit', 'fake', 'replica', 'knockoff', 'copy', 'imitation', 'forged',
    'stolen', 'bootleg', 'pirated', 'unlicensed', 'unauthorized', 'grey market',
    'not authentic', 'chinese knockoff', 'super fake', 'duped', 'not genuine'
  ],
  scam: [
    'advance payment', 'wire transfer', 'western union', 'moneyram', 'money transfer',
    'bitcoin', 'crypto', 'gift card', 'itunes card', 'amazon card', 'payment guarantee',
    'work from home', 'easy money', 'fast cash', 'guaranteed', 'no risk', 'nigerian',
    'prince', 'inheritance', 'lottery', 'jackpot', 'you won', 'congratulations',
    'claim now', 'verify account', 'confirm identity', 'update payment', 'click here',
    'money wiring', 'upfront payment', 'no questions asked', 'no verification'
  ],
  hate: [
    'racist', 'racism', 'sexist', 'sexism', 'homophobic', 'homophobia', 'transphobic',
    'islamophobic', 'antisemitic', 'bigot', 'supremacist', 'nazi', 'klan', 'white power',
    'slur', 'derogatory', 'offensive', 'degrading', 'discrimination'
  ],
  sexual: [
    'sex', 'xxx', 'porn', 'pornography', 'adult', 'nude', 'naked', 'explicit',
    'erotic', 'sexual', 'escort', 'prostitute', 'trafficking', 'abuse',
    'webcam sex', 'adult content', 'x-rated'
  ],
  fraud: [
    'phishing', 'malware', 'ransomware', 'trojan', 'virus', 'worm', 'botnet',
    'ddos', 'hacking', 'hacked account', 'credentials', 'password', 'ssn',
    'social security', 'credit card', 'paypal account', 'bank account', 'routing number',
    'account takeover', 'stolen data', 'leaked info'
  ],
  minors: [
    'child', 'minor', 'infant', 'baby', 'toddler', 'children', 'underage',
    'pedo', 'pedophile', 'child abuse', 'cp', 'csam', 'children for sale'
  ]
};

// Patterns for additional detection
const SUSPICIOUS_PATTERNS = [
  /\b(click here|buy now|order today|act fast|limited time|call now|contact us)\b/gi,
  /\b(free money|easy cash|work from home|make money fast|guaranteed income)\b/gi,
  /\b(nigerian|prince|inheritance|lottery|jackpot)\b/gi,
  /\b(bitcoin|crypto|ethereum|payment in crypto)\b/gi,
  /\b(western union|wire transfer|money transfer|gift card)\b/gi,
  /\b(dm for details|message for price|text for info|whatsapp only)\b/gi,
  /\b(urgent|hurry|asap|immediate|today only)\b/gi,
  /\b(no questions|no verification|no checks|bypass|avoid|skip verification)\b/gi,
  /\b(buy followers|buy likes|buy views|followers for sale|boost account)\b/gi,
  /\b(reseller|wholesale|drop shipping|supplier)\b/gi,
  /\b(item not in hand|will ship when paid|pics not mine)\b/gi,
];

// Spam detection patterns
const SPAM_PATTERNS = [
  /(.)\1{4,}/g, // 5+ repeated characters (e.g., "aaaaaa")
  /[A-Z]{5,}/g, // 5+ consecutive capital letters
];

// Combine all keywords into one searchable list
const ALL_PROHIBITED = Object.values(PROHIBITED_KEYWORDS).flat();

/**
 * Check if text contains prohibited content
 * @param {string} text - Text to check
 * @returns {object} - { isProhibited: boolean, categories: string[], details: string, translationKey: string }
 */
const checkProhibitedContent = (text) => {
  if (!text || typeof text !== 'string') {
    return { isProhibited: false, categories: [], details: '', translationKey: null };
  }

  const lowerText = text.toLowerCase();
  const foundCategories = [];
  const foundWords = [];

  // Check each category
  for (const [category, keywords] of Object.entries(PROHIBITED_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowerText)) {
        if (!foundCategories.includes(category)) {
          foundCategories.push(category);
        }
        if (!foundWords.includes(keyword)) {
          foundWords.push(keyword);
        }
      }
    }
  }

  // Check suspicious patterns
  let hasSuspiciousPattern = false;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerText)) {
      hasSuspiciousPattern = true;
      break;
    }
  }

  const isProhibited = foundCategories.length > 0 || hasSuspiciousPattern;
  let translationKey = null;

  // Map category to translation key
  if (foundCategories.length > 0) {
    const primaryCategory = foundCategories[0];
    switch(primaryCategory) {
      case 'weapons': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_WEAPONS; break;
      case 'drugs': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_DRUGS; break;
      case 'counterfeits': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_COUNTERFEIT; break;
      case 'scam': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_SCAM; break;
      case 'hate': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_HATE; break;
      case 'sexual': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_SEXUAL; break;
      case 'fraud': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_FRAUD; break;
      case 'minors': translationKey = FRAUD_TRANSLATION_KEYS.PROHIBITED_MINORS; break;
    }
  } else if (hasSuspiciousPattern) {
    translationKey = FRAUD_TRANSLATION_KEYS.SUSPICIOUS_PATTERNS;
  }

  return {
    isProhibited,
    categories: foundCategories,
    foundWords: foundWords.slice(0, 5), // First 5 found words
    hasSuspiciousPattern,
    translationKey,
    details: isProhibited 
      ? `Detected: ${foundCategories.join(', ')}` + (hasSuspiciousPattern ? ' + suspicious patterns' : '')
      : null
  };
};

/**
 * Get fraud risk score (0-100)
 * @param {object} listing - Listing object
 * @returns {number} - Risk score
 */
const calculateFraudScore = (listing) => {
  let score = 0;

  // Check title
  const titleCheck = checkProhibitedContent(listing.title || '');
  if (titleCheck.isProhibited) score += 40;

  // Check description
  const descCheck = checkProhibitedContent(listing.description || '');
  if (descCheck.isProhibited) score += 35;

  // Price anomalies
  if (listing.price && listing.price < 0) score += 25;
  if (listing.price && listing.price > 1000000) score += 15; // Unusually high price
  if (listing.price && listing.price < 1 && listing.price > 0) score += 10; // Suspiciously low

  // Missing description
  if (!listing.description || listing.description.length < 10) score += 8;

  // Suspicious price patterns
  if (listing.price && (listing.price === 0.01 || listing.price === 0.99)) score += 5;

  // Text length checks
  if (listing.title && listing.title.length > 200) score += 3;
  
  // Spam detection in title/description
  const titleSpam = SPAM_PATTERNS.some(p => p.test(listing.title || ''));
  const descSpam = SPAM_PATTERNS.some(p => p.test(listing.description || ''));
  if (titleSpam || descSpam) score += 12;

  // All caps title
  if (listing.title && listing.title === listing.title.toUpperCase() && listing.title.length > 5) {
    score += 5;
  }

  // Vague title
  const vagueTitles = ['item', 'product', 'stuff', 'thing', 'stuff for sale', 'selling'];
  if (listing.title && vagueTitles.includes(listing.title.toLowerCase())) {
    score += 10;
  }

  return Math.min(score, 100);
};

/**
 * Detect spam in listing content
 * @param {object} listing - Listing object
 * @returns {object} - { isSpam: boolean, spamScore: number, translationKey: string }
 */
const detectSpam = (listing) => {
  let spamScore = 0;

  // Repeated characters (spam indicator)
  const repeatedChars = /(.)\1{4,}/g;
  if (repeatedChars.test(listing.title || '') || repeatedChars.test(listing.description || '')) {
    spamScore += 30;
  }

  // Excessive capitals
  if (listing.title && listing.title.length > 5 && listing.title === listing.title.toUpperCase()) {
    spamScore += 20;
  }

  // Link injection attempts
  const linkPattern = /(http|https|www|\.com|\.net|click|visit|join|whatsapp)/gi;
  if (linkPattern.test(listing.description || '')) {
    spamScore += 25;
  }

  // Phone number patterns
  const phonePattern = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\+\d{1,3}\s?\d{1,14}/g;
  if (phonePattern.test(listing.description || '')) {
    spamScore += 15;
  }

  const isSpam = spamScore > 30;
  
  return {
    isSpam,
    spamScore: Math.min(spamScore, 100),
    translationKey: isSpam ? FRAUD_TRANSLATION_KEYS.SPAM_DETECTED : null
  };
};

/**
 * Detect suspicious seller behavior
 * @param {object} sellerData - Seller info: { recentListingCount, daysSinceJoin, averagePrice, totalListings }
 * @returns {object} - { isSuspicious: boolean, riskLevel: string, translationKey: string }
 */
const detectSuspiciousActivity = (sellerData = {}) => {
  let suspicionScore = 0;

  // New account with many listings (rapid creation)
  if (sellerData.daysSinceJoin && sellerData.daysSinceJoin < 3 && sellerData.totalListings && sellerData.totalListings > 20) {
    suspicionScore += 40;
  }

  // Many listings in short period
  if (sellerData.recentListingCount && sellerData.recentListingCount > 50) {
    suspicionScore += 35;
  }

  // Unusual pricing patterns
  if (sellerData.averagePrice && sellerData.averagePrice > 500000) {
    suspicionScore += 20;
  }

  // Very new account
  if (sellerData.daysSinceJoin && sellerData.daysSinceJoin === 0) {
    suspicionScore += 15;
  }

  let translationKey = null;
  if (sellerData.daysSinceJoin && sellerData.daysSinceJoin < 3 && sellerData.recentListingCount > 10) {
    translationKey = FRAUD_TRANSLATION_KEYS.RAPID_LISTING_CREATION;
  } else if (suspicionScore > 50) {
    translationKey = FRAUD_TRANSLATION_KEYS.SUSPICIOUS_ACTIVITY;
  }

  return {
    isSuspicious: suspicionScore > 40,
    riskLevel: suspicionScore > 75 ? 'high' : suspicionScore > 50 ? 'medium' : 'low',
    suspicionScore: Math.min(suspicionScore, 100),
    translationKey
  };
};

/**
 * Detect duplicate listings
 * @param {string} currentTitle - Current listing title
 * @param {array} existingListings - Array of existing listing objects
 * @returns {object} - { isDuplicate: boolean, matchPercentage: number, translationKey: string }
 */
const detectDuplicateListing = (currentTitle, existingListings = []) => {
  if (!currentTitle || !existingListings.length) {
    return { isDuplicate: false, matchPercentage: 0, translationKey: null };
  }

  const currentTitleLower = currentTitle.toLowerCase().trim();
  let maxMatch = 0;

  for (const listing of existingListings) {
    const existingTitleLower = (listing.title || '').toLowerCase().trim();
    
    // Calculate similarity
    const similarity = calculateStringSimilarity(currentTitleLower, existingTitleLower);
    maxMatch = Math.max(maxMatch, similarity);
  }

  const isDuplicate = maxMatch > 85; // 85%+ match is considered duplicate

  return {
    isDuplicate,
    matchPercentage: Math.round(maxMatch),
    translationKey: isDuplicate ? FRAUD_TRANSLATION_KEYS.DUPLICATE_LISTING : null
  };
};

/**
 * Calculate string similarity (Levenshtein distance based)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
const calculateStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const editDistance = getEditDistance(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
};

/**
 * Calculate Levenshtein distance
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} - Edit distance
 */
const getEditDistance = (s1, s2) => {
  const costs = [];
  for (let k = 0; k <= s1.length; k++) {
    let lastValue = k;
    for (let i = 0; i <= s2.length; i++) {
      if (k === 0) {
        costs[i] = i;
      } else if (i > 0) {
        let newValue = costs[i - 1];
        if (s1.charAt(k - 1) !== s2.charAt(i - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[i]) + 1;
        }
        costs[i - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (k > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

/**
 * Detect price anomalies
 * @param {number} price - Listing price
 * @param {number} averagePrice - Average price for similar items
 * @param {string} category - Product category
 * @returns {object} - { isAnomalous: boolean, anomalyType: string, translationKey: string }
 */
const detectPriceAnomaly = (price, averagePrice = 0, category = '') => {
  if (!price || price < 0) {
    return {
      isAnomalous: true,
      anomalyType: 'invalid_price',
      translationKey: FRAUD_TRANSLATION_KEYS.ANOMALOUS_PRICE
    };
  }

  let anomalyType = null;
  let isAnomalous = false;

  if (averagePrice > 0) {
    const priceRatio = price / averagePrice;
    
    if (priceRatio > 5) {
      isAnomalous = true;
      anomalyType = 'excessively_high';
    } else if (priceRatio < 0.2) {
      isAnomalous = true;
      anomalyType = 'suspiciously_low';
    }
  }

  if (price === 0.01 || price === 0.99) {
    isAnomalous = true;
    anomalyType = 'suspicious_pattern';
  }

  return {
    isAnomalous,
    anomalyType,
    translationKey: isAnomalous ? FRAUD_TRANSLATION_KEYS.ANOMALOUS_PRICE : null
  };
};

/**
 * Validate listing content comprehensively
 * @param {object} listing - Listing object with title, description, price, etc.
 * @param {object} options - Optional: { sellerData, existingListings, averagePrice }
 * @returns {object} - Complete validation result with all checks
 */
const validateListingContent = (listing, options = {}) => {
  const violations = [];
  let fraudScore = 0;
  let totalRiskScore = 0;

  // Check title
  if (listing.title) {
    const titleCheck = checkProhibitedContent(listing.title);
    if (titleCheck.isProhibited) {
      violations.push({
        field: 'title',
        type: 'prohibited_content',
        category: titleCheck.categories[0] || 'suspicious',
        message: `Title contains prohibited content`,
        translationKey: titleCheck.translationKey,
        severity: titleCheck.categories.some(c => ['weapons', 'drugs', 'minors', 'sexual'].includes(c)) ? 'critical' : 'high'
      });
      fraudScore += 40;
    }
  }

  // Check description
  if (listing.description) {
    const descCheck = checkProhibitedContent(listing.description);
    if (descCheck.isProhibited) {
      violations.push({
        field: 'description',
        type: 'prohibited_content',
        category: descCheck.categories[0] || 'suspicious',
        message: `Description contains prohibited content`,
        translationKey: descCheck.translationKey,
        severity: descCheck.categories.some(c => ['weapons', 'drugs', 'minors', 'sexual'].includes(c)) ? 'critical' : 'high'
      });
      fraudScore += 35;
    }
  }

  // Check for spam
  const spamCheck = detectSpam(listing);
  if (spamCheck.isSpam) {
    violations.push({
      field: 'content',
      type: 'spam_detected',
      message: 'Listing appears to contain spam',
      translationKey: spamCheck.translationKey,
      severity: 'medium'
    });
    fraudScore += spamCheck.spamScore * 0.5;
  }

  // Price validation
  if (listing.price !== undefined && listing.price !== null) {
    const priceAnomaly = detectPriceAnomaly(listing.price, options.averagePrice);
    if (priceAnomaly.isAnomalous) {
      violations.push({
        field: 'price',
        type: 'price_anomaly',
        anomalyType: priceAnomaly.anomalyType,
        message: `Price appears anomalous: ${priceAnomaly.anomalyType}`,
        translationKey: priceAnomaly.translationKey,
        severity: 'medium'
      });
      fraudScore += 15;
    }
  }

  // Missing critical fields
  if (!listing.description || listing.description.length < 10) {
    violations.push({
      field: 'description',
      type: 'insufficient_info',
      message: 'Description is too short or missing',
      translationKey: FRAUD_TRANSLATION_KEYS.EMPTY_DESCRIPTION,
      severity: 'low'
    });
    fraudScore += 8;
  }

  // Check for duplicate listings
  if (options.existingListings && options.existingListings.length > 0) {
    const duplicateCheck = detectDuplicateListing(listing.title, options.existingListings);
    if (duplicateCheck.isDuplicate) {
      violations.push({
        field: 'title',
        type: 'duplicate',
        matchPercentage: duplicateCheck.matchPercentage,
        message: `Listing appears to be a duplicate`,
        translationKey: duplicateCheck.translationKey,
        severity: 'medium'
      });
      fraudScore += 20;
    }
  }

  // Check seller behavior
  if (options.sellerData) {
    const activityCheck = detectSuspiciousActivity(options.sellerData);
    if (activityCheck.isSuspicious) {
      violations.push({
        field: 'seller_account',
        type: 'suspicious_activity',
        riskLevel: activityCheck.riskLevel,
        message: `Seller account shows suspicious activity`,
        translationKey: activityCheck.translationKey,
        severity: activityCheck.riskLevel === 'high' ? 'high' : 'medium'
      });
      fraudScore += activityCheck.suspicionScore * 0.3;
    }
  }

  // Calculate final fraud score
  fraudScore = calculateFraudScore(listing);
  totalRiskScore = Math.min(fraudScore, 100);

  // Determine moderation status
  let moderationStatus = 'approved';
  const hasCriticalViolations = violations.some(v => v.severity === 'critical');
  
  if (hasCriticalViolations) {
    moderationStatus = 'blocked';
  } else if (totalRiskScore > 50 || violations.some(v => v.severity === 'high')) {
    moderationStatus = 'flagged';
  }

  return {
    isValid: violations.length === 0 && moderationStatus === 'approved',
    violations,
    fraudScore: totalRiskScore,
    moderationStatus,
    hasCriticalViolations,
    riskLevel: totalRiskScore > 75 ? 'high' : totalRiskScore > 50 ? 'medium' : 'low',
    recommendedAction: moderationStatus === 'blocked' ? 'reject' : moderationStatus === 'flagged' ? 'review' : 'approve'
  };
};

/**
 * Get all available translation keys for fraud detection
 * @returns {object} - All translation keys
 */
const getTranslationKeys = () => {
  return FRAUD_TRANSLATION_KEYS;
};

/**
 * Format violations for API response
 * @param {array} violations - Array of violation objects
 * @returns {array} - Formatted violations with translation keys
 */
const formatViolations = (violations) => {
  return violations.map(v => ({
    field: v.field,
    type: v.type,
    severity: v.severity,
    translationKey: v.translationKey,
    details: {
      category: v.category,
      anomalyType: v.anomalyType,
      matchPercentage: v.matchPercentage,
      riskLevel: v.riskLevel
    }
  }));
};

module.exports = {
  // Content checking
  checkProhibitedContent,
  validateListingContent,
  
  // Fraud detection
  calculateFraudScore,
  detectSpam,
  detectSuspiciousActivity,
  detectDuplicateListing,
  detectPriceAnomaly,
  
  // Utilities
  calculateStringSimilarity,
  getEditDistance,
  formatViolations,
  getTranslationKeys,
  
  // Data exports
  PROHIBITED_KEYWORDS,
  FRAUD_TRANSLATION_KEYS,
  ALL_PROHIBITED,
  SUSPICIOUS_PATTERNS,
  SPAM_PATTERNS
};
