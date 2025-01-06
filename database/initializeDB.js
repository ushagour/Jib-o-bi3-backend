const db = require('./database');

const createCategoriesTable = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  backgroundColor TEXT NOT NULL,
  color TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  avatar TEXT,
  password TEXT,
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  listingId INTEGER,
  content TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fromUserId) REFERENCES users(id),
  FOREIGN KEY (listingId) REFERENCES listings(id)
);
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

  createTable(createCategoriesTable, 'categories');
  createTable(createUsersTable, 'users');
  createTable(createListingsTable, 'listings');
  createTable(createImagesTable, 'images');
  createTable(createMessagesTable, 'messages');
});

db.close();
