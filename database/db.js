const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'urls.db');

let db;

// Initialize database connection
function initializeDatabase() {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
    console.log('📄 Connected to SQLite database');
    createTables();
  });
}

// Create necessary tables
function createTables() {
  const createUrlsTable = `
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_url TEXT NOT NULL,
      short_code VARCHAR(10) UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      click_count INTEGER DEFAULT 0
    )
  `;

  const createIndex = `
    CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code)
  `;

  db.run(createUrlsTable, (err) => {
    if (err) {
      console.error('Error creating urls table:', err.message);
    } else {
      console.log('✅ URLs table created or already exists');
    }
  });

  db.run(createIndex, (err) => {
    if (err) {
      console.error('Error creating index:', err.message);
    } else {
      console.log('✅ Database index created or already exists');
    }
  });
}

// Get database instance
function getDatabase() {
  return db;
}

// Close database connection
function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('📄 Database connection closed');
      }
    });
  }
}

// Gracefully close database on app termination
process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT. Graceful shutdown...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM. Graceful shutdown...');
  closeDatabase();
  process.exit(0);
});

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};