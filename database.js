const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'cache.db'));

// Create cache table
db.run(`
  CREATE TABLE IF NOT EXISTS search_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    site TEXT NOT NULL,
    title TEXT,
    price TEXT,
    rating TEXT,
    image TEXT,
    url TEXT,
    search_url TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query, site)
  )
`);

// Get cached result
function getFromCache(query, site) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM search_cache WHERE query = ? AND site = ? AND timestamp > datetime('now', '-1 hour')`;
    db.get(sql, [query, site], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Save to cache
function saveToCache(query, site, data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO search_cache 
      (query, site, title, price, rating, image, url, search_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [
      query, site, 
      data.title, data.price, data.rating, 
      data.image, data.url, data.searchUrl
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { getFromCache, saveToCache };
