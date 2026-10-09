'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { open } = require('./db');
const { hashPassword, verifyPassword, makeTokens } = require('./auth');
const { createProvider, OPERATORS } = require('./providers');
const { createCore } = require('./core');
const { HttpError, bad, normPhone, now, str, optStr, rateLimiter } = require('./util');

/* ---------- Configuration ---------- */
function loadEnvFile(file) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) { /* pas de .env : on utilise l'environnement */ }
}
function buildConfig(overrides = {}) {
  const e = { ...process.env, ...overrides };
  const num = (k, d) => (e[k] !== undefined && e[k] !== '' && Number.isFinite(+e[k]) ? +e[k] : d);
  const cfg = {
    PORT: num('PORT', 3000), PUBLIC_URL: e.PUBLIC_URL || '', DATA_DIR: e.DATA_DIR || path.join(__dirname, 'data'),
    TOKEN_SECRET: e.TOKEN_SECRET, ALLOWED_ORIGINS: (e.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    ADMIN_PHONE: normPhone(e.ADMIN_PHONE), WEBHOOK_SECRET: e.WEBHOOK_SECRET || '',
    BOOST_PRICE: num('BOOST_PRICE', 1500), BOOST_DAYS: num('BOOST_DAYS', 7), CERTIFICATION_PRICE: num('CERTIFICATION_PRICE', 30000),
    WITHDRAWAL_FEE_RATE: num('WITHDRAWAL_FEE_RATE', 0.03), MIN_WITHDRAWAL: num('MIN_WITHDRAWAL', 500),
    PAYMENT_PROVIDER: e.PAYMENT_PROVIDER || 'mock', PAWAPAY_TOKEN: e.PAWAPAY_TOKEN, PAWAPAY_BASE_URL: e.PAWAPAY_BASE_URL,
    MOCK_DELAY_MS: e.MOCK_DELAY_MS !== undefined ? num('MOCK_DELAY_MS', 1500) : undefined,
    PUBLIC_DIR: e.PUBLIC_DIR || __dirname, QUIET: !!e.QUIET
  };
  if (!cfg.TOKEN_SECRET) {
    if (cfg.PAYMENT_PROVIDER === 'pawapay') throw new Error('TOKEN_SECRET est obligatoire en production.');
    cfg.TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
    if (!cfg.QUIET) console.warn('⚠ TOKEN_SECRET absent : secret temporaire généré (les sessions sautent au redémarrage).');
  }
  if (cfg.PAYMENT_PROVIDER === 'pawapay' && !cfg.WEBHOOK_SECRET) throw new Error('WEBHOOK_SECRET est obligatoire avec pawaPay.');
  return cfg;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function createApp(cfg, injectedProvider) {
  const log = cfg.QUIET ? { error() {}, warn() {}, log() {} } : console;
  const db = open(cfg.DATA_DIR === ':memory:' ? ':memory:' : cfg.DATA_DIR);
  const provider = injectedProvider || createProvider(cfg);
  const core = createCore(db, provider, cfg, log);
  const tokens = makeTokens(cfg.TOKEN_SECRET);
  const get = (sql, ...a) => db.prepare(sql).get(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);
  const authLimit = rateLimiter(12, 60 * 1000), payLimit = rateLimiter(15, 60 * 1000), writeLimit = rateLimiter(120, 60 * 1000);

  const userView = (u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, referralCode: u.referral_code });
  const publicPayment = (p) => p && ({ id: p.id, purpose: p.purpose, refId: p.ref_id, amount: p.amount, status: p.status, failure: p.failure, createdAt: p.created_at });
  const session = (u) => ({ token: tokens.issue(u.id), user: userView(u), shop: core.shopView(core.shopOf(u), true) });
  const checkPhone = (v) => { const p = normPhone(v); if (!p) throw bad('Numéro de téléphone invalide (ex : 06 123 45 67).'); return p; };
  const operatorOf = (v) => { if (!OPERATORS[v]) throw bad('Opérateur invalide (mtn ou airtel).'); return v; };
  const mkReferral = () => { for (;;) { const c = 'GM' + crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4); if (!get('SELECT 1 x FROM users WHERE referral_code=?', c)) return c; } };

  /* ---------- Routes ---------- */
  const routes = [];
  const route = (method, pattern, opts, handler) => {
    if (typeof opts === 'function') { handler = opts; opts = {}; }
    const keys = []; const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, opts, handler });
  };

  route('GET', '/api/health', () => ({ ok: true, time: now(), provider: provider.name }));
  route('GET', '/api/config', () => ({
    boostPrice: cfg.BOOST_PRICE, boostDays: cfg.BOOST_DAYS, certificationPrice: cfg.CERTIFICATION_PRICE,
    withdrawalFeeRate: cfg.WITHDRAWAL_FEE_RATE, minWithdrawal: cfg.MIN_WITHDRAWAL, paymentProvider: provider.name,
    operators: Object.keys(OPERATORS), categories: core.CATEGORIES
  }));

  // --- Comptes
  route('POST', '/api/auth/register', ({ body, ip }) => {
    if (!authLimit('reg:' + ip)) throw new HttpError(429, 'Trop de tentatives. Réessayez dans une minute.');
    const name = str(body.name, 2, 60, 'Nom'), phone = checkPhone(body.phone);
    if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 100) throw bad('Mot de passe : 6 caractères minimum.');
    const email = optStr(body.email, 120);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Email invalide.');
    if (get('SELECT 1 x FROM users WHERE phone=?', phone)) throw new HttpError(409, 'Ce numéro a déjà un compte. Connectez-vous.');
    const ref = body.referral ? get('SELECT id FROM users WHERE referral_code=?', String(body.referral).trim().toUpperCase()) : null;
    const role = cfg.ADMIN_PHONE && cfg.ADMIN_PHONE === phone ? 'admin' : 'user';
    const r = run('INSERT INTO users(phone,name,email,pass_hash,role,referral_code,referred_by,created_at) VALUES(?,?,?,?,?,?,?,?)',
      phone, name, email, hashPassword(body.password), role, mkReferral(), ref ? ref.id : null, now());
    return session(get('SELECT * FROM users WHERE id=?', r.lastInsertRowid));
  });
  route('POST', '/api/auth/login', ({ body, ip }) => {
    const phone = normPhone(body.phone);
    if (!authLimit('login:' + ip) || (phone && !authLimit('loginp:' + phone))) throw new HttpError(429, 'Trop de tentatives. Réessayez dans une minute.');
    const u = phone && get('SELECT * FROM users WHERE phone=?', phone);
    if (!u || typeof body.password !== 'string' || !verifyPassword(body.password, u.pass_hash)) throw new HttpError(401, 'Numéro ou mot de passe incorrect.');
    return session(u);
  });
  route('GET', '/api/me', { auth: true }, ({ user }) => session(user));
  route('PUT', '/api/me', { auth: true }, ({ user, body }) => {
    run('UPDATE users SET name=?, email=? WHERE id=?', body.name ? str(body.name, 2, 60, 'Nom') : user.name, body.email !== undefined ? optStr(body.email, 120) : user.email, user.id);
    return session(get('SELECT * FROM users WHERE id=?', user.id));
  });
  route('POST', '/api/me/password', { auth: true }, ({ user, body }) => {
    if (!verifyPassword(String(body.oldPassword || ''), user.pass_hash)) throw new HttpError(401, 'Mot de passe actuel incorrect.');
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 6) throw bad('Nouveau mot de passe : 6 caractères minimum.');
    run('UPDATE users SET pass_hash=? WHERE id=?', hashPassword(body.newPassword), user.id);
    return { ok: true };
  });
  route('DELETE', '/api/me', { auth: true }, ({ user }) => {
    const s = core.shopOf(user);
    if (s && (s.balance > 0 || s.pending > 0)) throw new HttpError(409, 'Retirez votre solde et terminez vos commandes avant de supprimer le compte.');
    if (get(`SELECT 1 x FROM orders WHERE (buyer_id=? OR shop_id=?) AND status IN ('pending_payment','paid','processing','shipped','delivered','disputed')`, user.id, s ? s.id : -1)) throw new HttpError(409, 'Vous avez des commandes en cours.');
    if (s) run('UPDATE products SET active=0 WHERE shop_id=?', s.id);
    run(`UPDATE users SET name='Compte supprimé', phone=?, email=NULL, pass_hash=?, referral_code=NULL WHERE id=?`, 'del' + user.id + '-' + crypto.randomBytes(3).toString('hex'), hashPassword(crypto.randomBytes(16).toString('hex')), user.id);
    if (s) run(`UPDATE shops SET name='Boutique supprimée', logo=NULL, description=NULL WHERE id=?`, s.id);
    return { ok: true };
  });

  // --- Catalogue / boutiques / produits
  route('GET', '/api/catalog', () => ({ shops: core.catalog(), serverTime: now() }));
  route('POST', '/api/shops', { auth: true }, ({ user, body }) => core.createShop(user, body));
  route('PUT', '/api/shop', { auth: true }, ({ user, body }) => core.updateShop(user, body));
  route('POST', '/api/products', { auth: true }, ({ user, body }) => core.createProduct(user, body));
  route('PUT', '/api/products/:id', { auth: true }, ({ user, params, body }) => core.updateProduct(user, +params.id, body));
  route('DELETE', '/api/products/:id', { auth: true }, ({ user, params }) => core.deleteProduct(user, +params.id));

  // --- Paiements
  route('POST', '/api/payments', { auth: true }, async ({ user, body }) => {
    if (!payLimit('pay:' + user.id)) throw new HttpError(429, 'Trop de demandes de paiement. Patientez un instant.');
    const p = await core.startPayment(user, { purpose: body.purpose, refId: body.refId, operator: operatorOf(body.operator), phone: checkPhone(body.phone) });
    return publicPayment(p);
  });
  route('GET', '/api/payments/:id', { auth: true }, async ({ user, params }) => {
    let p = get('SELECT * FROM payments WHERE id=? AND user_id=?', params.id, user.id);
    if (!p) throw new HttpError(404, 'Paiement introuvable.');
    if (p.status === 'PENDING') {
      try {
        const r = await provider.depositStatus(p.id);
        if (r.status === 'COMPLETED') p = core.settlePayment(p.id, 'COMPLETED', r.txn);
        else if (r.status === 'FAILED') p = core.settlePayment(p.id, 'FAILED', null, r.failure);
      } catch (e) { log.error('check payment', e.message); }
    }
    return publicPayment(p);
  });
  // Webhook pawaPay : on ne fait JAMAIS confiance au contenu, on re-vérifie auprès du fournisseur.
  route('POST', '/api/webhooks/pawapay/:secret', async ({ params, body }) => {
    const a = Buffer.from(String(params.secret)), c = Buffer.from(cfg.WEBHOOK_SECRET || '');
    if (!c.length || a.length !== c.length || !crypto.timingSafeEqual(a, c)) throw new HttpError(403, 'Refusé.');
    try {
      if (body && body.depositId && get('SELECT 1 x FROM payments WHERE id=?', String(body.depositId))) {
        const r = await provider.depositStatus(String(body.depositId));
        if (r.status !== 'PENDING') core.settlePayment(String(body.depositId), r.status, r.txn, r.failure);
      } else if (body && body.payoutId && get('SELECT 1 x FROM payouts WHERE id=?', String(body.payoutId))) {
        const r = await provider.payoutStatus(String(body.payoutId));
        if (r.status !== 'PENDING') core.settlePayout(String(body.payoutId), r.status, r.failure);
      }
    } catch (e) { log.error('webhook', e.message); }
    return { ok: true };
  });

  // --- Commandes
  route('POST', '/api/orders', { auth: true }, ({ user, body }) => core.createOrder(user, body));
  route('GET', '/api/orders', { auth: true }, ({ user }) => ({ orders: core.listOrders(user) }));
  route('POST', '/api/orders/:id/:action', { auth: true }, ({ user, params, body }) => {
    if (params.action === 'review') return core.reviewOrder(user, params.id, body);
    return core.orderAction(user, params.id, params.action);
  });
  route('POST', '/api/wallet/withdraw', { auth: true }, ({ user, body }) => {
    if (!payLimit('wd:' + user.id)) throw new HttpError(429, 'Trop de demandes. Patientez un instant.');
    return core.withdraw(user, { amount: body.amount, operator: operatorOf(body.operator), phone: checkPhone(body.phone) });
  });
  route('GET', '/api/wallet', { auth: true }, ({ user }) => {
    const s = core.shopOf(user);
    if (!s) throw new HttpError(403, 'Pas de boutique.');
    return { balance: s.balance, pending: s.pending, payouts: db.prepare('SELECT id, kind, amount, fee, net, status, created_at AS createdAt FROM payouts WHERE shop_id=? ORDER BY created_at DESC LIMIT 50').all(s.id) };
  });

  // --- Messagerie / signalements
  route('GET', '/api/chat', { auth: true }, ({ user }) => ({ threads: core.threads(user) }));
  route('GET', '/api/chat/:shopId', { auth: true }, ({ user, params, query }) => ({ messages: core.thread(user, +params.shopId, query.buyerId ? +query.buyerId : undefined) }));
  route('POST', '/api/chat/:shopId', { auth: true }, ({ user, params, body }) => core.sendMessage(user, { ...body, shopId: +params.shopId }));
  route('POST', '/api/reports', { auth: true }, ({ user, body }) => core.report(user, body));

  // --- Admin
  route('GET', '/api/admin/stats', { admin: true }, () => core.adminStats());
  route('POST', '/api/admin/orders/:id/:action', { admin: true }, ({ user, params }) => {
    if (!['resolve_release', 'resolve_refund'].includes(params.action)) throw bad('Action inconnue');
    return core.orderAction(user, params.id, params.action);
  });

  /* ---------- HTTP ---------- */
  function readBody(req, limit = 4 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Requête trop volumineuse.')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(bad('JSON invalide.')); }
      });
      req.on('error', reject);
    });
  }
  function cors(req, res) {
    const o = req.headers.origin;
    if (o && cfg.ALLOWED_ORIGINS.includes(o)) {
      res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }
  }
  function sendJson(res, status, data) {
    const s = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(s);
  }
  // Le code serveur vit dans le même dossier que les fichiers web (pas de sous-dossier public/) :
  // on refuse explicitement de servir le code source et la configuration au navigateur.
  const STATIC_DENYLIST = new Set(['server.js', 'auth.js', 'core.js', 'db.js', 'providers.js', 'util.js', 'package.json', 'package-lock.json', 'render.yaml', '.env', '.env.example', '.node-version', '.gitignore', 'README.md']);
  function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname); if (rel === '/') rel = '/index.html';
    const base = rel.replace(/^\/+/, '').split('/')[0];
    if (STATIC_DENYLIST.has(base) || base.startsWith('.') || rel.includes('/data/')) { res.writeHead(404); return res.end('Introuvable'); }
    const file = path.normalize(path.join(cfg.PUBLIC_DIR, rel));
    if (!file.startsWith(cfg.PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable'); }
      const ext = path.extname(file);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
      res.end(buf);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      return serveStatic(req, res, url.pathname);
    }
    try {
      let matched = null, params = {};
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re); if (!m) continue;
        matched = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break;
      }
      if (!matched) throw new HttpError(404, 'Route inconnue.');
      let user = null;
      if (matched.opts.auth || matched.opts.admin) {
        const h = req.headers.authorization || '';
        const p = h.startsWith('Bearer ') ? tokens.verify(h.slice(7)) : null;
        user = p && get('SELECT * FROM users WHERE id=?', p.uid);
        if (!user) throw new HttpError(401, 'Session expirée. Reconnectez-vous.', 'AUTH');
        if (matched.opts.admin && user.role !== 'admin') throw new HttpError(403, 'Réservé à l\'administrateur.');
        if (req.method !== 'GET' && !writeLimit('w:' + user.id)) throw new HttpError(429, 'Trop de requêtes.');
      }
      const body = req.method === 'GET' || req.method === 'DELETE' ? {} : await readBody(req);
      const query = Object.fromEntries(url.searchParams);
      const out = await matched.handler({ req, ip, params, query, body, user });
      sendJson(res, 200, out);
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, code: e.code });
      if (e && /UNIQUE/.test(String(e.message))) return sendJson(res, 409, { error: 'Doublon détecté.' });
      log.error('Erreur serveur:', e && e.stack || e);
      sendJson(res, 500, { error: 'Erreur interne du serveur.' });
    }
  });

  let timers = [];
  function start() {
    timers.push(setInterval(() => { core.poll().catch((e) => log.error('poll', e.message)); }, 8000));
    timers.push(setInterval(() => { try { core.housekeeping(); } catch (e) { log.error('housekeeping', e.message); } }, 60000));
    timers.forEach((t) => t.unref && t.unref());
    core.kick();
  }
  function stop() { timers.forEach(clearInterval); timers = []; server.close(); try { db.close(); } catch (_) {} }
  return { server, db, core, provider, start, stop, cfg };
}

module.exports = { createApp, buildConfig, loadEnvFile };

if (require.main === module) {
  loadEnvFile(path.join(__dirname, '.env'));
  const cfg = buildConfig();
  const app = createApp(cfg);
  app.start();
  app.server.listen(cfg.PORT, () => {
    console.log(`Grand Marché — serveur prêt sur http://localhost:${cfg.PORT}  (paiements : ${app.provider.name})`);
    if (app.provider.name === 'mock') console.log('⚠ Mode simulation : AUCUN argent réel. Passez PAYMENT_PROVIDER=pawapay pour la production.');
  });
  const bye = () => { app.stop(); process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
}
