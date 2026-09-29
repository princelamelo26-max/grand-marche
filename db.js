'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT,
  pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
  referral_code TEXT UNIQUE, referred_by INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  name TEXT NOT NULL, category TEXT NOT NULL, address TEXT, phone TEXT NOT NULL,
  description TEXT, logo TEXT, lat REAL, lng REAL,
  is_certified INTEGER NOT NULL DEFAULT 0, certified_at INTEGER,
  balance INTEGER NOT NULL DEFAULT 0, pending INTEGER NOT NULL DEFAULT 0,
  rating_sum REAL NOT NULL DEFAULT 0, rating_count INTEGER NOT NULL DEFAULT 0,
  crit_delivery REAL NOT NULL DEFAULT 0, crit_quality REAL NOT NULL DEFAULT 0, crit_behavior REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
  category TEXT, description TEXT, images TEXT NOT NULL DEFAULT '[]',
  has_delivery INTEGER NOT NULL DEFAULT 1, has_warranty INTEGER NOT NULL DEFAULT 0, warranty_text TEXT,
  boosted_until INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id), shop_id INTEGER NOT NULL REFERENCES shops(id),
  total INTEGER NOT NULL, status TEXT NOT NULL, delivery_mode TEXT NOT NULL DEFAULT 'pickup',
  address TEXT, note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, delivered_at INTEGER,
  reviewed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER, name TEXT NOT NULL, price INTEGER NOT NULL, qty INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, purpose TEXT NOT NULL, ref_id TEXT,
  amount INTEGER NOT NULL, provider TEXT NOT NULL, phone TEXT NOT NULL,
  status TEXT NOT NULL, failure TEXT, provider_txn TEXT, created_at INTEGER NOT NULL, completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, shop_id INTEGER, user_id INTEGER, order_id TEXT,
  amount INTEGER NOT NULL, fee INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL,
  provider TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL, failure TEXT,
  created_at INTEGER NOT NULL, completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, amount INTEGER NOT NULL,
  ref TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(shop_id, buyer_id);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER NOT NULL, shop_id INTEGER, order_id TEXT,
  type TEXT NOT NULL, details TEXT, created_at INTEGER NOT NULL
);
`;

function open(dir) {
  const file = dir === ':memory:' ? ':memory:' : path.join(dir, 'grandmarche.db');
  if (dir !== ':memory:') fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(SCHEMA);
  return db;
}
/** Transaction synchrone (node:sqlite est synchrone : pas d'entrelacement possible dans fn). */
function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
}
module.exports = { open, tx };
