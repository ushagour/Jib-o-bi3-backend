-- Initial schema: create all tables used by Sequelize models

-- Categories Table
CREATE TABLE IF NOT EXISTS Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  avatar TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  password TEXT NOT NULL,
  expoPushToken TEXT,
  role TEXT DEFAULT 'Customer',
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
  status TEXT DEFAULT 'Selled - still available',
  latitude REAL,
  longitude REAL,
  carSize TEXT,
  carColor TEXT,
  carModel TEXT,
  carYear INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (category_id) REFERENCES Categories(id)
);

-- Images Table
CREATE TABLE IF NOT EXISTS Images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES Listings(id)
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS Favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_id INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (listing_id) REFERENCES Listings(id)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS Reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'open',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (listing_id) REFERENCES Listings(id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address TEXT,
  phone TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES Listings(id),
  FOREIGN KEY (buyer_id) REFERENCES Users(id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  listing_id INTEGER,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (actor_id) REFERENCES Users(id),
  FOREIGN KEY (listing_id) REFERENCES Listings(id)
);

-- MobileSettings Table
CREATE TABLE IF NOT EXISTS MobileSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  value TEXT,
  value_type TEXT DEFAULT 'text',
  image_url TEXT,
  feature_enabled INTEGER NOT NULL DEFAULT 1,
  group_name TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AdminActivities Table
CREATE TABLE IF NOT EXISTS AdminActivities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  entityId INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- Add additional columns to Orders table
ALTER TABLE Orders ADD COLUMN quantity INTEGER DEFAULT 1;
ALTER TABLE Orders ADD COLUMN payment_method TEXT;
ALTER TABLE Orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE Orders ADD COLUMN shipping_address TEXT;
ALTER TABLE Orders ADD COLUMN phone TEXT;
ALTER TABLE Orders ADD COLUMN notes TEXT;



-- Notifications table for persisted user notifications
CREATE TABLE IF NOT EXISTS Notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    actor_id INTEGER,
    listing_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (actor_id) REFERENCES Users(id),
    FOREIGN KEY (listing_id) REFERENCES Listings(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON Notifications (user_id, is_read, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_listing
  ON Notifications (listing_id, createdAt DESC);
