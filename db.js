'use strict';
/**
 * Couche base de données, avec DEUX moteurs possibles derrière une interface commune
 * ({execute, transaction, close}) utilisée partout ailleurs dans le code :
 *  - sqlite : fichier local (node:sqlite) — utilisé quand aucune base Turso n'est configurée.
 *             Les données vivent sur le disque du serveur : perdues si l'hébergeur efface ce disque.
 *  - turso  : base distante persistante (https://turso.tech), compatible SQLite, gratuite sans carte.
 *             Les données survivent aux redémarrages du serveur. C'est le mode recommandé en production.
 * Le choix se fait tout seul : si TURSO_DATABASE_URL est présent dans la configuration, Turso est utilisé.
 */
const path = require('node:path');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT, city TEXT,
  pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
  referral_code TEXT UNIQUE, referred_by INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  name TEXT NOT NULL, category TEXT NOT NULL, address TEXT, city TEXT, phone TEXT NOT NULL,
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
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
  code TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER NOT NULL, shop_id INTEGER, order_id TEXT,
  type TEXT NOT NULL, details TEXT, created_at INTEGER NOT NULL
);
`;
const SCHEMA_STATEMENTS = SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean);

/* ---------- Moteur local : node:sqlite, enveloppé en interface asynchrone ---------- */
function openSqlite(cfg) {
  const { DatabaseSync } = require('node:sqlite');
  const fs = require('node:fs');
  const dir = cfg.DATA_DIR;
  const file = dir === ':memory:' ? ':memory:' : path.join(dir, 'grandmarche.db');
  if (dir !== ':memory:') fs.mkdirSync(dir, { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  for (const s of SCHEMA_STATEMENTS) raw.exec(s);

  function run(sql, args) {
    const isSelect = /^\s*(SELECT|PRAGMA)\b/i.test(sql);
    const stmt = raw.prepare(sql);
    if (isSelect) {
      const rows = stmt.all(...args);
      return { rows, lastInsertRowid: undefined, rowsAffected: 0 };
    }
    const r = stmt.run(...args);
    return { rows: [], lastInsertRowid: r.lastInsertRowid, rowsAffected: r.changes };
  }
  return {
    kind: 'sqlite',
    async execute(sql, args) { return run(sql, args || []); },
    async transaction() {
      raw.exec('BEGIN IMMEDIATE');
      let finished = false;
      return {
        async execute(sql, args) { return run(sql, args || []); },
        async commit() { if (finished) return; finished = true; raw.exec('COMMIT'); },
        async rollback() { if (finished) return; finished = true; try { raw.exec('ROLLBACK'); } catch (_) {} }
      };
    },
    close() { try { raw.close(); } catch (_) {} }
  };
}

/* ---------- Moteur distant : Turso (libSQL), persistant ---------- */
async function openTurso(cfg) {
  const { createClient } = require('@libsql/client');
  const client = createClient({ url: cfg.TURSO_DATABASE_URL, authToken: cfg.TURSO_AUTH_TOKEN });
  await client.batch(SCHEMA_STATEMENTS, 'write');

  function toNumber(v) { return v == null ? undefined : Number(v); }
  function adapt(result) { return { rows: result.rows, lastInsertRowid: toNumber(result.lastInsertRowid), rowsAffected: toNumber(result.rowsAffected) || 0 }; }
  return {
    kind: 'turso',
    async execute(sql, args) { return adapt(await client.execute({ sql, args: args || [] })); },
    async transaction() {
      const t = await client.transaction('write');
      return {
        async execute(sql, args) { return adapt(await t.execute({ sql, args: args || [] })); },
        async commit() { await t.commit(); },
        async rollback() { try { await t.rollback(); } catch (_) {} }
      };
    },
    close() { try { client.close(); } catch (_) {} }
  };
}

async function open(cfg) {
  if (cfg.TURSO_DATABASE_URL) return openTurso(cfg);
  return openSqlite(cfg);
}

/* ---------- get/run/all/tx : la même interface, quel que soit le moteur ---------- */
function bindQueries(conn) {
  return {
    async get(sql, ...args) { const r = await conn.execute(sql, args); return r.rows[0]; },
    async all(sql, ...args) { const r = await conn.execute(sql, args); return r.rows; },
    async run(sql, ...args) { const r = await conn.execute(sql, args); return { lastInsertRowid: r.lastInsertRowid, changes: r.rowsAffected }; }
  };
}
async function tx(db, fn) {
  const t = await db.transaction();
  try {
    const result = await fn(bindQueries(t));
    await t.commit();
    return result;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}
module.exports = { open, tx, bindQueries };
