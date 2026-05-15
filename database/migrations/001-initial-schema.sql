-- Initial schema: create all tables used by Sequelize models

-- Categories Table
CREATE TABLE IF NOT EXISTS Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  avatar TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  status TEXT CHECK(status IN ('active', 'inactive', 'banned')) DEFAULT 'active',
  password TEXT NOT NULL,
  expoPushToken TEXT,
  role TEXT CHECK(role IN ('admin', 'Customer')) DEFAULT 'Customer',
  is_phone_verified INTEGER DEFAULT 0,
  is_quick_responder INTEGER DEFAULT 0,
  is_email_verified INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Listings Table
CREATE TABLE IF NOT EXISTS Listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  status TEXT CHECK(status IN ('Selled', 'still available')) DEFAULT 'still available',
  latitude REAL,
  longitude REAL,
  carSize TEXT,
  carColor TEXT,
  carModel TEXT,
  carYear INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);

-- Images Table
CREATE TABLE IF NOT EXISTS Images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES Listings(id) ON DELETE CASCADE
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS Favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_id INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES Listings(id) ON DELETE CASCADE,
  UNIQUE(user_id, listing_id)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS Reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT DEFAULT 'open',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES Listings(id) ON DELETE CASCADE
);

-- Orders Table
CREATE TABLE IF NOT EXISTS Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
  payment_method TEXT,
  payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')) NOT NULL DEFAULT 'pending',
  shipping_address TEXT,
  phone TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES Listings(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  listing_id INTEGER,
  type TEXT CHECK(type IN ('message', 'review', 'like', 'listing_update', 'order')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES Users(id) ON DELETE SET NULL,
  FOREIGN KEY (listing_id) REFERENCES Listings(id) ON DELETE CASCADE
);

-- MobileSettings Table
CREATE TABLE IF NOT EXISTS MobileSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  value TEXT,
  value_type TEXT CHECK(value_type IN ('text', 'number', 'boolean', 'json', 'image')) DEFAULT 'text',
  image_url TEXT,
  feature_enabled INTEGER NOT NULL DEFAULT 1,
  group_name TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES Users(id) ON DELETE SET NULL
);

-- AdminActivities Table
CREATE TABLE IF NOT EXISTS AdminActivities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT CHECK(entity IN ('user', 'listing', 'review')) NOT NULL,
  action TEXT CHECK(action IN ('create', 'update', 'delete')) NOT NULL,
  entityId INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Better Query Performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON Listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON Listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON Listings(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON Favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON Favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON Reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON Reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON Orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON Orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON Notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON Notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_images_listing_id ON Images(listing_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON Notifications(user_id, is_read, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_listing ON Notifications(listing_id, createdAt DESC);
