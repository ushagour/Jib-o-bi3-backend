const db = require('./database');

// Table creation queries
const CREATE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    backgroundColor TEXT NOT NULL,
    color TEXT NOT NULL
);
`;

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    avatar TEXT DEFAULT 'avatar',
    password TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const createListingsTable = `
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    location TEXT,
    categoryId INTEGER,
    userId INTEGER,
    status TEXT CHECK(status IN ('active', 'sold', 'inactive')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id),
    FOREIGN KEY (userId) REFERENCES users(id)
);
`;

const createImagesTable = `
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER,
    fileName TEXT,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
);
`;

const createMessagesTable = `
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUserId INTEGER,
    toUserId INTEGER, 
    listingId INTEGER,
    content TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fromUserId) REFERENCES users(id),
    FOREIGN KEY (toUserId) REFERENCES users(id),
    FOREIGN KEY (listingId) REFERENCES listings(id)
);
`;

// Data insertion queries
const INSERTDATACATEGORIES = `INSERT INTO categories (id, label, icon, backgroundColor, color) VALUES
(1, 'Furniture', 'floor-lamp', '#fc5c65', 'white'),
(2, 'Cars', 'car', '#fd9644', 'white'),
(3, 'Cameras', 'camera', '#fed330', 'white'),
(4, 'Games', 'cards', '#26de81', 'white'),
(5, 'Clothing', 'shoe-heel', '#2bcbba', 'white'),
(6, 'Sports', 'basketball', '#45aaf2', 'white'),
(7, 'Movies & Music', 'headphones', '#4b7bec', 'white'),
(8, 'Books', 'book-open-variant', '#a55eea', 'white'),
(9, 'Other', 'application', '#778ca3', 'white');
`;

db.serialize(() => {
  const createTable = (query, table) => {
    db.run(query, (err) => {
      if (err) {
        console.error(`Error creating ${table} table:`, err.message);
      } else {
        console.log(`${table} table created successfully.`);
      }
    });
  };

  const insertData = (query, table) => {
    db.run(query, (err) => {
      if (err) {
        console.error(`Error inserting data into ${table} table:`, err.message);
      } else {
        console.log(`Data inserted into ${table} table successfully.`);
      }
    });
  };

  createTable(CREATE_CATEGORIES_TABLE, 'categories');
  createTable(createUsersTable, 'users');
  createTable(createListingsTable, 'listings');
  createTable(createImagesTable, 'images');
  createTable(createMessagesTable, 'messages');
  insertData(INSERTDATACATEGORIES, 'categories');
});

db.close();
