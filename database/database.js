const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define database file path
const dbFileName = 'jibwbie3.db';
const dbPath = path.join(__dirname, '..', dbFileName); // Database file located in the project root

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Export the database connection
module.exports = db;
